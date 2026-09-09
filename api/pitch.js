import { parseModelJSON } from "./_json.js";
import { buildLeadBrief } from "./_lead.js";

// Re-exported so existing callers and tests keep importing it from here.
export { buildLeadBrief };

// One request can carry a single lead or a small batch. Batching amortises the
// system prompt across the group and collapses N round trips into one, which is
// what makes prepping a whole run cheap enough to do without thinking about it.
export const MAX_BATCH = 6;

// Same briefs, each tagged with the id the response must key against.
export function buildBatchBrief(leads = []) {
  return leads
    .map((lead) => `LEAD_ID: ${lead.id}\n${buildLeadBrief(lead)}`)
    .join("\n\n---\n\n");
}

const RULES = `Rules:
- Match the opener to the outreach type. A walk-in interrupts someone mid-shift; a phone call has about eight seconds.
- If the site speed is bad, lead with it — it's a concrete, checkable fact, not an opinion.
- If there's touchpoint history, reference it. Never reintroduce himself to someone he's already spoken to.
- If the lead is Warm or Waiting, the pitch is a continuation, not a first contact.
- Exactly 3 objections, and make them the ones THIS owner is likely to raise given their situation.
- Plain spoken. No jargon, no "leverage", no "solutions", no exclamation marks. Restaurant owners are busy and can smell a script.
- Every field under 45 words.
- Return only valid JSON. No markdown, no preamble.`;

const PREAMBLE = `You write pitch scripts for a solo freelance web designer in Simi Valley, California.
He builds custom websites for independent restaurants at a flat $500, and he does his own cold calls and in-person walk-ins.`;

const PITCH_SHAPE = `{
  "opener": "the first thing he says, 1-2 sentences",
  "hook": "the specific observation about THIS business that earns the next 30 seconds",
  "value": "what he's offering and why $500 is the number, 1-2 sentences",
  "objections": [{ "objection": "what they'll push back with", "response": "how he answers" }],
  "close": "the concrete ask"
}`;

const SINGLE_SYSTEM = `${PREAMBLE}

Write a pitch for the ONE specific restaurant described. It must be grounded in that restaurant's actual data — their name, their site's measured speed, what happened on previous touchpoints, how long it's been. A pitch that would work for any restaurant is a failed pitch.

Return a JSON object with exactly this structure:
${PITCH_SHAPE}

${RULES}`;

const BATCH_SYSTEM = `${PREAMBLE}

You will be given several restaurants, separated by "---", each tagged with a LEAD_ID. Write a separate pitch for each one, grounded in that restaurant's own data — their name, their site's measured speed, what happened on previous touchpoints, how long it's been. A pitch that would work for any restaurant is a failed pitch, and two pitches that read the same are two failed pitches.

Return a JSON object keyed by LEAD_ID:
{ "pitches": { "<LEAD_ID>": ${PITCH_SHAPE.replace(/\n/g, "\n  ")} } }

Include an entry for every LEAD_ID you were given.

${RULES}`;

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Guarantee every field exists so the UI never breaks on a partial result.
export function normalizePitch(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const result = {
    opener: str(parsed.opener),
    hook: str(parsed.hook),
    value: str(parsed.value),
    objections: (Array.isArray(parsed.objections) ? parsed.objections : [])
      .map((o) => ({
        objection: str(o?.objection),
        response: str(o?.response),
      }))
      .filter((o) => o.objection && o.response),
    close: str(parsed.close),
  };
  if (!result.opener && !result.hook && !result.close) return null;
  return result;
}

async function callAnthropic({ system, content, maxTokens }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text ?? "",
    stopReason: data.stop_reason,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lead, leads } = req.body || {};
  const batch = Array.isArray(leads) ? leads.filter((l) => l?.id) : null;

  if (!batch && (!lead || !lead.businessName)) {
    return res.status(400).json({ error: "No lead data provided" });
  }
  if (batch && batch.length === 0) {
    return res.status(400).json({ error: "No leads provided" });
  }
  if (batch && batch.length > MAX_BATCH) {
    return res
      .status(400)
      .json({ error: `Batch too large — max ${MAX_BATCH} leads per request.` });
  }

  try {
    // ── Batch ────────────────────────────────────────────────────────────────
    if (batch) {
      const { text, stopReason } = await callAnthropic({
        system: BATCH_SYSTEM,
        content: `Write my pitches for these ${batch.length} restaurants:\n\n${buildBatchBrief(batch)}`,
        maxTokens: Math.min(8192, batch.length * 1000 + 512),
      });

      const parsed = parseModelJSON(text);
      const raw =
        parsed?.pitches && typeof parsed.pitches === "object"
          ? parsed.pitches
          : parsed;

      if (!raw || typeof raw !== "object") {
        return res.status(500).json({
          error:
            stopReason === "max_tokens"
              ? "The batch was cut short. Try fewer leads at once."
              : "Could not parse AI response.",
          raw: text.slice(0, 500),
        });
      }

      // A truncated batch loses its tail rather than the whole thing — the
      // caller writes whatever came back and reports the shortfall.
      const pitches = {};
      for (const l of batch) {
        const p = normalizePitch(raw[l.id]);
        if (p) pitches[l.id] = p;
      }

      if (Object.keys(pitches).length === 0) {
        return res
          .status(500)
          .json({ error: "AI response had no usable pitch content." });
      }

      return res.status(200).json({
        pitches,
        requested: batch.length,
        returned: Object.keys(pitches).length,
        truncated: stopReason === "max_tokens" || undefined,
      });
    }

    // ── Single ───────────────────────────────────────────────────────────────
    const { text, stopReason } = await callAnthropic({
      system: SINGLE_SYSTEM,
      content: `Write my pitch for this restaurant:\n\n${buildLeadBrief(lead)}`,
      maxTokens: 2048,
    });

    const pitch = normalizePitch(parseModelJSON(text));

    if (!pitch) {
      return res.status(500).json({
        error:
          stopReason === "max_tokens"
            ? "The pitch was cut short. Try again."
            : "Could not parse AI response.",
        raw: text.slice(0, 500),
      });
    }

    return res.status(200).json({
      ...pitch,
      truncated: stopReason === "max_tokens" || undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
