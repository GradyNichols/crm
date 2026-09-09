import { parseModelJSON } from "./_json.js";
import { buildLeadBrief } from "./_lead.js";

// The four jobs an email can be doing. Which one applies is inferred from the
// lead's own data client-side (inferEmailKind in constants.js) and passed in,
// because "what am I writing" is the single biggest lever on the output and it's
// knowable without asking.
export const EMAIL_KIND_BRIEFS = {
  intro:
    "INTRO — they have never heard from him. Earn the click cold. No history to reference, so the reason for writing has to come entirely from what he can see about their business.",
  follow_up:
    "FOLLOW-UP — a conversation already happened. Continue it. Reference what was actually said and what was agreed. Do not reintroduce himself.",
  nudge:
    "NUDGE — it has gone quiet. Short, light, and easy to ignore without hard feelings. One line of context, the link, one small ask. Never guilt-trip, never 'just following up'.",
  after_pitch:
    "AFTER A PITCH — he already pitched in person or on the phone. This is the send-the-link email. Confirm what was discussed, give the portfolio and the price plainly, and name the next step they agreed on.",
};

const SYSTEM = `You write cold and follow-up emails for a solo freelance web designer in Simi Valley, California. He builds custom websites for independent restaurants at a flat $500.

The email has exactly one job: get the owner to open his portfolio and decide from the work. Everything else is in service of that click.

Return a JSON object with exactly this structure:
{ "subject": "...", "body": "..." }

Subject:
- Under 50 characters, specific to this restaurant, sentence case.
- No "Boost", "Unlock", "Grow", "Quick question", no exclamation marks, no emoji, no colon-headline format.
- It should read like one person wrote it to one person.

Body:
- Under 120 words. It gets read on a phone between shifts.
- Open with the specific reason he is writing to THEM. If their site is slow, that is the opening — it is a checkable fact, not a pitch.
- The portfolio URL appears exactly once, on its own line. It is the only link and the only thing to click.
- "$500" appears once, stated plainly. No packages, no tiers, no "starting at".
- End with one small ask — a reply, a yes or no, two minutes of their time.
- No bullet lists, no headers, no signature block. Sign off with just his first name on its own line: Grady
- Never reintroduce himself if there is touchpoint history.
- Plain sentences. Never "I hope this finds you well", "circling back", "just following up", "reach out", "leverage", "solutions", "excited to".
- Return only valid JSON. Escape newlines inside the body as \\n.`;

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Guarantee both fields exist so the UI never breaks on a partial result.
export function normalizeEmail(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const subject = str(parsed.subject);
  const body = str(parsed.body);
  if (!subject || !body) return null;
  return { subject, body };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lead, kind } = req.body || {};

  if (!lead || !lead.businessName) {
    return res.status(400).json({ error: "No lead data provided" });
  }
  // The portfolio is the entire argument of the email. Without it there's
  // nothing to send them to, so this is a hard requirement rather than a
  // degraded output.
  if (!lead.portfolioUrl) {
    return res.status(400).json({
      error:
        "No portfolio URL set. Add one in Settings — the email exists to send them there.",
    });
  }

  const kindBrief = EMAIL_KIND_BRIEFS[kind] || EMAIL_KIND_BRIEFS.intro;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1536,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Kind of email to write:\n${kindBrief}\n\nThe restaurant:\n\n${buildLeadBrief(lead)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Anthropic API error: ${err}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const stopReason = data.stop_reason;
    const email = normalizeEmail(parseModelJSON(text));

    if (!email) {
      return res.status(500).json({
        error:
          stopReason === "max_tokens"
            ? "The email was cut short. Try again."
            : "Could not parse AI response.",
        raw: text.slice(0, 500),
      });
    }

    return res.status(200).json({
      ...email,
      kind: EMAIL_KIND_BRIEFS[kind] ? kind : "intro",
      truncated: stopReason === "max_tokens" || undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
