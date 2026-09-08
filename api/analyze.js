import { parseModelJSON } from "./_json.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pipeline } = req.body;
  if (!pipeline) {
    return res.status(400).json({ error: "No pipeline data provided" });
  }

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
        max_tokens: 4096,
        system: `You are a sharp, direct sales coach reviewing a freelance web designer's restaurant outreach pipeline.
The designer charges $500 per website and targets independent restaurants via cold calls, walk-ins, cold emails, and Yelp messages.
Analyze the pipeline data and return a JSON object with exactly this structure:
{
  "urgent": [{ "lead": "Business Name", "reason": "brief reason" }],
  "stale": [{ "lead": "Business Name", "reason": "brief reason" }],
  "insights": ["observation 1", "observation 2", "observation 3"],
  "nextSteps": ["action 1", "action 2", "action 3"]
}
- "urgent": leads needing immediate attention (overdue follow-ups, warm leads going cold, etc). Max 5.
- "stale": leads with no recent activity that risk being lost. Max 5.
- "insights": pattern-level observations about the overall pipeline health. Exactly 3.
- "nextSteps": the 3 most impactful concrete actions to take this week.
Be specific — use actual business names. Be blunt. No filler.
Keep every "reason", "insight", and "nextStep" under 20 words so the response stays compact.
Return only valid JSON, no markdown, no preamble.`,
        messages: [
          {
            role: "user",
            content: `Here is my current restaurant outreach pipeline:\n\n${pipeline}`,
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

    // Straight parse → extract a JSON blob → repair truncation. Shared with
    // pitch.js so the two endpoints can't drift.
    const parsed = parseModelJSON(text);

    if (!parsed) {
      return res.status(500).json({
        error:
          stopReason === "max_tokens"
            ? "The analysis was cut short. Try again — if it keeps happening, your pipeline may be too large to summarize in one pass."
            : "Could not parse AI response.",
        raw: text.slice(0, 500),
      });
    }

    // Guarantee all four keys exist so the UI never breaks on a partial result
    const result = {
      urgent: Array.isArray(parsed.urgent) ? parsed.urgent : [],
      stale: Array.isArray(parsed.stale) ? parsed.stale : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      truncated: stopReason === "max_tokens" || undefined,
    };

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
