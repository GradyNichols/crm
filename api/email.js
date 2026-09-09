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

Body — you write the MESSAGE ONLY. The app adds the greeting and the signature:
- Do NOT write a greeting. No "Hi", no "Hello", and do not open with the owner's name — the app has already written "Hi <name>," above your first line.
- Do NOT sign off. No name, no "Thanks,", no signature block. The app adds those below your last line.
- Under 120 words. It gets read on a phone between shifts.
- Open with the specific reason he is writing to THEM. If their site is slow, that is the opening — it is a checkable fact, not a pitch.
- The portfolio URL appears exactly once, on its own line. It is the only link and the only thing to click.
- "$500" appears once, stated plainly. No packages, no tiers, no "starting at".
- End with one small ask — a reply, a yes or no, two minutes of their time.
- No bullet lists, no headers.
- Never reintroduce himself if there is touchpoint history.
- Plain sentences. Never "I hope this finds you well", "circling back", "just following up", "reach out", "leverage", "solutions", "excited to".
- Return only valid JSON. Escape newlines inside the body as \\n.

Using the context you are given:
- Track record: if he has closed restaurants, it earns ONE short clause and never more — "a few restaurants around Simi Valley" reads human, a paragraph about his experience reads like a brochure. Use only the numbers and areas given. Never name a client, never imply more than the count supports. If no track record is given, say nothing about experience at all.
- Pitch angle: if his pitch script already has an angle for this restaurant, the email makes that same argument in writing. Do not invent a second, different reason for writing, and do not copy the pitch wording verbatim — it was written to be spoken.
- What else he tracks: these are his own private notes on the lead. Use them to aim the email; never quote them back or let the owner sense they are in a database.
- Today's date: use it only if the season genuinely changes what to say — a holiday rush, a slow month before it. If it doesn't, ignore it. Never mention the date or the season just to prove you noticed.
- His first name: use it only if the sentence needs it ("I'm Grady, I build websites for restaurants around here") on a first contact. It is already in the signature, so never end with it.`;

const str = (v) => (typeof v === "string" ? v.trim() : "");

const GREETING =
  /^(hi|hey|hello|dear|good (morning|afternoon|evening))\b[^.?!]{0,40},?$/i;
const SIGNOFF =
  /^(thanks|thank you|best|best regards|cheers|regards|sincerely|talk soon|appreciate it)\b[^.?!]{0,30},?$/i;

// The app owns the envelope: the greeting is composed from the owner's first
// name and the sign-off from the sender name and signature in Settings. The
// prompt says so, but a model that writes one anyway would produce "Hi Rosa,"
// twice, so the stored body is stripped rather than trusted.
export function stripEnvelope(body = "", senderName = "") {
  const lines = String(body).split("\n");
  const name = senderName.trim().toLowerCase();

  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines.length && GREETING.test(lines[0].trim())) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }

  // Up to three trailing lines: "Thanks," / "Grady" / stray blanks.
  for (let i = 0; i < 3; i++) {
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const last = lines.length ? lines[lines.length - 1].trim() : "";
    if (!last || last.length > 40) break;
    const isName =
      !!name &&
      last
        .replace(/[.,!—-]/g, "")
        .trim()
        .toLowerCase() === name;
    if (isName || SIGNOFF.test(last)) lines.pop();
    else break;
  }

  return lines.join("\n").trim();
}

// Guarantee both fields exist so the UI never breaks on a partial result.
export function normalizeEmail(parsed, senderName = "") {
  if (!parsed || typeof parsed !== "object") return null;
  const subject = str(parsed.subject);
  const body = stripEnvelope(str(parsed.body), senderName);
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
    const email = normalizeEmail(parseModelJSON(text), lead.senderName || "");

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
