import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, STATUSES, OUTREACH_TYPES } from "../constants";
import LeadModal from "../components/LeadModal";

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
  const leads = useCRMStore((s) => s.leads) ?? [];
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];
  const updateLead = useCRMStore((s) => s.updateLead);
  const deleteNoteEntry = useCRMStore((s) => s.deleteNoteEntry);
  const logTouchpoint = useCRMStore((s) => s.logTouchpoint);

  const lead = leads.find((l) => l.id === id);

  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("Phone Call");
  const [noteAdded, setNoteAdded] = useState(false);

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

  const notesLog = [...(lead.notesLog || [])].reverse();

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
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
            onClick={() => navigate(`/call/${lead.id}`)}
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

        {/* Contact info */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Owner" value={lead.ownerName} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Email" value={lead.email} />
          <Field label="Address" value={lead.address} />
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
