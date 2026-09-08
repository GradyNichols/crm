import useCRMStore from "../store/useCRMStore";

// ── QueueButton ─────────────────────────────────────────────────────────────────
// The verb. Every surface that suggests who to contact — Calendar, the Pipeline
// Advisor, the Map, Search, Lead Detail — renders this one control so the action
// looks and behaves identically everywhere.
//
// It shows exactly one target at a time. Mid-run the useful move is "work this
// next," so it offers the run; otherwise it offers today's plan. Showing both at
// once meant two near-identical buttons and a decision that isn't worth making.

const SIZES = {
  default: "text-sm px-3.5 py-2",
  compact: "text-xs px-2.5 py-1.5",
};

export default function QueueButton({
  leadId,
  size = "default",
  className = "",
}) {
  const activeRun = useCRMStore((s) => s.activeRun);
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];

  if (!leadId) return null;

  const target = activeRun ? "run" : "today";
  const already =
    target === "run"
      ? activeRun.queue.includes(leadId)
      : dailyPlan.some((i) => i.leadId === leadId);

  const label = already
    ? target === "run"
      ? "In run"
      : "In today"
    : target === "run"
      ? "+ Run"
      : "+ Today";

  const handleClick = (e) => {
    // These sit inside clickable rows and Leaflet popups often enough that
    // swallowing the event is the safe default.
    e.stopPropagation();
    if (already) return;
    if (target === "run") useCRMStore.getState().addToRun(leadId);
    else useCRMStore.getState().addToPlan(leadId);
  };

  return (
    <button
      onClick={handleClick}
      disabled={already}
      title={
        already
          ? target === "run"
            ? "Already a stop in this run"
            : "Already on today's plan"
          : target === "run"
            ? "Add to the run in progress"
            : "Add to today's plan"
      }
      className={`shrink-0 font-semibold rounded-lg border transition-colors ${SIZES[size] || SIZES.default} ${
        already
          ? "border-slate-800 text-slate-600 cursor-default"
          : "border-blue-900/50 text-blue-400 hover:border-blue-700 hover:text-blue-300"
      } ${className}`}
    >
      {label}
    </button>
  );
}

// Bulk equivalent, for "add everything on this day / in this list".
// Returns null when there's nothing left to add.
export function QueueAllButton({ leadIds = [], className = "" }) {
  const activeRun = useCRMStore((s) => s.activeRun);
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];

  const target = activeRun ? "run" : "today";
  const remaining = leadIds.filter((id) =>
    target === "run"
      ? !activeRun.queue.includes(id)
      : !dailyPlan.some((i) => i.leadId === id),
  );

  if (remaining.length === 0) return null;

  const handleClick = () => {
    const { addToRun, addToPlan } = useCRMStore.getState();
    remaining.forEach((id) =>
      target === "run" ? addToRun(id) : addToPlan(id),
    );
  };

  return (
    <button
      onClick={handleClick}
      className={`shrink-0 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors ${className}`}
    >
      Add all {remaining.length} to {target === "run" ? "run" : "today"}
    </button>
  );
}
