import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS } from "../constants";

// ── Palette ─────────────────────────────────────────────────────────────────────
const STATUS_HEX = {
  Cold: "#64748b",
  Contacted: "#3b82f6",
  Warm: "#f59e0b",
  Waiting: "#a855f7",
  Dead: "#ef4444",
  Closed: "#22c55e",
};

const TYPE_HEX = {
  "Phone Call": "#3b82f6",
  "Walk-in": "#14b8a6",
  "Cold Email": "#64748b",
  "Yelp Message": "#f97316",
};

// ── Custom tooltip ───────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      {label && <p className="text-slate-500 text-xs mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name ? `${p.name}: ` : ""}
          {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-3xl font-semibold tabular-nums ${color || "text-slate-100"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];

  const stats = useMemo(() => {
    const total = leads.length;
    const active = leads.filter(
      (l) => !["Closed", "Dead"].includes(l.status),
    ).length;
    const closed = leads.filter((l) => l.status === "Closed").length;
    const dead = leads.filter((l) => l.status === "Dead").length;
    const convRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const avgStrength =
      leads.length > 0
        ? (
            leads.reduce((s, l) => s + (l.strength || 3), 0) / leads.length
          ).toFixed(1)
        : "—";

    // Status breakdown for pie chart
    const statusCounts = leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Touchpoints by type
    const typeCounts = {};
    leads.forEach((l) => {
      const log = l.notesLog || [];
      log.forEach((n) => {
        // Extract type from note text e.g. "[Phone Call] ..."
        const match = n.text?.match(/^\[(.+?)\]/);
        const type = match ? match[1] : l.type || "Other";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
    });
    const typeData = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Total touchpoints
    const totalTouchpoints = leads.reduce(
      (s, l) => s + (l.notesLog?.length || 0),
      0,
    );

    // Leads added per week (last 8 weeks)
    const now = new Date();
    const weekData = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const startStr = weekStart.toISOString().slice(0, 10);
      const endStr = weekEnd.toISOString().slice(0, 10);
      const count = leads.filter((l) => {
        const d = l.notesLog?.[0]?.ts || "";
        return d >= startStr && d < endStr;
      }).length;
      const label = weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      weekData.push({ label, count });
    }

    // Group breakdown
    const groupData = groups.map((g) => ({
      name: g.name,
      count: leads.filter((l) => l.groupId === g.id).length,
      avgStrength: (() => {
        const gl = leads.filter((l) => l.groupId === g.id);
        return gl.length > 0
          ? (gl.reduce((s, l) => s + (l.strength || 3), 0) / gl.length).toFixed(
              1,
            )
          : "—";
      })(),
    }));

    // Avg days to close
    const closedLeads = leads.filter(
      (l) => l.status === "Closed" && l.lastTouchDate && l.notesLog?.[0]?.ts,
    );
    const avgDaysToClose =
      closedLeads.length > 0
        ? Math.round(
            closedLeads.reduce((s, l) => {
              const start = new Date(l.notesLog[0].ts);
              const end = new Date(l.lastTouchDate);
              return s + Math.max(0, (end - start) / 86400000);
            }, 0) / closedLeads.length,
          )
        : null;

    return {
      total,
      active,
      closed,
      dead,
      convRate,
      avgStrength,
      statusData,
      typeData,
      totalTouchpoints,
      weekData,
      groupData,
      avgDaysToClose,
    };
  }, [leads, groups]);

  if (leads.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <h2 className="text-2xl font-semibold text-slate-100">Progress</h2>
        </div>
        <div className="text-center py-20">
          <p className="text-slate-500">Add some leads to see your progress.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
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
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Progress</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Your outreach at a glance.
          </p>
        </div>
      </div>

      {/* ── Pipeline overview ── */}
      <Section title="Pipeline Overview">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Leads" value={stats.total} />
          <StatCard label="Active" value={stats.active} color="text-blue-400" />
          <StatCard
            label="Closed"
            value={stats.closed}
            color="text-green-400"
          />
          <StatCard
            label="Conv. Rate"
            value={`${stats.convRate}%`}
            color={stats.convRate > 0 ? "text-green-400" : "text-slate-400"}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Avg Strength"
            value={`${stats.avgStrength}★`}
            color="text-amber-400"
          />
          <StatCard
            label="Touchpoints"
            value={stats.totalTouchpoints}
            color="text-blue-400"
          />
          {stats.avgDaysToClose !== null && (
            <StatCard
              label="Avg Days to Close"
              value={stats.avgDaysToClose}
              sub="for closed leads"
            />
          )}
        </div>
      </Section>

      {/* ── Status breakdown ── */}
      <Section title="Status Breakdown">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_HEX[entry.name] || "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {stats.statusData
                .sort((a, b) => b.value - a.value)
                .map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: STATUS_HEX[s.name] || "#64748b",
                      }}
                    />
                    <span className="text-slate-300 text-sm flex-1">
                      {s.name}
                    </span>
                    <span className="text-slate-100 font-semibold tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-slate-600 text-xs w-10 text-right">
                      {Math.round((s.value / stats.total) * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Outreach activity ── */}
      {stats.typeData.length > 0 && (
        <Section title="Touchpoints by Type">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats.typeData}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "#1e293b" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stats.typeData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={TYPE_HEX[entry.name] || "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* ── Leads over time ── */}
      <Section title="Leads Added (Last 8 Weeks)">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weekData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "#1e293b" }}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                name="Leads"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Group breakdown ── */}
      {stats.groupData.length > 0 && (
        <Section title="By Group">
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {stats.groupData.map((g) => (
              <div
                key={g.name}
                className="flex items-center justify-between px-5 py-4 bg-slate-900/20"
              >
                <p className="text-slate-200 font-medium">{g.name}</p>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-slate-400">
                    {g.count} lead{g.count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-amber-400">{g.avgStrength}★ avg</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900/40">
              <p className="text-slate-500 text-sm">Ungrouped</p>
              <span className="text-slate-500 text-sm">
                {leads.filter((l) => !l.groupId).length} lead
                {leads.filter((l) => !l.groupId).length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </Section>
      )}
    </main>
  );
}
