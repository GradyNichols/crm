// Shared JSON handling for the Anthropic-backed endpoints.
// Files under /api prefixed with "_" are not treated as routes by Vercel.
//
// Lifted verbatim out of analyze.js when pitch.js needed the same repair pass —
// an 80-line copy-paste in two serverless functions would have drifted.

// Attempts to repair truncated JSON by closing any unterminated
// strings, arrays, and objects. Returns null if unsalvageable.
export function repairTruncatedJSON(text) {
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

// Straight parse → extract a JSON blob from prose/markdown → repair truncation.
// Escapes double quotes that appear *inside* a JSON string value.
//
// The models quote things. Asked to build a hook on a verified finding, one of
// which is `browsers label it "Not secure"`, the reply comes back as
//   "hook": "browsers label it "Not secure" before anyone sees the menu"
// which is not JSON, and which repairTruncatedJSON can't help with — nothing is
// truncated, the string tracking is simply desynced from the first stray quote
// onward, so every brace after it is counted in the wrong state.
//
// A quote inside a string is treated as the real closing quote only when the
// next non-whitespace character is one of `,:}]` or the end of input. Anything
// else means the string is still going and the quote belongs to the prose, so
// it gets escaped.
//
// Last resort by design: it runs only after a straight parse, a blob extract
// and a truncation repair have all failed, so at worst it turns null into null.
export function escapeStrayQuotes(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const s = text.slice(start);

  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        inString = true;
        out += ch;
        continue;
      }
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const next = s[j];
      if (
        next === undefined ||
        next === "," ||
        next === ":" ||
        next === "}" ||
        next === "]"
      ) {
        inString = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }
    out += ch;
  }

  return out;
}

// Straight parse → extract a JSON blob from prose/markdown → repair truncation
// → escape stray quotes inside values, then try both of those again.
export function parseModelJSON(text) {
  try {
    return JSON.parse(text);
  } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  const repaired = repairTruncatedJSON(text);
  if (repaired) return repaired;

  const escaped = escapeStrayQuotes(text);
  if (!escaped) return null;
  try {
    return JSON.parse(escaped);
  } catch {}
  // Stray quotes and a truncated tail can arrive together.
  return repairTruncatedJSON(escaped);
}
