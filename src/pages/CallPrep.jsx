import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, OUTREACH_TYPES, stopPathFor } from "../constants";
import FinishStopModal, {
  INTEREST_OPTIONS,
} from "../components/FinishStopModal";
import GeneratedPitch from "../components/GeneratedPitch";
import useGeneratePitch from "../hooks/useGeneratePitch";

// ── Reused from LeadDetail ───────────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

const SPEED_STYLES = {
  bad: { bg: "bg-red-600", ring: "ring-red-400", label: "SLOW SITE" },
  warn: { bg: "bg-amber-600", ring: "ring-amber-400", label: "NEEDS WORK" },
  good: { bg: "bg-green-600", ring: "ring-green-400", label: "FAST SITE" },
};

// ── Big speed indicator ─────────────────────────────────────────────────────────
function SpeedFlashBanner({ cached }) {
  if (!cached) return null;
  const style = SPEED_STYLES[cached.status];
  return (
    <div
      className={`mx-6 mb-5 rounded-2xl ${style.bg} ring-4 ${style.ring} px-5 py-4 flex items-center justify-between shrink-0 shadow-lg`}
    >
      <div>
        <p className="text-white text-4xl font-black tabular-nums leading-none">
          {cached.lcp !== null ? `${cached.lcp}s` : "—"}
        </p>
        <p className="text-white/90 text-xs font-bold tracking-widest mt-1.5">
          {style.label} · LCP
        </p>
      </div>
      <div className="text-right">
        <p className="text-white text-3xl font-bold tabular-nums leading-none">
          {cached.score}
        </p>
        <p className="text-white/80 text-xs mt-1.5">Perf Score</p>
      </div>
    </div>
  );
}

