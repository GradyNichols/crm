import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, OUTREACH_TYPES } from "../constants";
import EmptyState from "../components/EmptyState";

const today = new Date().toISOString().slice(0, 10);

function ChecklistItem({ lead, onLog }) {
  const done = lead.lastTouchDate === today;
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState(lead.type || "Phone Call");
  const [note, setNote] = useState("");

  const handleLog = () => {
    onLog(lead.id, { type, note });
    setExpanded(false);
    setNote("");
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${done ? "border-slate-800/40 bg-slate-900/10 opacity-50" : "border-slate-800 bg-slate-900/30"}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => (done ? null : setExpanded((e) => !e))}
          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${done ? "bg-green-600 border-green-600" : "border-slate-600 hover:border-blue-400"}`}
        >
          {done && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 text-white"
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
          )}
        </button>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => !done && setExpanded((e) => !e)}
        >
          <p
            className={`font-semibold text-base truncate ${done ? "line-through text-slate-600" : "text-slate-100"}`}
          >
            {lead.businessName}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {lead.ownerName && (
              <span className="text-slate-500 text-sm">{lead.ownerName}</span>
            )}
            {lead.phone && (
              <span className="text-slate-600 text-sm">{lead.phone}</span>
            )}
            {lead.followUpDate && lead.followUpDate <= today && !done && (
              <span className="text-xs text-red-400 font-medium">Overdue</span>
            )}
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[lead.status] || ""}`}
        >
          {lead.status}
        </span>
      </div>

      {expanded && !done && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800 space-y-3">
          {lead.notesLog?.length > 0 && (
            <p className="text-xs text-slate-600 italic">
              Last: "{[...lead.notesLog].reverse()[0].text}"
            </p>
          )}
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
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
                if (e.key === "Enter") handleLog();
              }}
              placeholder="Quick note (optional)…"
              className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleLog}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Checklist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const logTouchpoint = useCRMStore((s) => s.logTouchpoint);
  const [filter, setFilter] = useState(() =>
    searchParams.get("filter") === "all" ? "all" : "due",
  );

  useEffect(() => {
    const p = searchParams.get("filter");
    if (p === "all" || p === "due") setFilter(p);
  }, [searchParams]);

  const dueLeads = leads
    .filter((l) => !["Closed", "Dead"].includes(l.status))
    .filter(
      (l) => filter === "all" || (l.followUpDate && l.followUpDate <= today),
    )
    .sort((a, b) => {
      if (a.followUpDate && b.followUpDate)
        return a.followUpDate.localeCompare(b.followUpDate);
      if (a.followUpDate) return -1;
      if (b.followUpDate) return 1;
      return 0;
    });

  const dueCount = leads.filter(
    (l) =>
      !["Closed", "Dead"].includes(l.status) &&
      l.followUpDate &&
      l.followUpDate <= today,
  ).length;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <h2 className="text-2xl font-semibold text-slate-100">
            Outreach Checklist
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("due")}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${filter === "due" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}
        >
          Due today
          {dueCount > 0 && (
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${filter === "due" ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"}`}
            >
              {dueCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${filter === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}
        >
          All active
        </button>
      </div>

      {dueLeads.length === 0 ? (
        <EmptyState
          type="checklist"
          title={filter === "due" ? "All caught up!" : "No active leads"}
          subtitle={
            filter === "due"
              ? "No follow-ups are due today."
              : "Add some leads to start tracking outreach."
          }
          action={
            filter === "due"
              ? {
                  label: "View all active leads",
                  onClick: () => setFilter("all"),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {dueLeads.map((lead) => (
            <ChecklistItem key={lead.id} lead={lead} onLog={logTouchpoint} />
          ))}
        </div>
      )}
    </main>
  );
}
