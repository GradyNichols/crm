import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import {
  STATUS_COLORS,
  OUTREACH_TYPES,
  RUN_MODES,
  RUN_MODE_LABELS,
  stopPathFor,
} from "../constants";
import useGeneratePitch, { needsPitch } from "../hooks/useGeneratePitch";

// ── Today ───────────────────────────────────────────────────────────────────────
// Replaces DailyPlan.jsx and Checklist.jsx. Those were two "today" pages — one
// computed (what's due), one curated (what you chose) — and picking between them
// cost a decision every morning for nothing. They're now two sections of one
// page: Due is the source, Today's plan is the queue, and a run executes it.

const todayStr = () => new Date().toISOString().slice(0, 10);

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

function ChevronIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-4 h-4 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

// ── Yesterday's recap ───────────────────────────────────────────────────────────
function SummaryModal({ summary, leads, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-base">
              Yesterday's recap
            </h3>
            <p className="text-slate-500 text-sm mt-0.5">
              You contacted {summary.length} lead
              {summary.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {summary.map((item) => {
            const lead = leads.find((l) => l.id === item.leadId);
            if (!lead) return null;
            const lastNote = lead.notesLog?.length
              ? [...lead.notesLog].reverse()[0]
              : null;
            return (
              <div
                key={item.leadId}
                className="rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-200 text-sm font-medium">
                    {lead.businessName}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || ""}`}
                  >
                    {lead.status}
                  </span>
                </div>
                {lastNote && (
                  <p className="text-slate-600 text-xs mt-1 truncate">
                    "{lastNote.text}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={onDismiss}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Start today
        </button>
      </div>
    </div>
  );
}

// ── One logging UI for the whole page ───────────────────────────────────────────
// Both "log this due lead without planning it" and "check this planned stop off"
// open the same sheet. Two different-looking log controls on one page was half
// of why Checklist and Daily Plan felt like different tools.
function LogForm({ lead, onLog, onSkip, onCancel }) {
  const [note, setNote] = useState("");
  const [type, setType] = useState(lead.type || "Phone Call");
  const inputRef = useRef(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl p-6 space-y-4">
        <div>
          <h3 className="text-slate-100 font-semibold text-base">
            {lead.businessName}
          </h3>
          <p className="text-slate-500 text-sm mt-0.5">
            Log what happened (optional)
          </p>
        </div>
        <div className="space-y-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {OUTREACH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            ref={inputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLog({ type, note });
              if (e.key === "Escape") onCancel();
            }}
            placeholder="What happened?"
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-slate-600 hover:text-slate-400 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={() => onLog({ type, note })}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Log &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Start Run sheet ─────────────────────────────────────────────────────────────
function StartRunSheet({ count, onStart, onCancel }) {
  return (
    <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 px-5 py-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
          Start a run
        </p>
        <p className="text-slate-400 text-sm mt-1">
          {count} stop{count !== 1 ? "s" : ""}, in the order below. How are you
          working them?
        </p>
      </div>
      <div className="space-y-2">
        {RUN_MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => onStart(m.key)}
            className="w-full text-left rounded-xl border border-slate-700 hover:border-blue-600 bg-slate-900/40 px-4 py-3 transition-colors group"
          >
            <p className="text-slate-100 text-sm font-semibold group-hover:text-blue-300 transition-colors">
              {m.label}
            </p>
            <p className="text-slate-600 text-xs mt-0.5">{m.hint}</p>
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
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
                : "All active leads are already in today's plan."}
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

// ── Due row ─────────────────────────────────────────────────────────────────────
function DueRow({ lead, today, onAdd, onLog, onOpen }) {
  const done = lead.lastTouchDate === today;
  const overdue = lead.followUpDate && lead.followUpDate < today;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        done
          ? "border-slate-800/40 bg-slate-900/10 opacity-50"
          : "border-slate-800 bg-slate-900/30"
      }`}
    >
      <button
        onClick={() => onOpen(lead.id)}
        className="flex-1 min-w-0 text-left"
      >
        <p
          className={`font-semibold text-base truncate ${done ? "line-through text-slate-600" : "text-slate-100"}`}
        >
          {lead.businessName}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {lead.ownerName && (
            <span className="text-slate-500 text-xs">{lead.ownerName}</span>
          )}
          {lead.phone && (
            <span className="text-slate-600 text-xs">{lead.phone}</span>
          )}
          {overdue && !done && (
            <span className="text-xs text-red-400 font-medium">Overdue</span>
          )}
          {done && <span className="text-xs text-green-500">Logged today</span>}
        </div>
      </button>

      <span
        className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[lead.status] || ""}`}
      >
        {lead.status}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onLog(lead)}
          className="text-xs text-slate-500 hover:text-slate-200 border border-slate-800 hover:border-slate-600 px-2.5 py-1.5 rounded-lg transition-colors"
          title="Log a touchpoint without planning it"
        >
          Log
        </button>
        <button
          onClick={() => onAdd(lead.id)}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 border border-blue-900/50 hover:border-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
          title="Add to today's plan"
        >
          + Today
        </button>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function Today() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];
  const lastPlanDate = useCRMStore((s) => s.lastPlanDate);
  const lastPlanSummary = useCRMStore((s) => s.lastPlanSummary) ?? [];
  const activeRun = useCRMStore((s) => s.activeRun);

  // Actions off getState() — persist strips functions during hydration.
  const addToPlan = useCRMStore.getState().addToPlan;
  const removeFromPlan = useCRMStore.getState().removeFromPlan;
  const checkOffPlan = useCRMStore.getState().checkOffPlan;
  const uncheckPlan = useCRMStore.getState().uncheckPlan;
  const movePlanItem = useCRMStore.getState().movePlanItem;
  const clearDailyPlan = useCRMStore.getState().clearDailyPlan;
  const dismissPlanSummary = useCRMStore.getState().dismissPlanSummary;
  const logTouchpoint = useCRMStore.getState().logTouchpoint;
  const startRun = useCRMStore.getState().startRun;

  const [showPicker, setShowPicker] = useState(false);
  const [logTarget, setLogTarget] = useState(null); // { lead, planItem? }
  const [showSummary, setShowSummary] = useState(false);
  const [choosingMode, setChoosingMode] = useState(false);
  const [dueFilter, setDueFilter] = useState("due"); // "due" | "all"
  const [dueOpen, setDueOpen] = useState(null); // null = follow the default
  const {
    generateMany,
    bulk: pitchBulk,
    error: pitchError,
  } = useGeneratePitch();

  const today = todayStr();

  // Rollover safety net. App.jsx runs this once per load; this catches a session
  // left open across midnight that then lands here.
  useEffect(() => {
    if (lastPlanDate && lastPlanDate < today) {
      clearDailyPlan(today);
    }
    if (lastPlanSummary.length > 0) {
      setShowSummary(true);
    }
  }, []);

  const pending = dailyPlan.filter((item) => !item.checkedAt);
  const checked = dailyPlan.filter((item) => !!item.checkedAt);
  const planLeadIds = dailyPlan.map((i) => i.leadId);

  // Prepping here rather than on the run screen means doing it in the morning
  // over wifi instead of in a parking lot on 4G.
  const unpitched = pending
    .map((i) => leads.find((l) => l.id === i.leadId))
    .filter(needsPitch);

  // Anything already in the plan has been triaged — it belongs to the queue
  // below, not to the source list above.
  const dueLeads = leads
    .filter((l) => !["Closed", "Dead"].includes(l.status))
    .filter((l) => !planLeadIds.includes(l.id))
    .filter(
      (l) => dueFilter === "all" || (l.followUpDate && l.followUpDate <= today),
    )
    .sort((a, b) => {
      if (a.followUpDate && b.followUpDate)
        return a.followUpDate.localeCompare(b.followUpDate);
      if (a.followUpDate) return -1;
      if (b.followUpDate) return 1;
      return 0;
    });

  const untriaged = dueLeads.filter((l) => l.lastTouchDate !== today);
  // Collapses itself once there's nothing left to triage, and stays wherever
  // you last put it after that.
  const isDueOpen = dueOpen === null ? untriaged.length > 0 : dueOpen;

  const handleAddAll = () => {
    untriaged.forEach((l) => addToPlan(l.id));
    setDueOpen(false);
  };

  const handleLog = ({ type, note }) => {
    if (note?.trim()) {
      logTouchpoint(logTarget.lead.id, { type, note });
    } else if (logTarget.lead.lastTouchDate !== today) {
      logTouchpoint(logTarget.lead.id, { type, note: "" });
    }
    if (logTarget.planItem) checkOffPlan(logTarget.planItem.leadId);
    setLogTarget(null);
  };

  const handleSkipLog = () => {
    if (logTarget.lead.lastTouchDate !== today) {
      logTouchpoint(logTarget.lead.id, {
        type: logTarget.lead.type || "Phone Call",
        note: "",
      });
    }
    if (logTarget.planItem) checkOffPlan(logTarget.planItem.leadId);
    setLogTarget(null);
  };

  const handleStartRun = (mode) => {
    const queue = pending.map((i) => i.leadId);
    const run = startRun({ mode, origin: "plan", queue });
    setChoosingMode(false);
    if (!run) return;
    const first = leads.find((l) => l.id === run.queue[0]);
    navigate(stopPathFor(mode, first));
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-slate-100">Today</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="shrink-0 border border-slate-700 hover:border-slate-500 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Lead
        </button>
      </div>

      {/* ── Due ─────────────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDueOpen(!isDueOpen)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronIcon open={isDueOpen} />
            <span className="text-xs font-semibold uppercase tracking-widest">
              {dueFilter === "due" ? "Due" : "Active"} · {dueLeads.length}
            </span>
            {untriaged.length > 0 && !isDueOpen && (
              <span className="text-xs text-blue-400 font-medium normal-case tracking-normal">
                {untriaged.length} to triage
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                // Asking to see more is an explicit request to look at the
                // list, so widening the filter reopens a collapsed section.
                setDueFilter(dueFilter === "due" ? "all" : "due");
                setDueOpen(true);
              }}
              className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
            >
              {dueFilter === "due" ? "Show all active" : "Show due only"}
            </button>
            {isDueOpen && untriaged.length > 0 && (
              <button
                onClick={handleAddAll}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Add all {untriaged.length}
              </button>
            )}
          </div>
        </div>

        {isDueOpen &&
          (dueLeads.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-6 text-center">
              <p className="text-slate-500 text-sm">
                {dueFilter === "due"
                  ? "Nothing due today."
                  : "No active leads outside today's plan."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dueLeads.map((lead) => (
                <DueRow
                  key={lead.id}
                  lead={lead}
                  today={today}
                  onAdd={addToPlan}
                  onLog={(l) => setLogTarget({ lead: l })}
                  onOpen={(leadId) =>
                    navigate(`/lead/${leadId}`, { state: { from: "/today" } })
                  }
                />
              ))}
            </div>
          ))}
      </section>

      {/* ── Today's plan ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Today's plan · {pending.length}
          </p>
          {checked.length > 0 && (
            <p className="text-xs text-slate-600">{checked.length} done</p>
          )}
        </div>

        {/* Prep the plan's scripts in one batched pass */}
        {(unpitched.length > 0 || pitchBulk) && (
          <div className="flex items-center gap-3 rounded-xl border border-purple-900/40 bg-purple-950/10 px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
            {pitchBulk ? (
              <p className="text-slate-300 text-sm flex-1 animate-pulse">
                Writing pitches… {pitchBulk.done} of {pitchBulk.total}
              </p>
            ) : (
              <>
                <p className="text-slate-300 text-sm flex-1 min-w-0">
                  {unpitched.length} without a pitch
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

        {pitchError && (
          <p className="text-xs text-red-400 px-1">{pitchError}</p>
        )}

        {/* Run controls */}
        {activeRun ? (
          <div className="flex items-center gap-3 rounded-xl border border-blue-900/50 bg-blue-950/20 px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <p className="text-slate-300 text-sm flex-1 min-w-0 truncate">
              {RUN_MODE_LABELS[activeRun.mode] || "Run"} in progress —{" "}
              <span className="text-slate-500">
                {Object.keys(activeRun.done || {}).length} of{" "}
                {activeRun.queue.length} logged
              </span>
            </p>
            <button
              onClick={() => navigate("/run")}
              className="shrink-0 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open run →
            </button>
          </div>
        ) : choosingMode ? (
          <StartRunSheet
            count={pending.length}
            onStart={handleStartRun}
            onCancel={() => setChoosingMode(false)}
          />
        ) : (
          pending.length > 0 && (
            <button
              onClick={() => setChoosingMode(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold py-3 rounded-xl transition-colors"
            >
              Start run · {pending.length} stop
              {pending.length !== 1 ? "s" : ""}
            </button>
          )
        )}

        {/* Empty plan */}
        {dailyPlan.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-6 py-12 text-center space-y-3">
            <svg
              viewBox="0 0 200 160"
              className="w-32 h-24 mx-auto opacity-40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="40"
                y="20"
                width="120"
                height="120"
                rx="10"
                stroke="#1e293b"
                strokeWidth="2"
              />
              <line
                x1="65"
                y1="60"
                x2="135"
                y2="60"
                stroke="#1e293b"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="65"
                y1="80"
                x2="115"
                y2="80"
                stroke="#1e293b"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="65"
                y1="100"
                x2="125"
                y2="100"
                stroke="#1e293b"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="55"
                cy="60"
                r="5"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <circle
                cx="55"
                cy="80"
                r="5"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <circle
                cx="55"
                cy="100"
                r="5"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
            </svg>
            <p className="text-slate-400 text-base font-medium">
              Nothing planned yet
            </p>
            <p className="text-slate-600 text-sm">
              {untriaged.length > 0
                ? `Pull from the ${untriaged.length} due above, or add any lead.`
                : "Add the leads you want to work today, in order."}
            </p>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((item, i) => {
              const lead = leads.find((l) => l.id === item.leadId);
              if (!lead) return null;
              return (
                <div
                  key={item.leadId}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 group"
                >
                  <button
                    onClick={() => setLogTarget({ lead, planItem: item })}
                    className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-blue-400 flex items-center justify-center shrink-0 transition-colors"
                    title="Check off"
                  />

                  <button
                    onClick={() =>
                      navigate(`/lead/${lead.id}`, {
                        state: { from: "/today" },
                      })
                    }
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-slate-100 font-semibold text-base truncate">
                      {lead.businessName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lead.ownerName && (
                        <span className="text-slate-500 text-xs">
                          {lead.ownerName}
                        </span>
                      )}
                      {lead.phone && (
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
                      onClick={() => movePlanItem(item.leadId, -1)}
                      disabled={i === 0}
                      className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                    >
                      <UpIcon />
                    </button>
                    <button
                      onClick={() => movePlanItem(item.leadId, 1)}
                      disabled={i === pending.length - 1}
                      className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                    >
                      <DownIcon />
                    </button>
                    <button
                      onClick={() => removeFromPlan(item.leadId)}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Done */}
        {checked.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Done ({checked.length})
            </p>
            {checked.map((item) => {
              const lead = leads.find((l) => l.id === item.leadId);
              if (!lead) return null;
              return (
                <div
                  key={item.leadId}
                  className="flex items-center gap-3 rounded-xl border border-slate-800/40 bg-slate-900/10 px-4 py-3 opacity-80"
                >
                  <div className="w-6 h-6 rounded-full bg-green-600 border-2 border-green-600 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-slate-500 text-base line-through flex-1 truncate">
                    {lead.businessName}
                  </p>
                  <button
                    onClick={() => uncheckPlan(item.leadId)}
                    className="text-xs text-slate-600 hover:text-slate-300 border border-slate-800 hover:border-slate-600 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                    title="Undo"
                  >
                    Undo
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      {showPicker && (
        <LeadPicker
          leads={leads}
          excludeIds={planLeadIds}
          onAdd={(leadId) => addToPlan(leadId)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {logTarget && (
        <LogForm
          lead={logTarget.lead}
          onLog={handleLog}
          onSkip={logTarget.planItem ? handleSkipLog : undefined}
          onCancel={() => setLogTarget(null)}
        />
      )}

      {showSummary && (
        <SummaryModal
          summary={lastPlanSummary}
          leads={leads}
          onDismiss={() => {
            dismissPlanSummary();
            setShowSummary(false);
          }}
        />
      )}
    </main>
  );
}