// ── Win/Loss modal ───────────────────────────────────────────────────────────────
function WinLossModal({ status, leadName, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${status === "Closed" ? "bg-green-950" : "bg-red-950"}`}
          >
            {status === "Closed" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-green-400"
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
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-red-400"
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
            )}
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-base">
              {status === "Closed" ? "Mark as Closed 🎉" : "Mark as Dead"}
            </h3>
            <p className="text-slate-500 text-sm mt-0.5">{leadName}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {status === "Closed"
              ? "What closed the deal?"
              : "Why did this go dead?"}
            <span className="text-slate-700 font-normal normal-case ml-1">
              (optional)
            </span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(reason);
              if (e.key === "Escape") onCancel();
            }}
            placeholder={
              status === "Closed"
                ? "e.g. Loved the portfolio"
                : "e.g. Already has a developer"
            }
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className={`text-sm font-medium text-white px-5 py-2 rounded-lg transition-colors ${status === "Closed" ? "bg-green-700 hover:bg-green-600" : "bg-red-700 hover:bg-red-600"}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export default function CallPrep() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const pageSpeedCache = useCRMStore((s) => s.pageSpeedCache) ?? {};
  const activeRun = useCRMStore((s) => s.activeRun);

  // Actions come off getState() — the persist middleware strips functions during
  // hydration, so selecting them can hand back undefined after a refresh.
  const updateLead = useCRMStore.getState().updateLead;
  const logTouchpoint = useCRMStore.getState().logTouchpoint;
  const completeRunStop = useCRMStore.getState().completeRunStop;
  const skipRunStop = useCRMStore.getState().skipRunStop;
  const {
    generate: generatePitch,
    pendingId: pitchPending,
    error: pitchError,
  } = useGeneratePitch();

  const lead = leads.find((l) => l.id === id);

  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("Phone Call");
  const [noteLogged, setNoteLogged] = useState(false);
  const [winLoss, setWinLoss] = useState(null); // 'Closed' | 'Dead'
  const [showFinish, setShowFinish] = useState(false);

  // ── Timer ──────────────────────────────────────────────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const startTimer = () => {
    setTimerRunning(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    if (elapsed > 0) {
      logTouchpoint(id, {
        type: "Phone Call",
        note: `Call duration: ${formatDuration(elapsed)}`,
      });
      setNoteLogged(true);
      setTimeout(() => setNoteLogged(false), 2000);
    }
    setElapsed(0);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Reset transient state whenever the run jumps us to a new lead
  useEffect(() => {
    setShowFinish(false);
    setNote("");
    setWinLoss(null);
  }, [id]);

  if (!lead) {
    return (
      <div className="fixed inset-0 bg-[#03060f] flex items-center justify-center">
        <p className="text-slate-500">Lead not found.</p>
      </div>
    );
  }

  // ── Run context ───────────────────────────────────────────────────────────────
  const runIndex = activeRun ? activeRun.queue.indexOf(lead.id) : -1;
  const inRun = runIndex !== -1;
  const runTotal = activeRun ? activeRun.queue.length : 0;

  const lastNote = lead.notesLog?.length
    ? [...lead.notesLog].reverse()[0]
    : null;

  const handleLogNote = () => {
    if (!note.trim()) return;
    logTouchpoint(id, { type: noteType, note });
    setNote("");
    setNoteLogged(true);
    setTimeout(() => setNoteLogged(false), 2000);
  };

  const handleQuickStatus = (status) => {
    if (status === "Closed" || status === "Dead") {
      setWinLoss(status);
    } else {
      updateLead(id, { status });
    }
  };

  const handleWinLossConfirm = (reason) => {
    updateLead(id, { status: winLoss, followUpDate: "" });
    if (reason?.trim()) {
      logTouchpoint(id, {
        type: "Phone Call",
        note: `[${winLoss}] ${reason.trim()}`,
      });
    }
    setWinLoss(null);
  };

  // Same contract as Pitch Mode: the store owns the cursor, we read it back.
  const goToNextStop = () => {
    const {
      activeRun: runAfter,
      lastRun,
      leads: freshLeads,
    } = useCRMStore.getState();
    if (runAfter) {
      const nextLead = freshLeads.find(
        (l) => l.id === runAfter.queue[runAfter.cursor],
      );
      navigate(stopPathFor(runAfter.mode, nextLead));
      return;
    }
    if (lastRun) {
      navigate("/run");
      return;
    }
    navigate("/today");
  };

  const handleSkipStop = () => {
    skipRunStop(lead.id);
    goToNextStop();
  };

  const handleFinish = ({ interested, followUpDate, notes, nextAction }) => {
    const opt = INTEREST_OPTIONS.find((o) => o.key === interested);

    updateLead(lead.id, {
      status: opt.status,
      followUpDate: followUpDate || "",
    });

    const parts = [];
    if (notes.trim()) parts.push(notes.trim());
    if (nextAction.trim()) parts.push(`Next: ${nextAction.trim()}`);
    if (parts.length > 0) {
      logTouchpoint(lead.id, {
        type: "Phone Call",
        note: `[Call: ${interested}] ${parts.join(" — ")}`,
      });
    } else {
      logTouchpoint(lead.id, { type: "Phone Call", note: "" });
    }

    setShowFinish(false);
    completeRunStop(lead.id, interested);
    goToNextStop();
  };

  const QUICK_STATUSES = ["Warm", "Waiting", "Contacted", "Closed", "Dead"];

  return (
    <div className="z-50 fixed inset-0 bg-[#03060f] flex flex-col overflow-hidden">
      {/* The wrapper has to be a full-height flex column with min-h-0, or the
          scroll container below never gets a bounded height and the outer
          overflow-hidden just clips the overflow. That was the cut-off. */}
      <div className="w-full max-w-3xl mx-auto flex-1 min-h-0 flex flex-col px-4 sm:px-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 shrink-0">
          <button
            onClick={() =>
              inRun
                ? navigate("/run")
                : navigate(`/lead/${id}`, { state: location.state })
            }
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
          <span className="text-xs text-slate-600 uppercase tracking-widest font-medium">
            Call Prep
            {inRun && (
              <span className="normal-case tracking-normal">
                {" "}
                · stop {runIndex + 1} of {runTotal}
              </span>
            )}
          </span>
          <div className="w-9" /> {/* spacer */}
        </div>

        {/* Everything under the header scrolls as one column. On a small phone
            the lead block plus the speed banner can fill the viewport on their
            own, so splitting this into a fixed top half and a scrolling bottom
            half is what stranded content off-screen. */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Lead info */}
          <div className="px-6 pb-6 shrink-0">
            <h1 className="text-3xl font-bold text-slate-100 leading-tight">
              {lead.businessName}
            </h1>
            {lead.ownerName && (
              <p className="text-slate-400 text-lg mt-1">{lead.ownerName}</p>
            )}

            {/* Phone — tappable */}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-2 mt-3 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                <span className="text-xl font-medium">{lead.phone}</span>
              </a>
            )}

            {/* Status + strength */}
            <div className="flex items-center gap-3 mt-4">
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}
              >
                {lead.status}
              </span>
              <span className="text-amber-400 text-base">
                {"★".repeat(lead.strength)}
                <span className="text-slate-700">
                  {"★".repeat(5 - lead.strength)}
                </span>
              </span>
              {lead.address && (
                <span className="text-slate-600 text-sm truncate">
                  {lead.address}
                </span>
              )}
            </div>
          </div>

          {/* Site speed — big flash indicator */}
          <SpeedFlashBanner
            cached={lead.website ? pageSpeedCache[lead.website.trim()] : null}
          />

          {/* Last note */}
          {lastNote && (
            <div className="mx-6 mb-5 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 shrink-0">
              <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">
                Last note
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {lastNote.text}
              </p>
              <p className="text-slate-700 text-xs mt-1">{lastNote.ts}</p>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-slate-800 mx-6 shrink-0" />

          <div
            className="px-6 py-5 space-y-5"
            style={{
              paddingBottom: inRun
                ? "1.25rem"
                : "max(2rem, env(safe-area-inset-bottom))",
            }}
          >
            {/* The script, first thing under the fold. On a call you can read it
              straight off the screen, which is the one place that's allowed —
              so it sits above the timer and the log controls. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  This Lead's Pitch
                </p>
                {!pitchPending && (
                  <button
                    onClick={() => generatePitch(lead)}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {lead.generatedPitch ? "Rewrite" : "Write one"}
                  </button>
                )}
              </div>

              {pitchError && (
                <p className="text-xs text-red-400">{pitchError}</p>
              )}

              {pitchPending === lead.id ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-6 text-center">
                  <p className="text-slate-500 text-sm animate-pulse">
                    Writing a pitch from this lead's history…
                  </p>
                </div>
              ) : lead.generatedPitch ? (
                <GeneratedPitch lead={lead} compact />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-5 text-center space-y-1">
                  <p className="text-slate-500 text-sm">
                    No pitch written for {lead.businessName} yet.
                  </p>
                  <p className="text-slate-700 text-xs">
                    Prep a whole run at once from the run screen.
                  </p>
                </div>
              )}
            </div>

            {/* Timer */}
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                timerRunning
                  ? "border-red-900/60 bg-red-950/20"
                  : "border-slate-800 bg-slate-900/20"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 shrink-0 ${timerRunning ? "text-red-400" : "text-slate-600"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              {timerRunning ? (
                <>
                  <span className="text-red-400 font-mono text-lg font-semibold tabular-nums flex-1">
                    {formatDuration(elapsed)}
                  </span>
                  <button
                    onClick={stopTimer}
                    className="text-sm font-medium bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Stop & Log
                  </button>
                </>
              ) : (
                <>
                  <span className="text-slate-500 text-sm flex-1">
                    Call timer
                  </span>
                  <button
                    onClick={startTimer}
                    className="text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Start
                  </button>
                </>
              )}
            </div>

            {/* Quick note */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                Log note
              </p>
              <div className="flex gap-2">
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="bg-slate-800/60 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors shrink-0"
                >
                  {OUTREACH_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogNote();
                  }}
                  placeholder="What happened?"
                  className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={handleLogNote}
                  disabled={!note.trim()}
                  className={`shrink-0 text-sm font-medium px-4 py-2.5 rounded-lg transition-all ${
                    noteLogged
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                  }`}
                >
                  {noteLogged ? "✓" : "Log"}
                </button>
              </div>
            </div>

            {/* Quick status */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                Quick status
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleQuickStatus(s)}
                    className={`text-sm px-4 py-2 rounded-xl font-medium border transition-colors ${
                      lead.status === s
                        ? `${STATUS_COLORS[s]} border-white/20`
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 bg-slate-900/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Finish stop — pinned, like Pitch Mode's. Only inside a run; outside
            one Call Prep behaves exactly as it always has. */}
        {inRun && (
          <div
            className="px-6 pt-3 border-t border-slate-800 shrink-0 space-y-2"
            style={{
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
            }}
          >
            <button
              onClick={() => setShowFinish(true)}
              className="w-full bg-green-700 hover:bg-green-600 text-white text-base font-semibold py-3.5 rounded-xl transition-colors"
            >
              Finish Call
            </button>
            {runTotal > 1 && (
              <button
                onClick={handleSkipStop}
                className="w-full text-sm text-slate-500 hover:text-slate-300 py-1.5 transition-colors"
              >
                No answer — skip to next stop
              </button>
            )}
          </div>
        )}

        {/* Win/loss overlay */}
        {winLoss && (
          <WinLossModal
            status={winLoss}
            leadName={lead.businessName}
            onConfirm={handleWinLossConfirm}
            onCancel={() => setWinLoss(null)}
          />
        )}

        {showFinish && (
          <FinishStopModal
            lead={lead}
            kind="call"
            onSave={handleFinish}
            onCancel={() => setShowFinish(false)}
          />
        )}
      </div>
    </div>
  );
}
