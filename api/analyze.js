// Attempts to repair truncated JSON by closing any unterminated
// strings, arrays, and objects. Returns null if unsalvageable.
function repairTruncatedJSON(text) {
  // Trim to the first opening brace
  const start = text.indexOf("{");
  if (start === -1) return null;
  let s = text.slice(start);

  // Walk the string tracking structural state
  const stack = [];
  let inString = false;
  let escaped = false;
  let lastSafeIndex = -1; // end of last complete top-level array/object element

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      stack.pop();
      lastSafeIndex = i;
    } else if (ch === "," && stack.length <= 2) {
      lastSafeIndex = i;
    }
  }

  // If it already parses, nothing to repair
  try {
    return JSON.parse(s);
  } catch {}

  // Cut back to the last structurally safe point, dropping a partial element
  if (lastSafeIndex > -1) {
    s = s.slice(0, lastSafeIndex + 1);
    // Remove a dangling comma
    s = s.replace(/,\s*$/, "");
  } else if (inString) {
    // Unterminated string with no safe point — close it
    s += '"';
  }

  // Recompute what's still open after trimming
  const closers = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc2) {
      esc2 = false;
      continue;
    }
    if (ch === "\\") {
      if (inStr2) esc2 = true;
      continue;
    }
    if (ch === '"') {
      inStr2 = !inStr2;
      continue;
    }
    if (inStr2) continue;
    if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }
  if (inStr2) s += '"';
  while (closers.length) s += closers.pop();

  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

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

    let parsed;

    // 1. Straight parse
    try {
      parsed = JSON.parse(text);
    } catch {
      // 2. Extract a JSON blob if the model wrapped it in prose/markdown
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          // 3. Repair truncated JSON
          parsed = repairTruncatedJSON(text);
        }
      } else {
        // 3. Repair truncated JSON (no closing brace at all)
        parsed = repairTruncatedJSON(text);
      }
    }

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
