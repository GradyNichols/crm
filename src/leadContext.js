import { daysSinceTouch } from "./constants";

// ── Lead → API payload ──────────────────────────────────────────────────────────
// Shared by useGeneratePitch and useGenerateEmail. Both generators need the same
// picture of a lead, and two copies of this would drift the moment one of them
// gained a field.

// Trimmed to the last 12 touchpoints: older history stops changing the output
// and starts costing tokens.
export function buildLeadPayload(lead, pageSpeedCache = {}, portfolioUrl = "") {
  const cached = lead.website ? pageSpeedCache[lead.website.trim()] : null;
  return {
    id: lead.id,
    businessName: lead.businessName,
    ownerName: lead.ownerName || "",
    address: lead.address || "",
    website: lead.website || "",
    type: lead.type || "Walk-in",
    status: lead.status,
    strength: lead.strength,
    lastTouchDate: lead.lastTouchDate || "",
    followUpDate: lead.followUpDate || "",
    daysSinceTouch: daysSinceTouch(lead),
    notes: (lead.notesLog || []).slice(-12).map((n) => `[${n.ts}] ${n.text}`),
    pageSpeed: cached
      ? { score: cached.score, lcp: cached.lcp, status: cached.status }
      : null,
    portfolioUrl: portfolioUrl || "",
  };
}

// The snapshot generated content is written against — drives the staleness
// banners in constants.js.
export function leadSnapshot(lead, pageSpeedCache = {}) {
  const cached = lead.website ? pageSpeedCache?.[lead.website.trim()] : null;
  return {
    status: lead.status,
    notesCount: (lead.notesLog || []).length,
    lastTouchDate: lead.lastTouchDate || "",
    speedScore: cached?.score ?? null,
  };
}
