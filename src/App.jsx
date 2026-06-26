import { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import useCRMStore from "./store/useCRMStore";
import SummaryBar from "./components/SummaryBar";
import LeadTable from "./components/LeadTable";
import LeadModal from "./components/LeadModal";
import Settings from "./pages/Settings";
import Search from "./pages/Search";

// ── Icons ──────────────────────────────────────────────────────────────────────

function HamburgerIcon() {
  return (
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
}

function SearchIcon() {
  return (
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
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef(null);
  const onSearch = location.pathname === "/search";
  const onSettings = location.pathname === "/settings";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

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

      {/* Drawer panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 left-0 h-full z-50 w-64 bg-[#080d14] border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
            Menu
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Mobile-only nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 sm:hidden">
          <SidebarNavItem
            label="Search"
            icon={<SearchIcon />}
            active={onSearch}
            onClick={() => go("/search")}
          />
          <SidebarNavItem
            label="Settings"
            icon={<SettingsIcon />}
            active={onSettings}
            onClick={() => go("/settings")}
          />
        </nav>

        {/* Desktop: empty body — future items go here */}
        <div className="flex-1 hidden sm:block" />

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-700">Restaurant CRM</p>
        </div>
      </div>
    </>
  );
}

function SidebarNavItem({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
        active
          ? "bg-blue-950/60 text-blue-300"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function Dashboard({ onEditLead }) {
  const { leads } = useCRMStore();
  const [statusFilter, setStatusFilter] = useState(null);
  const filteredLeads = statusFilter
    ? leads.filter((l) => l.status === statusFilter)
    : leads;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <SummaryBar
        leads={leads}
        statusFilter={statusFilter}
        onStatusClick={(s) => setStatusFilter((p) => (p === s ? null : s))}
      />
      <LeadTable leads={filteredLeads} onEdit={onEditLead} />
    </main>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const { addLead, updateLead } = useCRMStore();
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const onSettings = location.pathname === "/settings";
  const onSearch = location.pathname === "/search";

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
  const handleSearchClick = () => navigate(onSearch ? "/" : "/search");
  const handleSettingsClick = () => navigate(onSettings ? "/" : "/settings");

  const now = new Date();
  const lastUpdated = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="min-h-screen bg-[#03060f] text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="border-b border-slate-800 bg-[#03060f]/90 sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {/* Hamburger — left of title on desktop, hidden on mobile (moved to right) */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden sm:flex p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
            title="Menu"
          >
            <HamburgerIcon />
          </button>

          {/* Title */}
          <div className="flex-1 px-2">
            <NavLink to="/">
              <h1 className="text-xl font-semibold text-slate-100 tracking-tight hover:text-blue-400 transition-colors">
                CRM Dashboard
              </h1>
            </NavLink>
            <p className="text-sm text-slate-600 mt-0.5 hidden sm:block">
              Last updated {lastUpdated}
            </p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search + Settings — desktop only */}
            <button
              onClick={handleSearchClick}
              className={`hidden sm:flex p-2.5 rounded-lg transition-colors ${
                onSearch
                  ? "text-blue-400 bg-blue-950/50"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
              title={onSearch ? "Back to dashboard" : "Search leads"}
            >
              <SearchIcon />
            </button>

            <button
              onClick={handleSettingsClick}
              className={`mr-1 hidden sm:flex p-2.5 rounded-lg transition-colors ${
                onSettings
                  ? "text-blue-400 bg-blue-950/50"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
              title={onSettings ? "Back to dashboard" : "Settings"}
            >
              <SettingsIcon />
            </button>

            {/* Add Lead — desktop only on non-settings/search pages */}
            {!onSettings && !onSearch && (
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

            {/* Mobile: Add Lead (dashboard only) */}
            {!onSettings && !onSearch && (
              <button
                onClick={() => {
                  setEditingLead(null);
                  setShowModal(true);
                }}
                className="sm:hidden bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + Add Lead
              </button>
            )}

            {/* Hamburger — mobile only, right side */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="sm:hidden p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="Menu"
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard onEditLead={handleEdit} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/search" element={<Search />} />
      </Routes>

      {showModal && (
        <LeadModal
          onClose={handleClose}
          onSave={handleSave}
          existing={editingLead}
        />
      )}
    </div>
  );
}
