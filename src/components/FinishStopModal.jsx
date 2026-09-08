import { useState, useEffect, useRef } from "react";

// ── Finish a stop ───────────────────────────────────────────────────────────────
// Extracted from Pitch Mode so Call Prep can close a run stop the same way.
// `kind` only changes copy — the capture (interest → status + follow-up + note)
// is identical, which is the point: a run stop behaves the same whether you
// walked in or dialled.

export const FOLLOWUP_DAYS = { Yes: 3, Maybe: 5, No: null };

export const INTEREST_OPTIONS = [
  { key: "Yes", label: "Yes", status: "Warm", color: "green" },
  { key: "Maybe", label: "Maybe", status: "Waiting", color: "amber" },
  { key: "No", label: "No", status: "Dead", color: "red" },
];

export function suggestFollowUp(key) {
  const days = FOLLOWUP_DAYS[key];
  if (!days) return "";
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const COPY = {
  pitch: {
    title: "Finish Pitch",
    notesPlaceholder: "What happened during the pitch?",
  },
  call: {
    title: "Finish Call",
    notesPlaceholder: "What happened on the call?",
  },
};

export default function FinishStopModal({
  lead,
  kind = "pitch",
  onSave,
  onCancel,
}) {
  const [interested, setInterested] = useState(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const inputRef = useRef(null);

  const copy = COPY[kind] || COPY.pitch;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleInterest = (key) => {
    setInterested(key);
    setFollowUpDate(suggestFollowUp(key));
  };

  const handleSave = () => {
    if (!interested) return;
    onSave({ interested, followUpDate, notes, nextAction });
  };

  const selected = INTEREST_OPTIONS.find((o) => o.key === interested);

  return (
    <div className="fixed my-auto bottom-24 sm:bottom-0 top-0 mt-14 sm:pt-0 inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-[#0d1117] border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-slate-100 font-semibold text-lg">
              {copy.title}
            </h3>
            <p className="text-slate-500 text-sm mt-0.5">{lead.businessName}</p>
          </div>

          {/* Interested? */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Interested?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INTEREST_OPTIONS.map((opt) => {
                const active = interested === opt.key;
                const colorClasses = {
                  green: active
                    ? "border-green-500 bg-green-950/40 text-green-300"
                    : "border-slate-700 text-slate-400 hover:border-green-700",
                  amber: active
                    ? "border-amber-500 bg-amber-950/40 text-amber-300"
                    : "border-slate-700 text-slate-400 hover:border-amber-700",
                  red: active
                    ? "border-red-500 bg-red-950/40 text-red-300"
                    : "border-slate-700 text-slate-400 hover:border-red-700",
                };
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleInterest(opt.key)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${colorClasses[opt.color]}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Follow-up date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              style={{ width: "100%", minWidth: 0 }}
              className="block w-full min-w-0 bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              ref={inputRef}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={copy.notesPlaceholder}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Next action */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Next action
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Send proposal Friday"
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={onCancel}
              className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!interested}
              className={`text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                selected?.color === "green"
                  ? "bg-green-700 hover:bg-green-600"
                  : selected?.color === "amber"
                    ? "bg-amber-700 hover:bg-amber-600"
                    : selected?.color === "red"
                      ? "bg-red-700 hover:bg-red-600"
                      : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              Save &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
