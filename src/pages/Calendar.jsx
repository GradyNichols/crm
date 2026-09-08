import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS } from "../constants";
import QueueButton, { QueueAllButton } from "../components/QueueButton";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toKey(date) {
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ── Hover preview ───────────────────────────────────────────────────────────────
// Desktop affordance only — tapping a day is the primary interaction and is the
// only one that exists on a phone. This just saves a click at a desk.
// pointer-events-none so it can never swallow the click underneath it.
function DayPreview({ leads, index }) {
  const row = Math.floor(index / 7);
  const col = index % 7;

  // Flip above the cell for the bottom half of the grid, and pin to the edge
  // for the outer columns so it can't run off the page.
  const vertical = row >= 3 ? "bottom-full mb-1" : "top-full mt-1";
  const horizontal =
    col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";

  const shown = leads.slice(0, 6);

  return (
    <div
      className={`hidden sm:block absolute z-30 w-56 pointer-events-none ${vertical} ${horizontal}`}
    >
      <div className="rounded-xl border border-slate-700 bg-[#0d1117] shadow-2xl px-3 py-2.5 space-y-1.5 text-left">
        <p className="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-widest">
          {leads.length} follow-up{leads.length !== 1 ? "s" : ""}
        </p>
        {shown.map((l) => (
          <div key={l.id} className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                l.status === "Warm"
                  ? "bg-amber-400"
                  : l.status === "Waiting"
                    ? "bg-purple-400"
                    : l.status === "Contacted"
                      ? "bg-blue-400"
                      : "bg-slate-500"
              }`}
            />
            <span className="text-xs text-slate-300 truncate flex-1">
              {l.businessName}
            </span>
            <span className="text-[0.65rem] text-slate-600 shrink-0">
              {l.status}
            </span>
          </div>
        ))}
        {leads.length > shown.length && (
          <p className="text-xs text-slate-600">
            +{leads.length - shown.length} more
          </p>
        )}
      </div>
    </div>
  );
}

export default function Calendar() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const today = todayKey();

  // ── Group active leads by follow-up date ────────────────────────────────────
  const byDate = useMemo(() => {
    const map = {};
    leads.forEach((l) => {
      if (!l.followUpDate) return;
      if (["Closed", "Dead"].includes(l.status)) return;
      if (!map[l.followUpDate]) map[l.followUpDate] = [];
      map[l.followUpDate].push(l);
    });
    return map;
  }, [leads]);

  // ── Build the 6x7 month grid ─────────────────────────────────────────────────
  const grid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startOffset);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [viewDate]);

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const changeMonth = (dir) => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + dir);
      return next;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    setViewDate(d);
    setSelectedDate(today);
  };

  const selectedLeads = (byDate[selectedDate] || []).sort(
    (a, b) => (b.strength || 0) - (a.strength || 0),
  );
  const isSelectedToday = selectedDate === today;
  const isSelectedPast = selectedDate < today;
  const currentMonth = viewDate.getMonth();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <h2 className="text-2xl font-semibold text-slate-100">Calendar</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Follow-ups at a glance.
          </p>
        </div>
        <button
          onClick={goToToday}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-900/50 hover:border-blue-700 px-4 py-2.5 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="p-3 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <p className="text-slate-100 text-xl font-semibold">{monthLabel}</p>
        <button
          onClick={() => changeMonth(1)}
          className="p-3 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>

      {/* Weekday header */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-sm text-slate-500 uppercase tracking-wider font-semibold py-2"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {grid.map((d, i) => {
          const key = toKey(d);
          const dayLeads = byDate[key] || [];
          const count = dayLeads.length;
          const inCurrentMonth = d.getMonth() === currentMonth;
          const isToday = key === today;
          const isSelected = key === selectedDate;
          const isPast = key < today;

          let dotColor = "";
          if (count > 0) {
            dotColor = isPast ? "bg-red-500" : "bg-blue-500";
          }

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              onMouseEnter={() => count > 0 && setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`min-h-[3.25rem] sm:min-h-[3.75rem] rounded-xl flex flex-col items-center justify-center gap-1 text-base sm:text-lg font-medium transition-colors relative ${
                isSelected
                  ? "bg-blue-600 text-white font-semibold"
                  : isToday
                    ? "border border-blue-500 text-blue-300"
                    : inCurrentMonth
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-700 hover:bg-slate-900"
              }`}
            >
              <span>{d.getDate()}</span>
              {count > 0 && (
                <span
                  className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : dotColor}`}
                />
              )}
              {hoveredIndex === i && count > 0 && (
                <DayPreview leads={dayLeads} index={i} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Upcoming
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Overdue
        </div>
      </div>

      {/* Selected day panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-slate-300 min-w-0">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {isSelectedToday && (
              <span className="text-blue-400 ml-2 text-sm font-normal">
                (today)
              </span>
            )}
            {isSelectedPast && selectedLeads.length > 0 && (
              <span className="text-red-400 ml-2 text-sm font-normal">
                (overdue)
              </span>
            )}
          </p>
          {/* Queueing used to be gated to today's cell, which meant last week's
              overdue follow-ups and next week's upcoming ones were both
              read-only. Any day can feed today's work now. */}
          <QueueAllButton leadIds={selectedLeads.map((l) => l.id)} />
        </div>

        {selectedLeads.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-8 text-center">
            <p className="text-slate-600 text-base">No follow-ups this day.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {selectedLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 px-4 py-4 bg-slate-900/20 hover:bg-slate-800/30 transition-colors"
              >
                <button
                  onClick={() =>
                    navigate(`/lead/${lead.id}`, {
                      state: { from: "/calendar" },
                    })
                  }
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-slate-100 text-base font-medium truncate">
                    {lead.businessName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {lead.ownerName && (
                      <span className="text-slate-500 text-sm">
                        {lead.ownerName}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                </button>

                <QueueButton leadId={lead.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
