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

// ── Email context ───────────────────────────────────────────────────────────────
// An email is written at a desk with time to think, so it can carry context a
// pitch script can't use in the moment. Everything below is additive: the pitch
// payload never carries these keys, and buildLeadBrief only renders the sections
// whose keys are present.

// "1420 E Los Angeles Ave, Simi Valley, CA 93065" → "Simi Valley".
// Second-to-last comma segment rather than a hardcoded town list, so this keeps
// working when the territory expands. Returns "" for anything that doesn't look
// like a full street address.
export function cityFromAddress(address = "") {
  const parts = String(address)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return "";
  const city = parts[parts.length - 2];
  // Guard against "…, Suite 4, CA 93065" and other non-city segments.
  if (!city || /\d/.test(city) || city.length < 3) return "";
  return city;
}

// Social proof from the pipeline itself, never invented. Count and areas only —
// naming a closed client in a cold email is a call to make deliberately, not a
// default. Returns null when there is nothing honest to say.
export function buildSocialProof(leads = [], excludeId = null) {
  const closed = leads.filter(
    (l) => l.status === "Closed" && l.id !== excludeId,
  );
  if (closed.length === 0) return null;

  const counts = {};
  for (const l of closed) {
    const city = cityFromAddress(l.address);
    if (city) counts[city] = (counts[city] || 0) + 1;
  }
  const areas = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city]) => city);

  return { closed: closed.length, areas };
}

// The lead's own custom-column values, labelled. Stored flat on the lead under
// the column id, so they're meaningless without the column definitions.
export function customFieldsFor(lead, customColumns = []) {
  return (customColumns || [])
    .map((col) => {
      const val = lead?.[col.id];
      if (val === undefined || val === null || val === "") return null;
      if (col.type === "checkbox")
        return { label: col.label, value: val ? "yes" : "no" };
      if (col.type === "stars") return { label: col.label, value: `${val}/5` };
      return { label: col.label, value: String(val) };
    })
    .filter(Boolean);
}

// Everything the email endpoint knows that the pitch endpoint doesn't.
export function buildEmailPayload(
  lead,
  {
    pageSpeedCache = {},
    portfolioUrl = "",
    leads = [],
    customColumns = [],
    groups = [],
    senderName = "",
  } = {},
) {
  const base = buildLeadPayload(lead, pageSpeedCache, portfolioUrl);
  const group = (groups || []).find((g) => g.id === lead.groupId);
  const social = buildSocialProof(leads, lead.id);

  return {
    ...base,
    senderName: senderName || "",
    today: new Date().toISOString().slice(0, 10),
    groupName: group?.name || "",
    customFields: customFieldsFor(lead, customColumns),
    // The angle the in-person pitch already takes, so the email argues the same
    // thing in writing instead of inventing a second reason for writing.
    pitchAngle: lead.generatedPitch?.hook || "",
    socialProof: social,
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
