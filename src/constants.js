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

// ── Generated content ───────────────────────────────────────────────────────────
// Anything AI-written is produced against a snapshot of the lead. Once the story
// moves on — the status changed, or notes were logged since — it may be arguing
// from facts that are no longer true, so the UI says so rather than quietly
// serving a stale script during a walk-in or a stale email at a desk.
export function isGeneratedStale(lead, key = "generatedPitch") {
  const basedOn = lead?.[key]?.basedOn;
  if (!basedOn) return false;
  if (basedOn.status !== lead.status) return true;
  return basedOn.notesCount !== (lead.notesLog || []).length;
}

export function generatedStaleReason(lead, key = "generatedPitch") {
  const basedOn = lead?.[key]?.basedOn;
  if (!basedOn) return null;
  if (basedOn.status !== lead.status)
    return `Written when this lead was ${basedOn.status}`;
  const added = (lead.notesLog || []).length - basedOn.notesCount;
  if (added > 0)
    return `${added} touchpoint${added !== 1 ? "s" : ""} logged since`;
  if (added < 0) return "Touchpoints were removed since";
  return null;
}

export const isPitchStale = (lead) => isGeneratedStale(lead, "generatedPitch");
export const pitchStaleReason = (lead) =>
  generatedStaleReason(lead, "generatedPitch");
export const isEmailStale = (lead) => isGeneratedStale(lead, "generatedEmail");
export const emailStaleReason = (lead) =>
  generatedStaleReason(lead, "generatedEmail");

// ── Generated emails ────────────────────────────────────────────────────────────
// There isn't one email — there are four jobs, and which one you're writing is
// the single biggest lever on what comes out. It's also knowable from the lead's
// own data, so the app infers it and shows its reasoning rather than asking.

export const EMAIL_KINDS = [
  {
    key: "intro",
    label: "Intro",
    hint: "They've never heard from you",
  },
  {
    key: "follow_up",
    label: "Follow-up",
    hint: "Continues a conversation you've already had",
  },
  {
    key: "nudge",
    label: "Nudge",
    hint: "It's gone quiet — a light re-open",
  },
  {
    key: "after_pitch",
    label: "After a pitch",
    hint: "You pitched — send the link and the price",
  },
];

export const EMAIL_KIND_LABELS = Object.fromEntries(
  EMAIL_KINDS.map((k) => [k.key, k.label]),
);

// Order matters: the most specific signal wins.
export function inferEmailKind(lead) {
  if (!lead) return "intro";
  const notes = lead.notesLog || [];
  const last = notes.length ? notes[notes.length - 1].text || "" : "";

  // Pitch Mode and Call Prep both stamp their outcome into the note text.
  if (/^\[(Pitch|Call):/.test(last)) return "after_pitch";
  if (!lead.lastTouchDate && notes.length === 0) return "intro";
  if (isAging(lead)) return "nudge";
  if (lead.status === "Warm" || lead.status === "Waiting") return "follow_up";
  return "follow_up";
}

// Why that kind was chosen, in the same words the UI can show.
export function emailKindReason(lead) {
  if (!lead) return "";
  const notes = lead.notesLog || [];
  const last = notes.length ? notes[notes.length - 1].text || "" : "";
  if (/^\[(Pitch|Call):/.test(last)) return "you pitched them last";
  if (!lead.lastTouchDate && notes.length === 0) return "no contact yet";
  if (isAging(lead)) {
    const days = daysSinceTouch(lead);
    return days == null ? "gone quiet" : `quiet for ${days} days`;
  }
  return `${lead.status.toLowerCase()} and recently touched`;
}

// ── Runs ────────────────────────────────────────────────────────────────────────
// A Run is a bounded working session over an ordered queue of leads. These
// constants describe the three shapes a run can take and which HUD each stop
// opens in.

export const RUN_MODES = [
  {
    key: "walkins",
    label: "Walk-ins",
    hint: "Every stop opens in Pitch Mode",
  },
  {
    key: "calls",
    label: "Calls",
    hint: "Every stop opens in Call Prep",
  },
  {
    key: "mixed",
    label: "Mixed",
    hint: "Each stop follows the lead's own outreach type",
  },
];

export const RUN_MODE_LABELS = {
  walkins: "Walk-ins",
  calls: "Calls",
  mixed: "Mixed",
};

// Which HUD a given stop should open in, given the run's mode.
// Mixed runs defer to the lead's own outreach type.
export function stopPathFor(mode, lead) {
  if (!lead) return "/";
  if (mode === "walkins") return `/pitch/${lead.id}`;
  if (mode === "calls") return `/call/${lead.id}`;
  return lead.type === "Walk-in" ? `/pitch/${lead.id}` : `/call/${lead.id}`;
}
