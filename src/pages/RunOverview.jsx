import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, RUN_MODE_LABELS, stopPathFor } from "../constants";
import useGeneratePitch, { needsPitch } from "../hooks/useGeneratePitch";

// ── Icons ───────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
    />
  </svg>
);

const CheckIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

const XIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
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
);

const UpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3.5 h-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 15.75l7.5-7.5 7.5 7.5"
    />
  </svg>
);

const DownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3.5 h-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);

const OUTCOME_STYLES = {
  Yes: "text-green-400",
  Maybe: "text-amber-400",
  No: "text-red-400",
  logged: "text-slate-500",
};

function formatClock(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSpan(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  const mins = Math.max(
    0,
    Math.round((new Date(endedAt) - new Date(startedAt)) / 60000),
  );
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── Lead picker ─────────────────────────────────────────────────────────────────
function LeadPicker({ leads, excludeIds, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const available = leads.filter(
    (l) =>
      !excludeIds.includes(l.id) &&
      !["Closed", "Dead"].includes(l.status) &&
      (query === "" ||
        l.businessName.toLowerCase().includes(query.toLowerCase()) ||
        (l.ownerName || "").toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-16 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search leads to add…"
            className="w-full bg-transparent text-slate-100 text-sm placeholder-slate-600 focus:outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
          {available.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">
              {query
                ? "No matches found."
                : "Every active lead is in this run."}
            </p>
          ) : (
            available.map((lead) => (
              <button
                key={lead.id}
                onClick={() => {
                  onAdd(lead.id);
                  setQuery("");
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">
                    {lead.businessName}
                  </p>
                  {lead.ownerName && (
                    <p className="text-slate-500 text-xs">{lead.ownerName}</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ml-3 ${STATUS_COLORS[lead.status] || ""}`}
                >
                  {lead.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Recap ───────────────────────────────────────────────────────────────────────
function Recap({ run, leads, onDismiss, onRerunSkipped }) {
  const done = Object.entries(run.done || {});
  const skipped = (run.queue || []).filter(
    (leadId) => !run.done?.[leadId] && run.skipped?.[leadId],
  );
  const untouched = (run.queue || []).filter(
    (leadId) => !run.done?.[leadId] && !run.skipped?.[leadId],
  );
  const leftOver = [...skipped, ...untouched];
  const span = formatSpan(run.startedAt, run.endedAt);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-900/40 bg-green-950/15 px-5 py-5 space-y-1">
        <p className="text-xs font-semibold text-green-400 uppercase tracking-widest">
          Run complete
        </p>
        <p className="text-slate-100 text-2xl font-semibold">
          {done.length} stop{done.length !== 1 ? "s" : ""} logged
        </p>
        <p className="text-slate-500 text-sm">
          {RUN_MODE_LABELS[run.mode] || "Run"}
          {span ? ` · ${span}` : ""}
          {leftOver.length > 0 ? ` · ${leftOver.length} left unworked` : ""}
        </p>
      </div>

      {done.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Logged
          </p>
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {done.map(([leadId, info]) => {
              const lead = leads.find((l) => l.id === leadId);
              if (!lead) return null;
              return (
                <div
                  key={leadId}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-900/20"
                >
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3 h-3" />
                  </span>
                  <p className="text-slate-200 text-sm font-medium flex-1 truncate">
                    {lead.businessName}
                  </p>
                  <span
                    className={`text-xs font-semibold shrink-0 ${OUTCOME_STYLES[info.outcome] || "text-slate-500"}`}
                  >
                    {info.outcome === "logged" ? "Logged" : info.outcome}
                  </span>
                  <span className="text-slate-700 text-xs shrink-0 tabular-nums">
                    {formatClock(info.at)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {leftOver.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Not worked
          </p>
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {leftOver.map((leadId) => {
              const lead = leads.find((l) => l.id === leadId);
              if (!lead) return null;
              return (
                <div
                  key={leadId}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-900/10"
                >
                  <span className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                  <p className="text-slate-400 text-sm flex-1 truncate">
                    {lead.businessName}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[lead.status] || ""}`}
                  >
                    {lead.status}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onRerunSkipped(leftOver)}
            className="w-full mt-1 border border-blue-900/50 text-blue-400 hover:border-blue-700 hover:text-blue-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            Start a run with these {leftOver.length}
          </button>
        </section>
      )}

      <button
        onClick={onDismiss}
        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-3 rounded-xl transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function RunOverview() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const activeRun = useCRMStore((s) => s.activeRun);
  const lastRun = useCRMStore((s) => s.lastRun);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const {
    generateMany,
    bulk: pitchBulk,
    error: pitchError,
  } = useGeneratePitch();

  const {
    setRunCursor,
    addToRun,
    removeFromRun,
    moveRunStop,
    skipRunStop,
    endRun,
    startRun,
    dismissRunRecap,
  } = useCRMStore.getState();

  const header = (subtitle) => (
    <div className="flex items-center gap-4">
      <button
        onClick={() => navigate("/")}
        className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <BackIcon />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-semibold text-slate-100">Run</h2>
        <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );

  // ── Recap state ──────────────────────────────────────────────────────────────
  if (!activeRun && lastRun) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {header("Here's how that went.")}
        <Recap
          run={lastRun}
          leads={leads}
          onDismiss={() => {
            dismissRunRecap();
            navigate("/");
          }}
          onRerunSkipped={(queue) => {
            dismissRunRecap();
            startRun({ mode: lastRun.mode, origin: lastRun.origin, queue });
          }}
        />
      </main>
    );
  }

  // ── Nothing running ──────────────────────────────────────────────────────────
  if (!activeRun) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {header("Nothing in progress.")}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-6 py-14 text-center space-y-3">
          <p className="text-slate-400 text-base font-medium">
            No run in progress
          </p>
          <p className="text-slate-600 text-sm max-w-xs mx-auto">
            Start one from Today, or plan a route on the Territory Map and start
            it from there.
          </p>
          <div className="flex items-center justify-center gap-4 pt-1">
            <button
              onClick={() => navigate("/today")}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Today →
            </button>
            <button
              onClick={() => navigate("/map")}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Territory Map →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Active run ───────────────────────────────────────────────────────────────
  const total = activeRun.queue.length;
  const doneCount = Object.keys(activeRun.done || {}).length;
  const currentId = activeRun.queue[activeRun.cursor];
  const currentLead = leads.find((l) => l.id === currentId);

  // Stops still worth spending a generation on — done ones are behind you.
  const unpitched = activeRun.queue
    .filter((id) => !activeRun.done?.[id])
    .map((id) => leads.find((l) => l.id === id))
    .filter(needsPitch);

  const goToStop = (index) => {
    const lead = leads.find((l) => l.id === activeRun.queue[index]);
    if (!lead) return;
    setRunCursor(index);
    navigate(stopPathFor(activeRun.mode, lead));
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {header(
        `${RUN_MODE_LABELS[activeRun.mode] || "Run"} · started ${formatClock(activeRun.startedAt)}`,
      )}

      {/* Current stop */}
      <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 px-5 py-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
            Current stop
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {doneCount} of {total} logged
          </p>
        </div>
        <p className="text-slate-100 text-2xl font-semibold leading-tight">
          {currentLead ? currentLead.businessName : "Lead not found"}
        </p>
        {currentLead?.address && (
          <p className="text-slate-500 text-sm">{currentLead.address}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => goToStop(activeRun.cursor)}
            disabled={!currentLead}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Continue →
          </button>
          <button
            onClick={() => skipRunStop(currentId)}
            className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-4 py-2.5 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Prep the whole queue in one go. Batched server-side, so a seven-stop
          run is two requests rather than seven taps and seven waits. Never
          touches a stop that already has a pitch. */}
      {(unpitched.length > 0 || pitchBulk) && (
        <div className="flex items-center gap-3 rounded-xl border border-purple-900/40 bg-purple-950/10 px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
          {pitchBulk ? (
            <p className="text-slate-300 text-sm flex-1 animate-pulse">
              Writing pitches… {pitchBulk.done} of {pitchBulk.total}
            </p>
          ) : (
            <>
              <p className="text-slate-300 text-sm flex-1 min-w-0">
                {unpitched.length} stop{unpitched.length !== 1 ? "s" : ""}{" "}
                {unpitched.length !== 1 ? "have" : "has"} no pitch yet
              </p>
              <button
                onClick={() => generateMany(unpitched)}
                className="shrink-0 text-xs font-semibold text-purple-400 hover:text-purple-300 border border-purple-900/50 hover:border-purple-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Write {unpitched.length}
              </button>
            </>
          )}
        </div>
      )}

      {pitchError && <p className="text-xs text-red-400 px-1">{pitchError}</p>}

      {/* Queue */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Queue
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add lead
          </button>
        </div>

        <div className="space-y-2">
          {activeRun.queue.map((leadId, i) => {
            const lead = leads.find((l) => l.id === leadId);
            if (!lead) return null;
            const isDone = !!activeRun.done?.[leadId];
            const isSkipped = !isDone && !!activeRun.skipped?.[leadId];
            const isCurrent = i === activeRun.cursor;
            const outcome = activeRun.done?.[leadId]?.outcome;

            return (
              <div
                key={leadId}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 group transition-colors ${
                  isCurrent
                    ? "border-blue-700 bg-blue-950/25"
                    : isDone
                      ? "border-slate-800/40 bg-slate-900/10"
                      : "border-slate-800 bg-slate-900/30"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isDone
                      ? "bg-green-600 text-white"
                      : isCurrent
                        ? "bg-blue-600 text-white"
                        : "border-2 border-slate-700 text-slate-500"
                  }`}
                >
                  {isDone ? <CheckIcon className="w-3 h-3" /> : i + 1}
                </span>

                <button
                  onClick={() => goToStop(i)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p
                    className={`font-semibold text-base truncate ${
                      isDone ? "text-slate-500 line-through" : "text-slate-100"
                    }`}
                  >
                    {lead.businessName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isSkipped && (
                      <span className="text-xs text-amber-500 font-medium">
                        Skipped
                      </span>
                    )}
                    {outcome && (
                      <span
                        className={`text-xs font-medium ${OUTCOME_STYLES[outcome] || "text-slate-500"}`}
                      >
                        {outcome === "logged" ? "Logged" : outcome}
                      </span>
                    )}
                    {!isDone && !isSkipped && lead.phone && (
                      <span className="text-slate-600 text-xs">
                        {lead.phone}
                      </span>
                    )}
                  </div>
                </button>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[lead.status] || ""}`}
                >
                  {lead.status}
                </span>

                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => moveRunStop(leadId, -1)}
                    disabled={i === 0}
                    className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                  >
                    <UpIcon />
                  </button>
                  <button
                    onClick={() => moveRunStop(leadId, 1)}
                    disabled={i === total - 1}
                    className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                  >
                    <DownIcon />
                  </button>
                  <button
                    onClick={() => removeFromRun(leadId)}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors ml-0.5"
                  >
                    <XIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* End run */}
      <div className="pt-2">
        {confirmEnd ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-4 space-y-3">
            <p className="text-slate-300 text-sm">
              End this run? {total - doneCount} stop
              {total - doneCount !== 1 ? "s" : ""} still unworked. You'll get
              the recap and the leads stay exactly as they are.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmEnd(false)}
                className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Keep going
              </button>
              <button
                onClick={() => {
                  endRun();
                  setConfirmEnd(false);
                }}
                className="text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-lg transition-colors"
              >
                End run
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEnd(true)}
            className="w-full text-sm text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-600 py-2.5 rounded-xl transition-colors"
          >
            End run
          </button>
        )}
      </div>

      {showPicker && (
        <LeadPicker
          leads={leads}
          excludeIds={activeRun.queue}
          onAdd={(leadId) => addToRun(leadId)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </main>
  );
}
