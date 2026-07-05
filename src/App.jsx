import { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import useCRMStore from "./store/useCRMStore";
import SummaryBar from "./components/SummaryBar";
import EmptyState from "./components/EmptyState";
import LeadTable from "./components/LeadTable";
import LeadModal from "./components/LeadModal";
import Settings from "./pages/Settings";
import Search from "./pages/Search";
import Checklist from "./pages/Checklist";
import Reference from "./pages/Reference";
import AI from "./pages/AI";
import LeadDetail from "./pages/LeadDetail";
import Import from "./pages/Import";
import Map from "./pages/MapPage";
import LeadSpree from "./pages/LeadSpree";

// ── Icons ───────────────────────────────────────────────────────────────────────

const HamburgerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const DashboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
    />
  </svg>
);

const ChecklistIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const AIIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
    />
  </svg>
);

const ReferenceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
  </svg>
);

const MapIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
    />
  </svg>
);

const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

function BottomNavItem({ path, icon, label, currentPath, navigate }) {
  const active = currentPath === path;
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-5 pb-6 transition-colors ${
        active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// ── Sidebar nav item ─────────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function SidebarNavItem({ label, icon, active, onClick, badge, subItems }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubItems = subItems && subItems.length > 0;

  return (
    <div>
      {/* Main row — label navigates, chevron toggles dropdown */}
      <div
        className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-blue-950/60 text-blue-300"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <button
          onClick={onClick}
          className="flex items-center gap-3 flex-1 px-4 py-2.5 text-left"
        >
          <span className="shrink-0">{icon}</span>
          <span className="flex-1">{label}</span>
          {badge > 0 && (
            <span className="text-xs bg-blue-600 text-white font-semibold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {badge}
            </span>
          )}
        </button>
        {hasSubItems && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="px-2.5 py-2.5 hover:bg-slate-800/60 rounded-lg transition-colors"
            title="Show actions"
          >
            <ChevronIcon open={expanded} />
          </button>
        )}
      </div>

      {/* Sub-items dropdown */}
      {hasSubItems && expanded && (
        <div className="mt-1 ml-4 pl-4 border-l border-slate-800 space-y-0.5">
          {subItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full text-left text-xs text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef(null);
  const leads = useCRMStore((s) => s.leads) ?? [];
  const refSections = useCRMStore((s) => s.refSections) ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = leads.filter(
    (l) =>
      !["Closed", "Dead"].includes(l.status) &&
      l.followUpDate &&
      l.followUpDate <= today &&
      l.lastTouchDate !== today,
  ).length;

  const path = location.pathname;
  const go = (to) => {
    navigate(to);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 left-0 h-full z-50 w-64 bg-[#080d14] border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <img
              src="/logo.png"
              alt="Trace logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-semibold text-slate-100 tracking-tight">
              Trace
            </span>
          </NavLink>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard — desktop only (mobile has bottom nav) */}
          <div className="hidden sm:block">
            <SidebarNavItem
              label="Dashboard"
              icon={<DashboardIcon />}
              active={path === "/"}
              onClick={() => go("/")}
            />
          </div>
          <SidebarNavItem
            label="Checklist"
            icon={<ChecklistIcon />}
            active={path === "/checklist"}
            onClick={() => go("/checklist")}
            badge={dueToday}
            subItems={[
              {
                label: "Due today",
                onClick: () => go("/checklist?filter=due"),
              },
              {
                label: "All active",
                onClick: () => go("/checklist?filter=all"),
              },
            ]}
          />
          <SidebarNavItem
            label="Territory Map"
            icon={<MapIcon />}
            active={location.pathname === "/map"}
            onClick={() => {
              go("/map");
            }}
          />
          <SidebarNavItem
            label="Pipeline Advisor"
            icon={<AIIcon />}
            active={path === "/ai"}
            onClick={() => go("/ai")}
            subItems={[
              { label: "Analyze now", onClick: () => go("/ai?action=analyze") },
            ]}
          />
          <SidebarNavItem
            label="Reference"
            icon={<ReferenceIcon />}
            active={path === "/reference"}
            onClick={() => go("/reference")}
            subItems={[
              {
                label: "New section",
                onClick: () => go("/reference?action=new-section"),
              },
              ...refSections.map((sec) => ({
                label: sec.title,
                onClick: () => go(`/reference?section=${sec.id}`),
              })),
            ]}
          />
          {/* Search — desktop only (mobile has bottom nav) */}
          <div className="hidden sm:block">
            <SidebarNavItem
              label="Search"
              icon={<SearchIcon />}
              active={path === "/search"}
              onClick={() => go("/search")}
            />
          </div>
        </nav>

        {/* Settings pinned to bottom */}
        <div className="px-3 pb-4 border-t border-slate-800 pt-3">
          <div className="hidden sm:block">
            <SidebarNavItem
              label="Settings"
              icon={<SettingsIcon />}
              active={path === "/settings"}
              onClick={() => go("/settings")}
              subItems={[
                {
                  label: "New group",
                  onClick: () => go("/settings?action=new-group"),
                },
                {
                  label: "New column",
                  onClick: () => go("/settings?action=new-column"),
                },
              ]}
            />
          </div>
          {/* Keyboard shortcuts hint */}
          <div className="mt-3 px-2 py-3 rounded-lg bg-slate-900/40 border border-slate-800">
            <p className="text-xs text-slate-600 uppercase tracking-widest mb-2">
              Shortcuts
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[
                ["N", "New lead"],
                ["/", "Search"],
                ["C", "Checklist"],
                ["M", "Map"],
                ["R", "Reference"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    {key}
                  </kbd>
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── CSV Export ───────────────────────────────────────────────────────────────────

function exportCSV(leads, customColumns) {
  const baseHeaders = [
    "Business Name",
    "Owner",
    "Phone",
    "Email",
    "Address",
    "Type",
    "Strength",
    "Status",
    "Last Touch",
    "Follow-up",
    "Notes History",
  ];
  const headers = [...baseHeaders, ...customColumns.map((c) => c.label)];
  const escape = (val) => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const rows = leads.map((l) => {
    const notesText = (l.notesLog || [])
      .map((n) => `[${n.ts}] ${n.text}`)
      .join(" | ");
    const base = [
      l.businessName,
      l.ownerName,
      l.phone,
      l.email,
      l.address,
      l.type,
      l.strength,
      l.status,
      l.lastTouchDate,
      l.followUpDate,
      notesText,
    ];
    return [...base, ...customColumns.map((c) => l[c.id] ?? "")]
      .map(escape)
      .join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Group tabs ───────────────────────────────────────────────────────────────────

function GroupTabs({ groups, leads, activeGroup, onChange }) {
  if (groups.length === 0) return null;
  const countAll = leads.length;
  const countFor = (id) => leads.filter((l) => l.groupId === id).length;
  return (
    <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
      <button
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 ${
          activeGroup === null
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
      >
        All
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
            activeGroup === null
              ? "bg-blue-500 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          {countAll}
        </span>
      </button>
      {groups.map((g) => {
        const count = countFor(g.id);
        const active = activeGroup === g.id;
        return (
          <button
            key={g.id}
            onClick={() => onChange(g.id === activeGroup ? null : g.id)}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 ${
              active
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {g.name}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                active
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────────

function Dashboard({ onEditLead }) {
  const leads = useCRMStore((s) => s.leads);
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];
  const [statusFilter, setStatusFilter] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [spreeMode, setSpreeMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("spree") === "1") {
      setSpreeMode(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const groupFiltered = activeGroup
    ? leads.filter((l) => l.groupId === activeGroup)
    : leads;
  const filteredLeads = statusFilter
    ? groupFiltered.filter((l) => l.status === statusFilter)
    : groupFiltered;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <GroupTabs
        groups={groups}
        leads={leads}
        activeGroup={activeGroup}
        onChange={(g) => {
          setActiveGroup(g);
          setStatusFilter(null);
        }}
      />
      <SummaryBar
        leads={groupFiltered}
        statusFilter={statusFilter}
        onStatusClick={(s) => setStatusFilter((p) => (p === s ? null : s))}
      />
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">
          {filteredLeads.length}
          {statusFilter ? ` ${statusFilter}` : ""}
          {activeGroup
            ? ` · ${groups.find((g) => g.id === activeGroup)?.name}`
            : ""}{" "}
          lead{filteredLeads.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSpreeMode(true)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
            title="Lead Spree — add leads fast (S)"
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
            Spree
          </button>
          <button
            onClick={() => setSelectMode((s) => !s)}
            className={`text-sm transition-colors ${selectMode ? "text-blue-400 hover:text-blue-300" : "text-slate-500 hover:text-slate-300"}`}
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
          <Link
            to="/import"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            Import CSV
          </Link>
          <button
            onClick={() => exportCSV(filteredLeads, customColumns)}
            disabled={filteredLeads.length === 0}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      {spreeMode && <LeadSpree onClose={() => setSpreeMode(false)} />}
      {activeGroup && groupFiltered.length === 0 ? (
        <EmptyState
          type="group"
          title="No leads in this group"
          subtitle="Assign leads to this group by expanding a row and selecting it from the group dropdown."
        />
      ) : (
        <LeadTable
          leads={filteredLeads}
          onEdit={onEditLead}
          selectMode={selectMode}
          onExitSelect={() => setSelectMode(false)}
        />
      )}
    </main>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────────

export default function App() {
  const { addLead, updateLead } = useCRMStore();
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  const handleSave = (form) => {
    if (editingLead) updateLead(editingLead.id, form);
    else addLead(form);
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setShowModal(true);
  };
  const handleClose = () => {
    setShowModal(false);
    setEditingLead(null);
  };
  const navigate = useNavigate();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in inputs
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      // Don't fire when modal or sidebar is open
      if (showModal || sidebarOpen) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          setEditingLead(null);
          setShowModal(true);
          break;
        case "/":
          e.preventDefault();
          navigate("/search");
          break;
        case "c":
        case "C":
          e.preventDefault();
          navigate("/checklist");
          break;
        case "m":
        case "M":
          e.preventDefault();
          navigate("/map");
          break;
        case "r":
        case "R":
          e.preventDefault();
          navigate("/reference");
          break;
        case "s":
        case "S":
          e.preventDefault();
          navigate("/?spree=1");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showModal, sidebarOpen]);

  const now = new Date();
  const lastUpdated = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="min-h-screen bg-[#03060f] text-slate-100 pb-32 sm:pb-0">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="border-b border-slate-800 bg-[#03060f]/90 sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center">
          {/* Left — hamburger + last updated */}
          <div className="flex-1 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
              title="Menu"
            >
              <HamburgerIcon />
            </button>
            <p className="text-sm text-slate-600 hidden sm:block">
              {lastUpdated}
            </p>
          </div>

          {/* Center — logo */}
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo.png"
              alt="Trace logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-xl font-semibold text-slate-100 tracking-tight">
              Trace
            </span>
          </NavLink>

          {/* Right — Add Lead (desktop only) */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {isDashboard && (
              <button
                onClick={() => {
                  setEditingLead(null);
                  setShowModal(true);
                }}
                className="hidden sm:flex bg-blue-600 hover:bg-blue-500 text-white text-base font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                + Add Lead
              </button>
            )}
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard onEditLead={handleEdit} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/search" element={<Search />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/reference" element={<Reference />} />
        <Route path="/ai" element={<AI />} />
        <Route path="/lead/:id" element={<LeadDetail />} />
        <Route path="/import" element={<Import />} />
        <Route path="/map" element={<Map />} />
      </Routes>

      {/* Mobile FAB — only on dashboard */}
      {isDashboard && (
        <button
          onClick={() => {
            setEditingLead(null);
            setShowModal(true);
          }}
          className="sm:hidden fixed bottom-28 right-6 z-30 w-14 h-14 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title="Add Lead"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      )}

      {showModal && (
        <LeadModal
          onClose={handleClose}
          onSave={handleSave}
          existing={editingLead}
        />
      )}

      {/* Bottom nav — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#03060f]/95 backdrop-blur-sm border-t border-slate-800 flex flex-col">
        <div className="flex items-center">
          <BottomNavItem
            path="/"
            icon={<HomeIcon />}
            label="Home"
            currentPath={location.pathname}
            navigate={navigate}
          />
          <BottomNavItem
            path="/search"
            icon={<SearchIcon />}
            label="Search"
            currentPath={location.pathname}
            navigate={navigate}
          />
          <BottomNavItem
            path="/settings"
            icon={<SettingsIcon />}
            label="Settings"
            currentPath={location.pathname}
            navigate={navigate}
          />
        </div>
        <div
          style={{ height: "env(safe-area-inset-bottom, 12px)" }}
          className="w-full bg-transparent"
        />
      </nav>
    </div>
  );
}
