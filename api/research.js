import { parseModelJSON } from "./_json.js";
import { MODEL } from "./_model.js";
import { runPageSpeed } from "./_psi.js";
import {
  inspectSite,
  verifiedFacts,
  mergePsiSignals,
  PROBLEM_PRIORITY,
} from "./_inspect.js";

// ── /api/research ───────────────────────────────────────────────────────────────
// Checks a restaurant's website and says what's wrong with it — with evidence.
//
// The trust rule: code observes, the model judges. _inspect.js fetches the site
// and produces a fixed list of verified facts, each with a key. The model sees
// that list and nothing else (no browsing), and answers with KEYS, a rating and
// one sentence of opinion. The stored findings are always the code's own
// wording for the keys it picked, so the model can rank evidence but can't
// write any. A key that isn't in the verified list is dropped — a prompt rule is
// a request, not a guarantee.
//
// Takes { subject } or { subjects: [...] } (max 6), same shape as /api/pitch.
// subject = { id, businessName, address, website, pageSpeed? }
// `pageSpeed` is a recent cached PSI result; without one the server runs PSI.

export const MAX_BATCH = 6;

// A worst-case batch is six PSI runs and six site checks in parallel, then one
// model call. Well under Hobby's 300s ceiling.
export const config = { maxDuration: 180 };

const LEVELS = ["high", "medium", "low"];
const RANK = { high: 3, medium: 2, low: 1 };

const str = (v) => (typeof v === "string" ? v.trim() : "");

// ── Prompt ──────────────────────────────────────────────────────────────────────

const SYSTEM = `You assess restaurant websites for a solo freelance web designer in Simi Valley, California. He builds custom websites for independent restaurants at a flat $500.

For each restaurant you get the business, what an automated check of its website verified — PROBLEMS, each tagged with a [key] — and neutral CONTEXT. You have no other information and you cannot browse.

For each restaurant return:
- "picks": up to 3 keys from THAT restaurant's PROBLEMS list, most persuasive to the owner first. Prefer what an owner would feel (customers can't read the menu, the site is broken on a phone, the site is down) over technicalities. Use only keys that appear in its list. An empty list is fine when nothing is worth raising.
- "opportunity": "high", "medium" or "low" — how strong his case is for pitching a new site. A site that is down, parked, not really theirs, or not built for phones is usually high. A clean check, or a restaurant already paying for a restaurant-specific platform, is usually low.
- "confidence": "high", "medium" or "low" — how much the check could actually see. When visibility is limited, never "high".
- "reason": one sentence, under 30 words, explaining the rating. It is shown as your opinion. Use only facts from the input. Never guess about their customers, revenue, reputation or how busy they are.
- "chain": true only if the business name is clearly a chain or franchise.

Return only valid JSON, no markdown:
{ "results": { "<ID>": { "picks": ["key"], "opportunity": "high", "confidence": "high", "reason": "…", "chain": false } } }
Include every ID you were given.`;

export function buildResearchBrief({ subject, checks, facts }) {
  const lines = [
    `ID: ${subject.id}`,
    `Business: ${subject.businessName || "Unknown"}`,
    subject.address ? `Address: ${subject.address}` : null,
    `Website checked: ${checks.url}${
      checks.finalUrl && checks.finalUrl !== checks.url
        ? ` (ended up at ${checks.finalUrl})`
        : ""
    }`,
    facts.quality === "full"
      ? "Visibility: full"
      : `Visibility: limited — ${facts.qualityNote}`,
    "PROBLEMS (verified):",
    ...(facts.problems.length
      ? facts.problems.map((p) => `- [${p.check}] ${p.text}`)
      : ["- none found"]),
    "CONTEXT (verified, neutral):",
    ...(facts.context.length
      ? facts.context.map((c) => `- ${c}`)
      : ["- nothing further"]),
  ].filter(Boolean);
  return lines.join("\n");
}

// ── Response shaping ────────────────────────────────────────────────────────────

// What the check could see caps what the model may claim.
const CONFIDENCE_CAP = {
  full: "high",
  limited: "medium",
  psi_only: "low",
  blocked: "low",
};

const lower = (a, b) => (RANK[a] <= RANK[b] ? a : b);

export function normalizeResearch(entry, facts) {
  const problems = facts?.problems || [];
  const byKey = new Map(problems.map((p) => [p.check, p]));
  const assessed = !!entry && typeof entry === "object";

  let picks = [];
  if (assessed && Array.isArray(entry.picks)) {
    for (const k of entry.picks) {
      if (typeof k === "string" && byKey.has(k) && !picks.includes(k))
        picks.push(k);
      if (picks.length === 3) break;
    }
  }
  // No usable assessment → rank by the fixed priority instead.
  if (!assessed) picks = problems.slice(0, 3).map((p) => p.check);

  const rest = problems
    .filter((p) => !picks.includes(p.check))
    .sort(
      (a, b) =>
        PROBLEM_PRIORITY.indexOf(a.check) - PROBLEM_PRIORITY.indexOf(b.check),
    );

  const findings = [
    ...picks.map((k) => ({ ...byKey.get(k), lead: true })),
    ...rest.map((p) => ({ ...p, lead: false })),
  ];

  const cap = CONFIDENCE_CAP[facts?.quality] || "low";
  const rawConfidence = LEVELS.includes(entry?.confidence)
    ? entry.confidence
    : "medium";

  return {
    findings,
    opportunity: LEVELS.includes(entry?.opportunity) ? entry.opportunity : null,
    confidence: lower(rawConfidence, cap),
    reason: str(entry?.reason).slice(0, 240),
    likelyChain: entry?.chain === true,
    assessed: assessed && LEVELS.includes(entry?.opportunity),
    visibility: facts?.quality || "full",
    visibilityNote: facts?.qualityNote || "",
  };
}

