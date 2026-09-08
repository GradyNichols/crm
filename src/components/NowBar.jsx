import { useLocation, useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { RUN_MODE_LABELS, stopPathFor } from "../constants";

// ── Now Bar ─────────────────────────────────────────────────────────────────────
// The thread. Rendered inside the sticky header so it always sits directly under
// the nav row without fighting the bottom nav, the FAB, or table pagination
// clearance. Renders nothing when there's no run, which is why it's safe to mount
// on every page.
//
// Deliberately hidden on the run's own screens — Pitch Mode, Call Prep and the
// run overview *are* the run, so a bar restating it would just eat phone height.

const HIDDEN_PREFIXES = ["/pitch/", "/call/", "/run"];

export default function NowBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const activeRun = useCRMStore((s) => s.activeRun);
  const lastRun = useCRMStore((s) => s.lastRun);

  const hidden = HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (hidden) return null;

  // ── Finished-run nudge ───────────────────────────────────────────────────────
  if (!activeRun) {
    if (!lastRun) return null;
    const doneCount = Object.keys(lastRun.done || {}).length;
    return (
      <div className="border-t border-slate-800 bg-green-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <p className="text-sm text-slate-300 flex-1 min-w-0 truncate">
            Run finished —{" "}
            <span className="text-slate-500">
              {doneCount} stop{doneCount !== 1 ? "s" : ""} logged
            </span>
          </p>
          <button
            onClick={() => navigate("/run")}
            className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors shrink-0"
          >
            Recap
          </button>
          <button
            onClick={() => useCRMStore.getState().dismissRunRecap()}
            className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 p-1 -mr-1"
            title="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Active run ───────────────────────────────────────────────────────────────
  const total = activeRun.queue.length;
  const doneCount = Object.keys(activeRun.done || {}).length;
  const currentId = activeRun.queue[activeRun.cursor];
  const lead = leads.find((l) => l.id === currentId);
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="border-t border-slate-800 bg-blue-950/25">
      {/* Progress hairline */}
      <div className="h-0.5 bg-slate-800/60">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <button
          onClick={() => navigate("/run")}
          className="flex items-center gap-3 flex-1 min-w-0 text-left group"
          title="Open run"
        >
          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-blue-400 shrink-0">
            {RUN_MODE_LABELS[activeRun.mode] || "Run"}
          </span>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            {Math.min(doneCount + 1, total)}/{total}
          </span>
          <span className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
            {lead ? lead.businessName : "Lead not found"}
          </span>
        </button>

        <button
          onClick={() => navigate(stopPathFor(activeRun.mode, lead))}
          disabled={!lead}
          className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
