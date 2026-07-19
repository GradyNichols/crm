import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { requestPermission } from "../hooks/useNotifications";

const FIELD_TYPES = [
  { value: "text", label: "Text", desc: "Free-form text entry" },
  { value: "number", label: "Number", desc: "Numeric values only" },
  { value: "date", label: "Date", desc: "Date picker" },
  { value: "select", label: "Dropdown", desc: "Pick from options you define" },
  { value: "checkbox", label: "Checkbox", desc: "Yes / No toggle" },
  { value: "stars", label: "Star Rating", desc: "1–5 stars" },
];

const EMPTY_FORM = { label: "", type: "text", options: "" };

function DeleteConfirmModal({ col, label, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-950 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-red-400"
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
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-base">
              Delete column?
            </h3>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-slate-300">"{label || col.label}"</span> and
              all its data will be permanently removed from every lead.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm font-medium bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Delete Column
          </button>
        </div>
      </div>
    </div>
  );
}

function exportBackup(state) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    leads: state.leads,
    customColumns: state.customColumns,
    groups: state.groups,
    refSections: state.refSections,
    geocache: state.geocache,
    notifSettings: state.notifSettings,
    pageSpeedCache: state.pageSpeedCache,
    portfolioUrl: state.portfolioUrl,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trace-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const addCustomColumn = useCRMStore((s) => s.addCustomColumn);
  const deleteCustomColumn = useCRMStore((s) => s.deleteCustomColumn);
  const groups = useCRMStore((s) => s.groups) ?? [];
  const { addGroup, renameGroup, deleteGroup, restoreBackup, mergeBackup } =
    useCRMStore.getState();
  const notifSettings = useCRMStore((s) => s.notifSettings) ?? {};
  const setNotificationSettings = useCRMStore.getState().setNotifSettings;
  const portfolioUrl = useCRMStore((s) => s.portfolioUrl) ?? "";
  const setPortfolioUrl = useCRMStore.getState().setPortfolioUrl;
  const [portfolioDraft, setPortfolioDraft] = useState(portfolioUrl);
  const [portfolioSaved, setPortfolioSaved] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [backupPreview, setBackupPreview] = useState(null); // parsed JSON
  const [backupError, setBackupError] = useState("");
  const [backupDone, setBackupDone] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [groupError, setGroupError] = useState("");
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new-group") {
      setNewGroupName("");
      setTimeout(
        () =>
          document
            .getElementById("groups-section")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
      setSearchParams({}, { replace: true });
    } else if (action === "new-column") {
      setTimeout(
        () =>
          document
            .getElementById("columns-section")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
      setSearchParams({}, { replace: true });
    } else if (action === "pitch-mode") {
      setTimeout(
        () =>
          document
            .getElementById("pitch-section")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = "Column name is required";
    if (form.type === "select") {
      const opts = parseOptions(form.options);
      if (opts.length < 2)
        e.options = "Add at least 2 options (comma-separated)";
    }
    return e;
  };

  const parseOptions = (raw) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleCreate = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    addCustomColumn({
      label: form.label.trim(),
      type: form.type,
      options: form.type === "select" ? parseOptions(form.options) : undefined,
    });

    setForm({ ...EMPTY_FORM });
    setSuccessMsg(`Column "${form.label.trim()}" created.`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const typeInfo = FIELD_TYPES.find((t) => t.value === form.type);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Page title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          title="Back to dashboard"
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
          <h2 className="text-2xl font-semibold text-slate-100">Settings</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage groups and custom columns.
          </p>
        </div>
      </div>

      {/* ── Pitch Mode ── */}
      <section id="pitch-section">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Pitch Mode
        </h3>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 space-y-3">
          <div>
            <p className="text-slate-200 text-sm font-medium">Portfolio URL</p>
            <p className="text-slate-600 text-xs mt-0.5">
              Shown as a one-tap link inside Pitch Mode for every lead.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={portfolioDraft}
              onChange={(e) => {
                setPortfolioDraft(e.target.value);
                setPortfolioSaved(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPortfolioUrl(portfolioDraft.trim());
                  setPortfolioSaved(true);
                  setTimeout(() => setPortfolioSaved(false), 1500);
                }
              }}
              placeholder="yourportfolio.com"
              className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => {
                setPortfolioUrl(portfolioDraft.trim());
                setPortfolioSaved(true);
                setTimeout(() => setPortfolioSaved(false), 1500);
              }}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0 ${
                portfolioSaved
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {portfolioSaved ? "✓ Saved" : "Save"}
            </button>
          </div>
          <p className="text-xs text-slate-700">
            To surface pitch scripts inside Pitch Mode, mark a{" "}
            <a
              href="/reference"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Reference card
            </a>{" "}
            with the pin icon.
          </p>
        </div>
      </section>

      {/* ── Data Backup ── */}
      <section id="backup-section">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Data Backup & Restore
        </h3>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 space-y-5">
          {/* Export */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 text-sm font-medium">
                Export backup
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                Downloads all your data as a .json file
              </p>
            </div>
            <button
              onClick={() => exportBackup(useCRMStore.getState())}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg transition-colors"
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
              Export
            </button>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Import */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-200 text-sm font-medium">
                  Import backup
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Restore from a previously exported .json file
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg transition-colors cursor-pointer">
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
                Choose file
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setBackupError("");
                    setBackupPreview(null);
                    setBackupDone("");
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const parsed = JSON.parse(ev.target.result);
                        if (!parsed.leads && !parsed.groups)
                          throw new Error("Invalid backup file");
                        setBackupPreview(parsed);
                      } catch {
                        setBackupError(
                          "Invalid file — make sure this is a Trace backup.",
                        );
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {backupError && (
              <p className="text-sm text-red-400">{backupError}</p>
            )}
            {backupDone && (
              <p className="text-sm text-green-400">{backupDone}</p>
            )}

            {/* Preview + actions */}
            {backupPreview && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Backup contents
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    ["Leads", (backupPreview.leads || []).length],
                    ["Groups", (backupPreview.groups || []).length],
                    ["Sections", (backupPreview.refSections || []).length],
                    ["Columns", (backupPreview.customColumns || []).length],
                  ].map(([label, count]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-slate-800/60 px-3 py-2 text-center"
                    >
                      <p className="text-slate-100 font-semibold text-lg tabular-nums">
                        {count}
                      </p>
                      <p className="text-slate-600 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
                {backupPreview.exportedAt && (
                  <p className="text-xs text-slate-600">
                    Exported{" "}
                    {new Date(backupPreview.exportedAt).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    )}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      mergeBackup(backupPreview);
                      setBackupPreview(null);
                      setBackupDone(
                        "Merged successfully — new leads and groups added.",
                      );
                    }}
                    className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => {
                      if (
                        !window.confirm(
                          "This will replace ALL your current data. Are you sure?",
                        )
                      )
                        return;
                      restoreBackup(backupPreview);
                      setBackupPreview(null);
                      setBackupDone("Restored successfully.");
                    }}
                    className="text-sm font-medium bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Replace all
                  </button>
                  <button
                    onClick={() => {
                      setBackupPreview(null);
                      setBackupDone("");
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section id="notifications-section">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Notifications
        </h3>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 space-y-5">
          {notifPermission === "unsupported" && (
            <p className="text-sm text-slate-500">
              Notifications are not supported in this browser.
            </p>
          )}

          {notifPermission !== "unsupported" && (
            <>
              {/* Master toggle + permission */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm font-medium">
                    Enable notifications
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    {notifPermission === "denied"
                      ? "Permission denied — enable in browser settings"
                      : notifPermission === "granted"
                        ? "Permission granted"
                        : "Permission not yet granted"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {notifPermission !== "granted" &&
                    notifPermission !== "denied" && (
                      <button
                        onClick={async () => {
                          const result = await requestPermission();
                          setNotifPermission(result);
                          if (result === "granted")
                            setNotificationSettings({ enabled: true });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900/50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Allow
                      </button>
                    )}
                  <button
                    onClick={() => {
                      if (notifPermission !== "granted") return;
                      setNotificationSettings({
                        enabled: !notifSettings.enabled,
                      });
                    }}
                    disabled={notifPermission !== "granted"}
                    className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      notifSettings.enabled ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        notifSettings.enabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sub-settings */}
              {notifSettings.enabled && (
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Notify me about
                  </p>
                  {[
                    {
                      key: "overdue",
                      label: "Overdue follow-ups",
                      desc: "When a follow-up date has passed",
                    },
                    {
                      key: "dueToday",
                      label: "Due today",
                      desc: "Follow-ups scheduled for today",
                    },
                    {
                      key: "stale",
                      label: "Going stale",
                      desc: "Leads with no recent contact",
                    },
                  ].map(({ key, label, desc }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-slate-300 text-sm">{label}</p>
                        <p className="text-slate-600 text-xs">{desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotificationSettings({
                            [key]: !notifSettings[key],
                          })
                        }
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          notifSettings[key] !== false
                            ? "bg-blue-600"
                            : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            notifSettings[key] !== false
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Groups ── */}
      <section id="groups-section">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Groups ({groups.length})
        </h3>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-8 text-center">
            <p className="text-slate-600 text-sm">No groups yet.</p>
            <p className="text-slate-700 text-xs mt-1">
              Groups let you segment leads by region or campaign.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 px-5 py-4 bg-slate-900/20 hover:bg-slate-800/30 transition-colors"
              >
                {editingGroupId === g.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameGroup(g.id, editingGroupName);
                          setEditingGroupId(null);
                        }
                        if (e.key === "Escape") setEditingGroupId(null);
                      }}
                      className="flex-1 bg-slate-800 border border-blue-500 text-slate-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        renameGroup(g.id, editingGroupName);
                        setEditingGroupId(null);
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-100 font-medium text-base flex-1">
                      {g.name}
                    </p>
                    <button
                      onClick={() => {
                        setEditingGroupId(g.id);
                        setEditingGroupName(g.name);
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors mr-2"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => setDeleteGroupTarget(g)}
                      className="text-sm text-slate-600 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add group */}
        <div className="mt-3 flex gap-2">
          <input
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value);
              setGroupError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!newGroupName.trim()) {
                  setGroupError("Name required");
                  return;
                }
                addGroup(newGroupName);
                setNewGroupName("");
              }
            }}
            placeholder="New group name…"
            className={`flex-1 bg-slate-800/60 border ${groupError ? "border-red-500" : "border-slate-700"} text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors`}
          />
          <button
            onClick={() => {
              if (!newGroupName.trim()) {
                setGroupError("Name required");
                return;
              }
              addGroup(newGroupName);
              setNewGroupName("");
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            Add
          </button>
        </div>
        {groupError && (
          <p className="text-xs text-red-400 mt-1">{groupError}</p>
        )}
      </section>

      {/* ── Custom columns ── */}
      {/* Existing custom columns */}
      <section id="columns-section">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Custom Columns ({customColumns.length})
        </h3>

        {customColumns.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-slate-600 text-sm">No custom columns yet.</p>
            <p className="text-slate-700 text-xs mt-1">
              Create one below to add it to your lead table.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {customColumns.map((col) => {
              const typeLabel =
                FIELD_TYPES.find((t) => t.value === col.type)?.label ??
                col.type;
              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between px-5 py-4 bg-slate-900/20 hover:bg-slate-800/30 transition-colors"
                >
                  <div>
                    <p className="text-slate-100 font-medium text-base">
                      {col.label}
                    </p>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {typeLabel}
                      {col.options && (
                        <span className="text-slate-600">
                          {" "}
                          · {col.options.join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(col)}
                    className="text-sm text-slate-600 hover:text-red-400 transition-colors ml-4 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Create new column */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Create New Column
        </h3>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-6 space-y-5">
          {/* Column name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Column Name <span className="text-blue-500">*</span>
            </label>
            <input
              value={form.label}
              onChange={(e) => setField("label", e.target.value)}
              placeholder="e.g. Region, Decision Maker, Estimated Budget"
              className={`w-full bg-slate-800/60 border ${
                errors.label ? "border-red-500" : "border-slate-700"
              } text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors`}
            />
            {errors.label && (
              <p className="text-xs text-red-400">{errors.label}</p>
            )}
          </div>

          {/* Field type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Field Type{" "}
              <span className="text-slate-600 normal-case font-normal">
                (locked after creation)
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setField("type", t.value)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    form.type === t.value
                      ? "border-blue-500 bg-blue-950/40 text-blue-300"
                      : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Options — only for select type */}
          {form.type === "select" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Dropdown Options <span className="text-blue-500">*</span>
              </label>
              <input
                value={form.options}
                onChange={(e) => setField("options", e.target.value)}
                placeholder="Simi Valley, Moorpark, Thousand Oaks, Other"
                className={`w-full bg-slate-800/60 border ${
                  errors.options ? "border-red-500" : "border-slate-700"
                } text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors`}
              />
              <p className="text-xs text-slate-600">
                Comma-separated. These options can't be changed later.
              </p>
              {errors.options && (
                <p className="text-xs text-red-400">{errors.options}</p>
              )}
              {/* Preview */}
              {form.options && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parseOptions(form.options).map((opt) => (
                    <span
                      key={opt}
                      className="text-xs bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Create Column
            </button>
            {successMsg && (
              <p className="text-sm text-green-400">{successMsg}</p>
            )}
          </div>
        </div>
      </section>

      {/* Delete group modal */}
      {deleteGroupTarget && (
        <DeleteConfirmModal
          col={deleteGroupTarget}
          label={deleteGroupTarget.name}
          onConfirm={() => {
            deleteGroup(deleteGroupTarget.id);
            setDeleteGroupTarget(null);
          }}
          onCancel={() => setDeleteGroupTarget(null)}
        />
      )}

      {/* Delete column modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          col={deleteTarget}
          onConfirm={() => {
            deleteCustomColumn(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
