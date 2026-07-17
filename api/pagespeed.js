export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: "No URL provided" });
  }

  // Normalize URL — add https:// if missing
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

  try {
    const apiKey = process.env.PAGESPEED_API_KEY;
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      target,
    )}&strategy=mobile&category=performance${apiKey ? `&key=${apiKey}` : ""}`;

    const response = await fetch(psiUrl);
    if (!response.ok) {
      const errText = await response.text();
      return res
        .status(500)
        .json({ error: `PageSpeed API error: ${errText.slice(0, 300)}` });
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;

    if (!lighthouse) {
      return res.status(500).json({ error: "No Lighthouse result returned." });
    }

    const score = Math.round(
      (lighthouse.categories?.performance?.score ?? 0) * 100,
    );
    const lcpAudit = lighthouse.audits?.["largest-contentful-paint"];
    const lcpSeconds = lcpAudit
      ? Number((lcpAudit.numericValue / 1000).toFixed(1))
      : null;

    // Classify: bad / warn / good
    let status = "good";
    if (score < 50 || (lcpSeconds !== null && lcpSeconds > 4)) {
      status = "bad";
    } else if (score < 90 || (lcpSeconds !== null && lcpSeconds > 2.5)) {
      status = "warn";
    }

    return res.status(200).json({
      url: target,
      score,
      lcp: lcpSeconds,
      status,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
