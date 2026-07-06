import {
  isWithinInterval,
  parseISO,
  startOfToday,
  addDays,
  isValid,
} from "date-fns";
import { STATUS_COLORS, isAging, daysSinceTouch } from "../constants";

export default function SummaryBar({ leads, statusFilter, onStatusClick }) {
  const today = startOfToday();
  const weekEnd = addDays(today, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const overdueLeads = leads
    .filter(
      (l) =>
        l.followUpDate &&
        l.followUpDate < todayStr &&
        l.lastTouchDate !== todayStr &&
        !["Closed", "Dead"].includes(l.status),
    )
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

  const agingLeads = leads
    .filter((l) => isAging(l))
    .sort((a, b) => (daysSinceTouch(b) ?? 999) - (daysSinceTouch(a) ?? 999));

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
      {/* Stat cards */}
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

      {/* Status filter badges */}
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
            Clear{" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 inline-block"
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
        )}
      </div>

      {/* Overdue + Going stale — side by side on desktop */}
      {(overdueLeads.length > 0 || agingLeads.length > 0) && (
        <div
          className={`grid gap-3 ${overdueLeads.length > 0 && agingLeads.length > 0 ? "sm:grid-cols-2" : "grid-cols-1"}`}
        >
          {overdueLeads.length > 0 && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
              <p className="text-xs uppercase tracking-widest text-red-500 mb-3 flex items-center gap-1.5">
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
                {overdueLeads.length} overdue follow-up
                {overdueLeads.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {overdueLeads.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-200 font-medium truncate mr-2">
                      {l.businessName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-red-400 text-xs font-medium">
                        {l.followUpDate}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] || ""}`}
                      >
                        {l.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {agingLeads.length > 0 && (
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-4">
              <p className="text-xs uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                {agingLeads.length} lead{agingLeads.length !== 1 ? "s" : ""}{" "}
                going stale
              </p>
              <div className="space-y-2">
                {agingLeads.slice(0, 5).map((l) => {
                  const days = daysSinceTouch(l);
                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-200 font-medium truncate mr-2">
                        {l.businessName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-amber-400 text-xs font-medium">
                          {days === null
                            ? "never contacted"
                            : `${days}d no contact`}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] || ""}`}
                        >
                          {l.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
        className={`text-3xl font-semibold tabular-nums ${green ? "text-green-400" : highlight ? "text-blue-400" : "text-slate-100"}`}
      >
        {value}
      </p>
    </div>
  );
}
