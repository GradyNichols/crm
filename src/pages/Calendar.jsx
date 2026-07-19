import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS } from "../constants";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toKey(date) {
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Calendar() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];
  const addToPlan = useCRMStore.getState().addToPlan;

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(todayKey());

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

  const planLeadIds = new Set(dailyPlan.map((i) => i.leadId));

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
        {grid.map((d) => {
          const key = toKey(d);
          const count = (byDate[key] || []).length;
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
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-slate-300">
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
          </p>
          {isSelectedToday && selectedLeads.length > 0 && (
            <button
              onClick={() => {
                selectedLeads.forEach((l) => {
                  if (!planLeadIds.has(l.id)) addToPlan(l.id);
                });
              }}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              + Add all to Plan
            </button>
          )}
        </div>

        {selectedLeads.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-8 text-center">
            <p className="text-slate-600 text-base">No follow-ups this day.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {selectedLeads.map((lead) => {
              const inPlan = planLeadIds.has(lead.id);
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 px-4 py-4 bg-slate-900/20 hover:bg-slate-800/30 transition-colors"
                >
                  <button
                    onClick={() => navigate(`/lead/${lead.id}`)}
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

                  {isSelectedToday &&
                    (inPlan ? (
                      <span className="text-sm text-slate-600 shrink-0">
                        ✓ In Plan
                      </span>
                    ) : (
                      <button
                        onClick={() => addToPlan(lead.id)}
                        className="text-sm font-medium text-purple-400 hover:text-purple-300 border border-purple-900/50 hover:border-purple-700 px-3.5 py-2 rounded-lg transition-colors shrink-0"
                      >
                        + Plan
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
