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

// Signals research can use when it couldn't read the page itself: Google runs
// the site in a real browser from Google's own addresses, which restaurant
// platforms behind bot protection generally allow when they refuse us.
//
// Everything here is optional by design. An audit Google didn't return leaves
// the signal `null`, and a null signal produces no finding — never a guess.
export function extractSignals(lighthouse) {
  const audits = lighthouse?.audits || {};
  const viewportScore = audits.viewport?.score;
  const items = audits["network-requests"]?.details?.items;
  const hosts = Array.isArray(items)
    ? [
        ...new Set(
          items
            .map((i) => {
              try {
                return new URL(i.url).hostname.toLowerCase();
              } catch {
                return "";
              }
            })
            .filter(Boolean),
        ),
      ].slice(0, 40)
    : null;
  return {
    viewport: viewportScore === 1 ? true : viewportScore === 0 ? false : null,
    requestHosts: hosts,
    finalUrl: lighthouse?.finalUrl || lighthouse?.finalDisplayedUrl || "",
  };
}

// Throws with a readable message on any failure. `timeoutMs` is optional —
// /api/pagespeed has never had one, research needs one so a single slow site
// can't eat the whole request. `signals: true` adds the SEO category and the
// `signals` key; /api/pagespeed passes neither, so its response is unchanged.
export async function runPageSpeed(url, { timeoutMs, signals = false } = {}) {
  const target = normalizeUrl(url);
  if (!target) throw new Error("No URL provided");

  const apiKey = process.env.PAGESPEED_API_KEY;
  const categories = signals
    ? "&category=performance&category=seo"
    : "&category=performance";
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
    target,
  )}&strategy=mobile${categories}${apiKey ? `&key=${apiKey}` : ""}`;

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
  const result = summarizeLighthouse(data.lighthouseResult, target);
  return signals
    ? { ...result, signals: extractSignals(data.lighthouseResult) }
    : result;
}
