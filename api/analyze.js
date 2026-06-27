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
        max_tokens: 1024,
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
Be specific — use actual business names. Be blunt. No filler. Return only valid JSON, no markdown.`,
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

    // Parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON if model wrapped it anyway
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else
        return res
          .status(500)
          .json({ error: "Could not parse AI response", raw: text });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
