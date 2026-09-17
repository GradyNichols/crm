import { runPageSpeed } from "./_psi.js";

// The PSI call and its speed classification live in _psi.js, shared with
// /api/research. This route's request and response are unchanged.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const result = await runPageSpeed(url);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
