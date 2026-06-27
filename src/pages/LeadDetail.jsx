import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, OUTREACH_TYPES, STATUSES } from "../constants";
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

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
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

        {/* Add note */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Log a Touchpoint
          </p>
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
                    <p className="text-slate-300 text-sm">{entry.text}</p>
                    <p className="text-slate-600 text-xs mt-1">{entry.ts}</p>
                  </div>
                  <button
                    onClick={() => deleteNoteEntry(lead.id, entry.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                    title="Delete note"
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
