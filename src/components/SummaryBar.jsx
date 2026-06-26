import {
  isWithinInterval,
  parseISO,
  startOfToday,
  addDays,
  isValid,
} from "date-fns";
import { STATUS_COLORS } from "../constants";

export default function SummaryBar({ leads, statusFilter, onStatusClick }) {
  const today = startOfToday();
  const weekEnd = addDays(today, 7);

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const upcomingFollowUps = leads
    .filter((l) => {
      if (!l.followUpDate) return false;
      const d = parseISO(l.followUpDate);
      return isValid(d) && isWithinInterval(d, { start: today, end: weekEnd });
    })
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
    .slice(0, 5);

  const activeStatuses = ["Cold", "Contacted", "Warm", "Waiting"];

  return (
    <div className="space-y-4 mb-6">
      {/* Top row: counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={leads.length} />
        <StatCard
          label="Active"
          value={leads.filter((l) => activeStatuses.includes(l.status)).length}
        />
        <StatCard
          label="Warm / Waiting"
          value={
            leads.filter((l) => ["Warm", "Waiting"].includes(l.status)).length
          }
          highlight
        />
        <StatCard
          label="Closed"
          value={leads.filter((l) => l.status === "Closed").length}
          green
        />
      </div>

      {/* Status breakdown — filterable buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        {Object.entries(statusCounts).map(([status, count]) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => onStatusClick(status)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all border ${
                isActive
                  ? `${STATUS_COLORS[status] || "bg-slate-700 text-slate-200"} border-white/30 ring-1 ring-white/20 scale-105`
                  : `${STATUS_COLORS[status] || "bg-slate-700 text-slate-200"} border-transparent opacity-60 hover:opacity-100`
              }`}
            >
              {count} {status}
            </button>
          );
        })}
        {statusFilter && (
          <button
            onClick={() => onStatusClick(statusFilter)}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 transition-colors"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Upcoming follow-ups */}
      {upcomingFollowUps.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Follow-ups due this week
          </p>
          <div className="space-y-2.5">
            {upcomingFollowUps.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between text-base"
              >
                <span className="text-slate-200 font-medium">
                  {l.businessName}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-sm">
                    {l.followUpDate}
                  </span>
                  <span
                    className={`text-sm px-2.5 py-0.5 rounded-full ${STATUS_COLORS[l.status] || ""}`}
                  >
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight, green }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-5 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-3xl font-semibold tabular-nums ${
          green
            ? "text-green-400"
            : highlight
              ? "text-blue-400"
              : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
