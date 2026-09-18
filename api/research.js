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

// "Low", "low opportunity", "Medium-High", "strong" — all obviously mean one of
// the three levels. Demanding the exact lowercase word threw away good answers
// and reported them as unreadable, which is a worse failure than being lenient
// about spelling: the value is only ever used to pick a label and a colour.
const SYNONYMS = {
  strong: "high",
  good: "high",
  great: "high",
  moderate: "medium",
  med: "medium",
  mid: "medium",
  fair: "medium",
  weak: "low",
  poor: "low",
  none: "low",
  minimal: "low",
};

export function level(v) {
  const words = String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  for (const w of words) {
    if (LEVELS.includes(w)) return w;
    if (SYNONYMS[w]) return SYNONYMS[w];
  }
  return null;
}

// The same tolerance for field names. The prompt asks for these exact keys;
// this only catches the near misses a model actually makes.
const ALIASES = {
  picks: ["picks", "keys", "problems", "selected", "findings"],
  opportunity: ["opportunity", "rating", "opportunity_level", "score"],
  confidence: ["confidence", "certainty", "confidence_level"],
  reason: ["reason", "why", "explanation", "rationale", "justification"],
  chain: ["chain", "is_chain", "isChain", "likely_chain"],
};

export function coerceEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
  const out = {};
  for (const [canonical, names] of Object.entries(ALIASES)) {
    const key = names.find((n) => entry[n] !== undefined);
    if (key !== undefined) out[canonical] = entry[key];
  }
  return out;
}

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
Include every ID you were given, keyed by that ID — including when there is only one restaurant.`;

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

// ── Matching the answer to the lead ─────────────────────────────────────────────
// Asked about one restaurant, a model often answers with the assessment alone
// rather than keyed by the id it was given — both are reasonable readings of the
// instruction. Requiring the exact key threw away good answers and reported them
// as "not rated", so the match is tolerant in ways that can't mix two leads up:
// an exact id, a differently-cased id, the business name, position in an array,
// and the bare object only when there was a single subject to begin with.

// Every name an entry's fields may arrive under (see ALIASES), so recognising
// an answer and coercing it can't disagree.
const ENTRY_KEYS = [...new Set(Object.values(ALIASES).flat())];

export function looksLikeEntry(v) {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    ENTRY_KEYS.some((k) => k in v)
  );
}

export function pickEntry(parsed, subject, index = 0, count = 1) {
  if (!parsed || typeof parsed !== "object") return undefined;
  const results =
    parsed.results && typeof parsed.results === "object"
      ? parsed.results
      : parsed;

  if (Array.isArray(results)) {
    const byId = results.find(
      (r) => r && String(r.id || r.ID || "").trim() === String(subject.id),
    );
    if (looksLikeEntry(byId)) return byId;
    return results.length === count && looksLikeEntry(results[index])
      ? results[index]
      : undefined;
  }

  if (looksLikeEntry(results[subject.id])) return results[subject.id];

  const norm = (v) =>
    String(v || "")
      .trim()
      .toLowerCase();
  const byKey = (want) =>
    Object.keys(results).find((k) => norm(k) === norm(want));
  const idKey = byKey(subject.id);
  if (idKey && looksLikeEntry(results[idKey])) return results[idKey];
  const nameKey = subject.businessName ? byKey(subject.businessName) : null;
  if (nameKey && looksLikeEntry(results[nameKey])) return results[nameKey];

  // Only with a single subject: an unkeyed answer can only be about that one.
  if (count === 1) {
    if (looksLikeEntry(results)) return results;
    const entries = Object.values(results).filter(looksLikeEntry);
    if (entries.length === 1) return entries[0];
  }
  return undefined;
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

export function normalizeResearch(rawEntry, facts) {
  const entry = coerceEntry(rawEntry);
  const problems = facts?.problems || [];
  const byKey = new Map(problems.map((p) => [p.check, p]));
  // Keys are lowercase snake_case; match forgivingly so "Slow" still lands on
  // the verified fact rather than being dropped.
  const resolveKey = (k) => {
    const want = String(k ?? "")
      .trim()
      .toLowerCase();
    if (!want) return null;
    for (const p of problems)
      if (p.check.toLowerCase() === want) return p.check;
    return null;
  };
  const assessed = !!entry && typeof entry === "object";

  let picks = [];
  if (assessed && Array.isArray(entry.picks)) {
    for (const raw of entry.picks) {
      const k = resolveKey(raw);
      if (k && !picks.includes(k)) picks.push(k);
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
  const opportunity = level(entry?.opportunity);
  const rawConfidence = level(entry?.confidence) || "medium";

  return {
    findings,
    opportunity,
    confidence: lower(rawConfidence, cap),
    reason: str(entry?.reason).slice(0, 240),
    likelyChain: entry?.chain === true || entry?.chain === "true",
    assessed: assessed && !!opportunity,
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
      messages: [
        { role: "user", content },
        // Prefilling the reply with "{" removes the whole class of failures
        // where the answer is fine but wrapped in a sentence or a code fence.
        { role: "assistant", content: "{" },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err.slice(0, 300)}`);
  }
  const data = await response.json();
  return {
    ...readModelJSON(data),
    truncated: data.stop_reason === "max_tokens",
  };
}

// Reads the model's answer defensively: every text block (not just the first,
// which isn't guaranteed to be the text one), and both with and without the
// prefilled brace, since a model may or may not treat it as already written.
export function readModelJSON(data) {
  const raw = (Array.isArray(data?.content) ? data.content : [])
    .filter((c) => c?.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("\n")
    .trim();
  // An empty answer must stay empty: the JSON repair pass would otherwise turn
  // a bare prefilled brace into {}, which reads as a successful parse.
  if (!raw) return { parsed: null, raw: "" };
  const usable = (v) =>
    !!v && typeof v === "object" && Object.keys(v).length > 0;
  const withBrace = raw.startsWith("{") ? null : parseModelJSON(`{${raw}`);
  const parsed = usable(withBrace) ? withBrace : parseModelJSON(raw);
  return { parsed: usable(parsed) ? parsed : null, raw };
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
    let parsed = null;
    let truncated = false;
    let raw = "";
    let assessError = "";
    if (judgeable.length) {
      try {
        ({ parsed, truncated, raw } = await assess(judgeable));
      } catch (err) {
        assessError = err.message;
      }
    }

    const now = new Date();
    const judgeIndex = new Map(judgeable.map((o, i) => [o.subject.id, i]));
    const shaped = Object.fromEntries(
      observations.map((o) => {
        const i = judgeIndex.get(o.subject.id);
        const entry =
          i === undefined
            ? undefined
            : pickEntry(parsed, o.subject, i, judgeable.length);
        return [o.subject.id, shapeResult(o, entry, now)];
      }),
    );

    // Distinguish "the model errored" from "the model answered something we
    // couldn't use" — otherwise both show up as a silent missing rating.
    if (!assessError && judgeable.length) {
      const unmatched = judgeable.filter((o) => !shaped[o.subject.id].assessed);
      if (unmatched.length === judgeable.length) {
        // Quote what actually came back. A generic "couldn't be read" sent us
        // round the houses twice; the first line of the answer names the cause.
        const preview = raw ? ` It began: ${raw.slice(0, 160)}` : "";
        assessError = truncated
          ? "The rating was cut short. Try again."
          : `The model's answer couldn't be read, so nothing was rated. The findings below were still verified.${preview}`;
      }
    }

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