// Keeps what gets stored small: the raw link list and page title aren't needed
// once the facts are derived, but the menu and platform are useful later.
export function compactChecks(checks = {}) {
  const {
    url,
    finalUrl,
    status,
    reachable,
    error,
    https,
    certError,
    blocked,
    thirdParty,
    freeSubdomain,
    parked,
    platform,
    viewport,
    copyrightYear,
    telLink,
    thinContent,
    menu,
    ordering,
    reservations,
    contact,
    linksChecked,
    brokenLinks,
  } = checks;
  return Object.fromEntries(
    Object.entries({
      url,
      finalUrl,
      status,
      reachable,
      error,
      https,
      certError,
      blocked,
      thirdParty,
      freeSubdomain,
      parked,
      platform,
      viewport,
      copyrightYear,
      telLink,
      thinContent,
      menu,
      ordering,
      reservations,
      contact,
      linksChecked,
      brokenLinks,
    }).filter(([, v]) => v !== undefined),
  );
}

// ── Pipeline ────────────────────────────────────────────────────────────────────

const PSI_TIMEOUT = 60000;

async function observe(subject) {
  const rawChecks = await inspectSite(subject.website);
  let speed = subject.pageSpeed || null;
  let speedFetched = false;
  let attempted = !!speed;

  // PageSpeed runs even when our own read failed or was refused. Google fetches
  // from its own addresses and renders the page, so it's both a second opinion
  // on whether the site is actually up and the only evidence available for a
  // site behind bot protection. The one case worth skipping is a URL that isn't
  // their site at all.
  const worthTiming = !rawChecks.thirdParty && !rawChecks.parked;
  if (!speed && worthTiming) {
    attempted = true;
    try {
      speed = await runPageSpeed(rawChecks.finalUrl || rawChecks.url, {
        timeoutMs: PSI_TIMEOUT,
        signals: true,
      });
      speedFetched = true;
    } catch {
      speed = null;
    }
  }

  const checks = mergePsiSignals(rawChecks, speed, attempted);
  const facts = verifiedFacts(checks, speed);
  return { subject, checks, speed, speedFetched, facts };
}

async function assess(observations) {
  const content = `Assess these ${observations.length} restaurant website${
    observations.length === 1 ? "" : "s"
  }:\n\n${observations.map(buildResearchBrief).join("\n\n---\n\n")}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      // ~250 tokens per restaurant on the newer tokenizer, plus headroom.
      max_tokens: 512 + observations.length * 450,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err.slice(0, 300)}`);
  }
  const data = await response.json();
  const parsed = parseModelJSON(data.content?.[0]?.text ?? "");
  const results =
    parsed?.results && typeof parsed.results === "object"
      ? parsed.results
      : parsed && typeof parsed === "object"
        ? parsed
        : {};
  return { results, truncated: data.stop_reason === "max_tokens" };
}

export function shapeResult(obs, entry, now = new Date()) {
  return {
    checkedAt: now.toISOString(),
    website: obs.subject.website,
    checks: compactChecks(obs.checks),
    speed: obs.speed
      ? {
          score: obs.speed.score,
          lcp: obs.speed.lcp,
          status: obs.speed.status,
          checkedAt: obs.speed.checkedAt,
        }
      : null,
    speedFetched: obs.speedFetched || undefined,
    ...normalizeResearch(entry, obs.facts),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subject, subjects } = req.body || {};
  const batch = Array.isArray(subjects)
    ? subjects.filter((s) => s?.id && str(s.website))
    : null;

  if (!batch && (!subject?.id || !str(subject?.website))) {
    return res
      .status(400)
      .json({ error: "Nothing to research — this lead has no website." });
  }
  if (batch && batch.length === 0) {
    return res.status(400).json({ error: "No leads with a website provided." });
  }
  if (batch && batch.length > MAX_BATCH) {
    return res
      .status(400)
      .json({ error: `Batch too large — max ${MAX_BATCH} per request.` });
  }

  const list = batch || [subject];

  try {
    const observations = await Promise.all(list.map(observe));

    // Nothing was verified about these sites, so there is nothing to judge.
    // Asking anyway is how a site nobody could read came back rated "medium
    // opportunity" — an opinion with no evidence under it, which is exactly
    // what this feature exists not to produce.
    const judgeable = observations.filter((o) => o.facts.quality !== "blocked");

    // If the model call fails, the verified findings still stand — they're
    // returned unrated rather than thrown away.
    let results = {};
    let truncated = false;
    let assessError = "";
    if (judgeable.length) {
      try {
        ({ results, truncated } = await assess(judgeable));
      } catch (err) {
        assessError = err.message;
      }
    }

    const now = new Date();
    const shaped = Object.fromEntries(
      observations.map((o) => [
        o.subject.id,
        shapeResult(o, results?.[o.subject.id], now),
      ]),
    );

    if (!batch) {
      return res.status(200).json({
        ...shaped[subject.id],
        assessError: assessError || undefined,
        truncated: truncated || undefined,
      });
    }
    return res.status(200).json({
      results: shaped,
      requested: batch.length,
      assessed: Object.values(shaped).filter((r) => r.assessed).length,
      assessError: assessError || undefined,
      truncated: truncated || undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
