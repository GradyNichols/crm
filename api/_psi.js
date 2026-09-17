// Google PageSpeed Insights, shared by /api/pagespeed and /api/research.
// Files under /api prefixed with "_" are not treated as routes by Vercel.
//
// Lifted out of pagespeed.js when research needed the same call. The response
// shape is unchanged — `pageSpeedCache` entries written before the move are
// still valid, and both endpoints classify speed with the same thresholds.

// "joesdiner.com" → "https://joesdiner.com". Empty in, empty out.
export function normalizeUrl(url = "") {
  let target = String(url || "").trim();
  if (!target) return "";
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
  return target;
}

// bad = score under 50 or LCP over 4s; warn = under 90 or LCP over 2.5s.
export function classifySpeed(score, lcpSeconds) {
  if (score < 50 || (lcpSeconds !== null && lcpSeconds > 4)) return "bad";
  if (score < 90 || (lcpSeconds !== null && lcpSeconds > 2.5)) return "warn";
  return "good";
}

// Lighthouse result → the small object the app stores.
export function summarizeLighthouse(lighthouse, target, now = new Date()) {
  const score = Math.round(
    (lighthouse?.categories?.performance?.score ?? 0) * 100,
  );
  const lcpAudit = lighthouse?.audits?.["largest-contentful-paint"];
  const lcp = lcpAudit
    ? Number((lcpAudit.numericValue / 1000).toFixed(1))
    : null;
  return {
    url: target,
    score,
    lcp,
    status: classifySpeed(score, lcp),
    checkedAt: now.toISOString(),
  };
}

// Throws with a readable message on any failure. `timeoutMs` is optional —
// /api/pagespeed has never had one, research needs one so a single slow site
// can't eat the whole request.
export async function runPageSpeed(url, { timeoutMs } = {}) {
  const target = normalizeUrl(url);
  if (!target) throw new Error("No URL provided");

  const apiKey = process.env.PAGESPEED_API_KEY;
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
    target,
  )}&strategy=mobile&category=performance${apiKey ? `&key=${apiKey}` : ""}`;

  const response = await fetch(
    psiUrl,
    timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : undefined,
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PageSpeed API error: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  if (!data.lighthouseResult) {
    throw new Error("No Lighthouse result returned.");
  }
  return summarizeLighthouse(data.lighthouseResult, target);
}
