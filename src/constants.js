export const STATUSES = [
  "Cold",
  "Contacted",
  "Warm",
  "Waiting",
  "Dead",
  "Closed",
];

export const STATUS_COLORS = {
  Cold: "bg-slate-700 text-slate-200",
  Contacted: "bg-blue-900 text-blue-200",
  Warm: "bg-amber-900 text-amber-200",
  Waiting: "bg-purple-900 text-purple-200",
  Dead: "bg-red-950 text-red-400",
  Closed: "bg-green-900 text-green-200",
};

export const OUTREACH_TYPES = [
  "Walk-in",
  "Cold Email",
  "Yelp Message",
  "Phone Call",
];

export const STRENGTH_LABELS = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
};

export const COLUMNS = [
  { key: "businessName", label: "Business", icon: "business" },
  { key: "ownerName", label: "Owner", icon: "owner" },
  { key: "type", label: "Type", icon: "type" },
  { key: "strength", label: "Strength", icon: "strength" },
  { key: "status", label: "Status", icon: "status" },
  { key: "lastTouchDate", label: "Last Touch", icon: "lastTouch" },
  { key: "followUpDate", label: "Follow-up", icon: "followUp" },
];

// ── Lead aging ──────────────────────────────────────────────────────────────────
// Days without a touch before a lead is flagged as "going stale" per status.
export const AGING_THRESHOLDS = {
  Warm: 5,
  Waiting: 5,
  Contacted: 7,
  Cold: 14,
};

// Returns the number of days since lastTouchDate, or null if never touched.
export function daysSinceTouch(lead) {
  if (!lead.lastTouchDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const diff = Math.floor(
    (new Date(today) - new Date(lead.lastTouchDate)) / 86400000,
  );
  return diff;
}

// Returns true if a lead is "aging" — sitting in its current status too long without contact.
export function isAging(lead) {
  const threshold = AGING_THRESHOLDS[lead.status];
  if (!threshold) return false;
  const days = daysSinceTouch(lead);
  // Never touched at all counts as aging too, using the same threshold
  if (days === null) return true;
  return days >= threshold;
}
