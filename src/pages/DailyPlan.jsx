import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, OUTREACH_TYPES } from "../constants";

// ── Summary modal shown on first open if yesterday had checked leads ─────────────
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
          Start today's plan
        </button>
      </div>
    </div>
  );
}

// ── Log form shown after checking off a lead ─────────────────────────────────────
function LogForm({ lead, onLog, onSkip, onCancel }) {
  const [note, setNote] = useState("");
  const [type, setType] = useState("Phone Call");
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
              if (e.key === "Escape") onSkip();
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
          <button
            onClick={onSkip}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => onLog({ type, note })}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Log & Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lead picker ──────────────────────────────────────────────────────────────────
function LeadPicker({ leads, planLeadIds, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const available = leads.filter(
    (l) =>
      !planLeadIds.includes(l.id) &&
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
                : "All active leads are already in the plan."}
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
                <div>
                  <p className="text-slate-200 text-sm font-medium">
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

// ── Main page ────────────────────────────────────────────────────────────────────
export default function DailyPlan() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];
  const lastPlanDate = useCRMStore((s) => s.lastPlanDate);
  const lastPlanSummary = useCRMStore((s) => s.lastPlanSummary) ?? [];
  const {
    addToPlan,
    removeFromPlan,
    checkOffPlan,
    uncheckPlan,
    movePlanItem,
    clearDailyPlan,
    dismissPlanSummary,
  } = useCRMStore.getState();
  const logTouchpoint = useCRMStore.getState().logTouchpoint;

  const [showPicker, setShowPicker] = useState(false);
  const [logTarget, setLogTarget] = useState(null); // lead to log after check-off
  const [showSummary, setShowSummary] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // On mount — check if plan needs resetting and if summary should show
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

  const handleCheck = (item) => {
    const lead = leads.find((l) => l.id === item.leadId);
    if (!lead) return;
    setLogTarget({ item, lead });
  };

  const handleLog = ({ type, note }) => {
    if (note?.trim()) {
      logTouchpoint(logTarget.lead.id, { type, note });
    }
    checkOffPlan(logTarget.item.leadId);
    setLogTarget(null);
  };

  const handleSkip = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (logTarget.lead.lastTouchDate !== today) {
      logTouchpoint(logTarget.lead.id, { type: "Phone Call", note: "" });
    }
    checkOffPlan(logTarget.item.leadId);
    setLogTarget(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
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
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-slate-100">Daily Plan</h2>
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
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Lead
        </button>
      </div>

      {/* Empty state */}
      {dailyPlan.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-6 py-16 text-center space-y-3">
          <svg
            viewBox="0 0 200 160"
            className="w-36 h-28 mx-auto opacity-40"
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
            <circle cx="55" cy="60" r="5" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="55" cy="80" r="5" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="55" cy="100" r="5" stroke="#3b82f6" strokeWidth="1.5" />
          </svg>
          <p className="text-slate-400 text-base font-medium">
            No leads planned for today
          </p>
          <p className="text-slate-600 text-sm">
            Add leads you want to contact today, in the order you'll reach out.
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Add your first lead →
          </button>
        </div>
      )}

      {/* Pending leads */}
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
                {/* Check button */}
                <button
                  onClick={() => handleCheck(item)}
                  className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-blue-400 flex items-center justify-center shrink-0 transition-colors"
                />

                {/* Lead info */}
                <div className="flex-1 min-w-0">
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
                </div>

                {/* Status */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[lead.status] || ""}`}
                >
                  {lead.status}
                </span>

                {/* Reorder + remove */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => movePlanItem(item.leadId, -1)}
                    disabled={i === 0}
                    className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                  >
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
                  </button>
                  <button
                    onClick={() => movePlanItem(item.leadId, 1)}
                    disabled={i === pending.length - 1}
                    className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                  >
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
                  </button>
                  <button
                    onClick={() => removeFromPlan(item.leadId)}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors ml-0.5"
                  >
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
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checked leads */}
      {checked.length > 0 && (
        <div className="space-y-2">
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 text-white"
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

      {/* Modals */}
      {showPicker && (
        <LeadPicker
          leads={leads}
          planLeadIds={planLeadIds}
          onAdd={(leadId) => addToPlan(leadId)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {logTarget && (
        <LogForm
          lead={logTarget.lead}
          onLog={handleLog}
          onSkip={handleSkip}
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
    </div>
  );
}
