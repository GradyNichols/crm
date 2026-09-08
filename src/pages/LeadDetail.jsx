import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import {
  STATUS_COLORS,
  OUTREACH_TYPES,
  RUN_MODE_LABELS,
  stopPathFor,
} from "../constants";
import LeadModal from "../components/LeadModal";
import QueueButton from "../components/QueueButton";
import GeneratedPitch from "../components/GeneratedPitch";
import useGeneratePitch from "../hooks/useGeneratePitch";

function StarRating({ value }) {
  return (
    <span className="text-amber-400 text-lg tracking-tight">
      {"★".repeat(value)}
      <span className="text-slate-700">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-slate-200 text-sm">{value}</p>
    </div>
  );
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

const SPEED_STYLES = {
  bad: {
    bg: "bg-red-950/40",
    border: "border-red-800",
    text: "text-red-400",
    label: "SLOW",
  },
  warn: {
    bg: "bg-amber-950/30",
    border: "border-amber-800",
    text: "text-amber-400",
    label: "NEEDS WORK",
  },
  good: {
    bg: "bg-green-950/30",
    border: "border-green-800",
    text: "text-green-400",
    label: "FAST",
  },
};

function PageSpeedPanel({ website, cached, onCheck, checking, error }) {
  if (!website) return null;

  const style = cached ? SPEED_STYLES[cached.status] : null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Site Speed
        </p>
        <button
          onClick={onCheck}
          disabled={checking}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {checking ? "Checking…" : cached ? "Re-check" : "Check Speed"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {cached && !checking && (
        <div
          className={`rounded-xl border-2 ${style.border} ${style.bg} px-5 py-4 flex items-center justify-between`}
        >
          <div>
            <p className={`text-3xl font-black tabular-nums ${style.text}`}>
              {cached.lcp !== null ? `${cached.lcp}s` : "—"}
            </p>
            <p
              className={`text-xs font-bold tracking-widest mt-1 ${style.text}`}
            >
              {style.label} · LCP
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums ${style.text}`}>
              {cached.score}
            </p>
            <p className="text-xs text-slate-600 mt-1">Perf Score</p>
          </div>
        </div>
      )}

      {cached && !checking && (
        <p className="text-xs text-slate-700">
          Checked{" "}
          {new Date(cached.checkedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      )}

      {!cached && !checking && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-4 text-center">
          <p className="text-slate-600 text-sm">No speed data yet.</p>
        </div>
      )}

      {checking && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-6 text-center">
          <p className="text-slate-500 text-sm animate-pulse">
            Running PageSpeed check…
          </p>
        </div>
      )}
    </section>
  );
}

// ── Queue strip ─────────────────────────────────────────────────────────────────
// Where this lead sits in the day, and the one action that follows from it.
// Mid-run it talks about the run; otherwise it talks about today's plan.
// Adding appends rather than jumping the line — reordering is one tap away on
// /run or /today, and silently reshuffling a drive you're mid-way through is the
// worse default.
function QueueStrip({
  lead,
  activeRun,
  inPlan,
  onOpenRun,
  onOpenToday,
  onGoToStop,
}) {
  const index = activeRun ? activeRun.queue.indexOf(lead.id) : -1;
  const inRun = index !== -1;
  const isDone = !!activeRun?.done?.[lead.id];

  const accent = activeRun
    ? "border-blue-900/50 bg-blue-950/20"
    : inPlan
      ? "border-slate-800 bg-slate-900/30"
      : "border-slate-800/60 bg-slate-900/20";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${accent}`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          activeRun ? "bg-blue-400" : inPlan ? "bg-slate-500" : "bg-slate-700"
        }`}
      />
      <p className="text-slate-300 text-sm flex-1 min-w-0 truncate">
        {activeRun ? (
          inRun ? (
            <>
              Stop {index + 1} of {activeRun.queue.length}
              {isDone && <span className="text-green-400"> · logged</span>}
            </>
          ) : (
            <>
              {RUN_MODE_LABELS[activeRun.mode] || "Run"} in progress
              <span className="text-slate-500"> · this lead isn't in it</span>
            </>
          )
        ) : inPlan ? (
          <>On today's plan</>
        ) : (
          <span className="text-slate-500">Not on today's list</span>
        )}
      </p>

      {activeRun && inRun ? (
        <button
          onClick={() => onGoToStop(index)}
          className="shrink-0 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isDone ? "Open run →" : "Work this stop →"}
        </button>
      ) : (
        <>
          <QueueButton leadId={lead.id} size="compact" />
          <button
            onClick={activeRun ? onOpenRun : onOpenToday}
            className="shrink-0 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Open
          </button>
        </>
      )}
    </div>
  );
}

function CallTimer({ onLog }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const start = () => {
    setRunning(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (elapsed > 0) onLog(elapsed);
    setElapsed(0);
  };

  const cancel = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
        running
          ? "border-red-900/60 bg-red-950/20"
          : "border-slate-800 bg-slate-900/20"
      }`}
    >
      {/* Timer icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`w-4 h-4 shrink-0 ${running ? "text-red-400" : "text-slate-600"}`}
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

      {running ? (
        <>
          <span className="text-red-400 font-mono text-sm font-medium tabular-nums min-w-[3.5rem]">
            {formatDuration(elapsed)}
          </span>
          <button
            onClick={stop}
            className="text-xs font-medium bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors"
          >
            Stop & Log
          </button>
          <button
            onClick={cancel}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-slate-600 text-sm">Call timer</span>
          <button
            onClick={start}
            className="text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded-lg transition-colors"
          >
            Start
          </button>
        </>
      )}
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Where the back button should go — honors the origin passed via router
  // state, falling back to the dashboard. Never uses history, so nested
  // pages (Call Prep / Pitch Mode) can't create a back-navigation loop.
  const backTo = location.state?.from || "/";
  const leads = useCRMStore((s) => s.leads) ?? [];
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];
  const geocache = useCRMStore((s) => s.geocache) ?? {};
  const pageSpeedCache = useCRMStore((s) => s.pageSpeedCache) ?? {};
  const activeRun = useCRMStore((s) => s.activeRun);
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];

  // Actions off getState() — persist strips functions during hydration, so
  // selecting them can hand back undefined after a refresh.
  const updateLead = useCRMStore.getState().updateLead;
  const deleteNoteEntry = useCRMStore.getState().deleteNoteEntry;
  const logTouchpoint = useCRMStore.getState().logTouchpoint;
  const setPageSpeed = useCRMStore.getState().setPageSpeed;
  const setRunCursor = useCRMStore.getState().setRunCursor;
  const clearLeadPitch = useCRMStore.getState().clearLeadPitch;
  const {
    generate: generatePitch,
    pendingId: pitchPending,
    error: pitchError,
  } = useGeneratePitch();

  const lead = leads.find((l) => l.id === id);

  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("Phone Call");
  const [noteAdded, setNoteAdded] = useState(false);
  const [speedChecking, setSpeedChecking] = useState(false);
  const [speedError, setSpeedError] = useState("");

  if (!lead) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-slate-500 text-base">Lead not found.</p>
        <button
          onClick={() => navigate("/")}
          className="text-blue-400 text-sm mt-3 hover:text-blue-300 transition-colors"
        >
          ← Back to dashboard
        </button>
      </main>
    );
  }

  const handleAddNote = () => {
    if (!note.trim()) return;
    logTouchpoint(lead.id, { type: noteType, note });
    setNote("");
    setNoteAdded(true);
    setTimeout(() => setNoteAdded(false), 2000);
  };

  const handleTimerLog = (seconds) => {
    const duration = formatDuration(seconds);
    logTouchpoint(lead.id, {
      type: "Phone Call",
      note: `Call duration: ${duration}`,
    });
    setNoteAdded(true);
    setTimeout(() => setNoteAdded(false), 2000);
  };

  const handleSave = (form) => {
    updateLead(lead.id, form);
    setShowModal(false);
  };

  const handleCheckSpeed = async () => {
    if (!lead.website?.trim()) return;
    setSpeedChecking(true);
    setSpeedError("");
    try {
      const res = await fetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lead.website.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setPageSpeed(lead.website.trim(), data);
    } catch (err) {
      setSpeedError(err.message);
    } finally {
      setSpeedChecking(false);
    }
  };

  const handleGoToStop = (index) => {
    const run = useCRMStore.getState().activeRun;
    if (!run) return;
    if (run.done?.[lead.id]) {
      navigate("/run");
      return;
    }
    setRunCursor(index);
    navigate(stopPathFor(run.mode, lead));
  };

  const notesLog = [...(lead.notesLog || [])].reverse();

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(backTo)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors mt-1 shrink-0"
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
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold text-slate-100 leading-tight">
              {lead.businessName}
            </h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}
              >
                {lead.status}
              </span>
              <StarRating value={lead.strength} />
              <span className="text-slate-600 text-sm">{lead.type}</span>
              {lead.groupId && groups.find((g) => g.id === lead.groupId) && (
                <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full">
                  {groups.find((g) => g.id === lead.groupId).name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() =>
              navigate(`/pitch/${lead.id}`, { state: location.state })
            }
            className="shrink-0 text-sm text-purple-400 hover:text-purple-300 border border-purple-900/50 hover:border-purple-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
              />
            </svg>
            Pitch
          </button>
          <button
            onClick={() =>
              navigate(`/call/${lead.id}`, { state: location.state })
            }
            className="shrink-0 text-sm text-green-400 hover:text-green-300 border border-green-900/50 hover:border-green-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
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
            Call
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 text-sm text-blue-400 hover:text-blue-300 border border-blue-900/50 hover:border-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Where this lead sits in the day */}
        <QueueStrip
          lead={lead}
          activeRun={activeRun}
          inPlan={dailyPlan.some((i) => i.leadId === lead.id)}
          onOpenRun={() => navigate("/run")}
          onOpenToday={() => navigate("/today")}
          onGoToStop={handleGoToStop}
        />

        {/* Contact info */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Owner" value={lead.ownerName} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Email" value={lead.email} />
          <Field label="Address" value={lead.address} />
          {lead.website && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Website
              </p>
              <a
                href={
                  lead.website.startsWith("http")
                    ? lead.website
                    : `https://${lead.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors break-all"
              >
                {lead.website} ↗
              </a>
            </div>
          )}
          {lead.address && geocache[lead.address] === null && (
            <div className="col-span-full">
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
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
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                Address not found on OpenStreetMap —
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  open in Google Maps ↗
                </a>
              </p>
            </div>
          )}
          <Field label="Last Touch" value={lead.lastTouchDate} />
          <Field
            label="Follow-up"
            value={
              lead.followUpDate
                ? lead.followUpDate < new Date().toISOString().slice(0, 10)
                  ? `${lead.followUpDate} — overdue`
                  : lead.followUpDate
                : null
            }
          />
        </section>

        {/* Custom columns */}
        {customColumns.length > 0 &&
          customColumns.some(
            (c) => lead[c.id] !== undefined && lead[c.id] !== "",
          ) && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider col-span-full">
                Custom Fields
              </p>
              {customColumns.map((col) => {
                const val = lead[col.id];
                if (val === undefined || val === null || val === "")
                  return null;
                const display =
                  col.type === "checkbox" ? (val ? "Yes" : "No") : String(val);
                return <Field key={col.id} label={col.label} value={display} />;
              })}
            </section>
          )}

        {/* Site speed */}
        <PageSpeedPanel
          website={lead.website}
          cached={pageSpeedCache[lead.website?.trim()]}
          onCheck={handleCheckSpeed}
          checking={speedChecking}
          error={speedError}
        />

        {/* Generated pitch */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Pitch
            </p>
            <div className="flex items-center gap-3">
              {lead.generatedPitch && (
                <button
                  onClick={() => clearLeadPitch(lead.id)}
                  className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => generatePitch(lead)}
                disabled={!!pitchPending}
                className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors"
              >
                {pitchPending === lead.id
                  ? "Writing…"
                  : lead.generatedPitch
                    ? "Rewrite"
                    : "Write pitch"}
              </button>
            </div>
          </div>

          {pitchError && <p className="text-xs text-red-400">{pitchError}</p>}

          {pitchPending === lead.id ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-8 text-center">
              <p className="text-slate-500 text-sm animate-pulse">
                Writing a pitch from this lead's history…
              </p>
            </div>
          ) : lead.generatedPitch ? (
            <>
              <GeneratedPitch lead={lead} />
              <p className="text-xs text-slate-700">
                Written{" "}
                {new Date(lead.generatedPitch.generatedAt).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )}
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-6 text-center space-y-1">
              <p className="text-slate-500 text-sm">No pitch written yet.</p>
              <p className="text-slate-700 text-xs">
                Built from this lead's status, notes and site speed — not a
                template.
              </p>
            </div>
          )}
        </section>

        {/* Log a Touchpoint */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Log a Touchpoint
          </p>

          {/* Call timer */}
          <CallTimer onLog={handleTimerLog} />

          {/* Manual note */}
          <div className="flex gap-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors shrink-0"
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
                if (e.key === "Enter") handleAddNote();
              }}
              placeholder="What happened?"
              className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleAddNote}
              disabled={!note.trim()}
              className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                noteAdded
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white"
              }`}
            >
              {noteAdded ? "✓" : "Log"}
            </button>
          </div>
        </section>

        {/* Notes history */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Notes History{" "}
            {notesLog.length > 0 && (
              <span className="text-slate-700 font-normal normal-case">
                ({notesLog.length} entries)
              </span>
            )}
          </p>
          {notesLog.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-8 text-center">
              <p className="text-slate-700 text-sm">
                No notes yet. Log a touchpoint above.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
              {notesLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-5 py-3.5 bg-slate-900/20 hover:bg-slate-900/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        entry.text?.startsWith("[Closed]")
                          ? "text-green-400 font-medium"
                          : entry.text?.startsWith("[Dead]")
                            ? "text-red-400 font-medium"
                            : "text-slate-300"
                      }`}
                    >
                      {entry.text}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">{entry.ts}</p>
                  </div>
                  <button
                    onClick={() => deleteNoteEntry(lead.id, entry.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
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
              ))}
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <LeadModal
          existing={lead}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
