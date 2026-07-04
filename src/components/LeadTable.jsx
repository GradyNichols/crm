import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  COLUMNS,
  STATUS_COLORS,
  STATUSES,
  isAging,
  daysSinceTouch,
} from "../constants";
import { ICONS } from "../icons";
import useCRMStore from "../store/useCRMStore";
import EmptyState from "./EmptyState";

function StarRating({ value }) {
  return (
    <span className="text-amber-400 text-base tracking-tight">
      {"★".repeat(value)}
      <span className="text-slate-700">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function Checkbox({ checked, onChange, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick ? onClick(e) : onChange(!checked);
      }}
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? "bg-blue-600 border-blue-600"
          : "border-slate-600 hover:border-blue-400 bg-transparent"
      }`}
    >
      {checked && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-2.5 h-2.5 text-white"
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
  );
}

function AgingDot({ lead }) {
  if (!isAging(lead)) return null;
  const days = daysSinceTouch(lead);
  const label =
    days === null ? "Never contacted" : `${days} days without contact`;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse"
      title={label}
    />
  );
}

function TypeBadge({ type }) {
  const colors = {
    "Walk-in": "bg-teal-900/60 text-teal-300",
    "Cold Email": "bg-slate-700 text-slate-300",
    "Phone Call": "bg-indigo-900/60 text-indigo-300",
    "Yelp Message": "bg-orange-900/60 text-orange-300",
  };
  return (
    <span
      className={`text-sm px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${colors[type] || "bg-slate-700 text-slate-300"}`}
    >
      {type}
    </span>
  );
}

function CustomCell({ col, value }) {
  if (value === undefined || value === null || value === "")
    return <span className="text-slate-700">—</span>;
  if (col.type === "checkbox")
    return (
      <span className={value ? "text-green-400" : "text-slate-600"}>
        {value ? "✓ Yes" : "✗ No"}
      </span>
    );
  if (col.type === "stars") return <StarRating value={Number(value)} />;
  return <span className="text-slate-300">{String(value)}</span>;
}

function StatusCell({ lead }) {
  const updateLead = useCRMStore((s) => s.updateLead);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={lead.status}
        onChange={(e) => {
          updateLead(lead.id, { status: e.target.value });
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 border border-blue-500 text-slate-100 text-sm rounded-lg px-2 py-0.5 focus:outline-none"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`text-sm px-3 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${STATUS_COLORS[lead.status] || ""}`}
    >
      {lead.status}
    </span>
  );
}

function NotesLog({ lead }) {
  const deleteNoteEntry = useCRMStore((s) => s.deleteNoteEntry);
  const log = [...(lead.notesLog || [])].reverse();
  if (!log.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {log.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2 group/note">
          <div className="flex-1 min-w-0">
            <span className="text-slate-500 text-xs">{entry.ts} — </span>
            <span className="text-slate-400 text-xs">{entry.text}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNoteEntry(lead.id, entry.id);
            }}
            className="text-slate-700 hover:text-red-400 opacity-0 group-hover/note:opacity-100 transition-all shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3"
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
        </div>
      ))}
    </div>
  );
}

function DeleteConfirmModal({ lead, onConfirm, onCancel }) {
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
              Delete lead?
            </h3>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-slate-300">{lead.businessName}</span> will
              be permanently removed.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadTable({
  leads,
  onEdit,
  selectMode = false,
  onExitSelect,
}) {
  const sortKey = useCRMStore((s) => s.sortKey);
  const sortDir = useCRMStore((s) => s.sortDir);
  const setSort = useCRMStore((s) => s.setSort);
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];
  const deleteLead = useCRMStore((s) => s.deleteLead);
  const updateLead = useCRMStore((s) => s.updateLead);

  const [expandedId, setExpandedId] = useState(null);

  // Clear selection when select mode is turned off
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!selectMode) {
      setSelected(new Set());
      setBulkStatus("");
    }
  }, [selectMode]);

  const allColumns = [
    ...COLUMNS,
    ...customColumns.map((c) => ({ key: c.id, label: c.label, custom: true })),
  ];

  const sorted = [...leads].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === sorted.length
        ? new Set()
        : new Set(sorted.map((l) => l.id)),
    );
  const clearSelect = () => setSelected(new Set());

  const handleBulkStatus = () => {
    if (!bulkStatus) return;
    selected.forEach((id) => updateLead(id, { status: bulkStatus }));
    clearSelect();
    setBulkStatus("");
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => deleteLead(id));
    clearSelect();
    setBulkDeleteConfirm(false);
    onExitSelect?.();
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3 h-3 inline-block ml-1 mb-0.5 text-slate-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 9l4-4 4 4M16 15l-4 4-4-4"
          />
        </svg>
      );
    return sortDir === "asc" ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3 h-3 inline-block ml-1 mb-0.5 text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 15l4-4 4 4" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3 h-3 inline-block ml-1 mb-0.5 text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 9l-4 4-4-4" />
      </svg>
    );
  };

  return (
    <>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                {selectMode && (
                  <th className="pl-5 py-4 w-8">
                    <Checkbox
                      checked={
                        sorted.length > 0 && selected.size === sorted.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                )}
                {allColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => setSort(col.key)}
                    className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none whitespace-nowrap"
                  >
                    {col.icon ? ICONS[col.icon] : null}
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead, i) => (
                <React.Fragment key={lead.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === lead.id ? null : lead.id)
                    }
                    className={`border-b border-slate-800/60 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"} hover:bg-slate-800/40 ${selected.has(lead.id) ? "bg-blue-950/20" : ""}`}
                  >
                    {selectMode && (
                      <td
                        className="pl-5 py-4 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                    )}
                    <td className="px-5 py-4 font-semibold whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <Link
                          to={`/lead/${lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-100 hover:text-blue-400 transition-colors"
                        >
                          {lead.businessName}
                        </Link>
                        <AgingDot lead={lead} />
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {lead.ownerName || (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <TypeBadge type={lead.type} />
                    </td>
                    <td className="px-5 py-4">
                      <StarRating value={lead.strength} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusCell lead={lead} />
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                      {lead.lastTouchDate || (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm whitespace-nowrap">
                      {lead.followUpDate ? (
                        <span
                          className={
                            isOverdue(lead.followUpDate)
                              ? "text-red-400 font-semibold"
                              : "text-slate-400"
                          }
                        >
                          {lead.followUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    {customColumns.map((col) => (
                      <td
                        key={col.id}
                        className="px-5 py-4 text-sm whitespace-nowrap"
                      >
                        <CustomCell col={col} value={lead[col.id]} />
                      </td>
                    ))}
                    <td
                      className="px-5 py-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onEdit(lead)}
                        className="text-sm text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const snapshot = { ...lead };
                          deleteLead(lead.id);
                          const timer = setTimeout(
                            () => setUndoToast(null),
                            4000,
                          );
                          setUndoToast({ lead: snapshot, timer });
                        }}
                        className="text-sm text-slate-600 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr
                      key={`${lead.id}-exp`}
                      className="bg-slate-900/50 border-b border-slate-800/60"
                    >
                      <td
                        colSpan={allColumns.length + (selectMode ? 3 : 2)}
                        className="px-6 py-4"
                      >
                        <div className="flex flex-wrap gap-5 text-sm text-slate-400 items-center">
                          {lead.phone && (
                            <span>
                              {ICONS.phone}
                              {lead.phone}
                            </span>
                          )}
                          {lead.email && (
                            <span>
                              {ICONS.email}
                              {lead.email}
                            </span>
                          )}
                          {lead.address && (
                            <span>
                              {ICONS.location}
                              {lead.address}
                            </span>
                          )}
                          {groups.length > 0 && (
                            <span className="flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3.5 h-3.5 opacity-50 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                                />
                              </svg>
                              <select
                                value={lead.groupId || ""}
                                onChange={(e) =>
                                  updateLead(lead.id, {
                                    groupId: e.target.value || null,
                                  })
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/80 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                              >
                                <option value="">No group</option>
                                {groups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                            </span>
                          )}
                        </div>
                        <NotesLog lead={lead} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <EmptyState
              type="leads"
              title="No leads yet"
              subtitle="Add your first restaurant lead to get started tracking your outreach."
            />
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-800">
          {sorted.map((lead) => (
            <div
              key={lead.id}
              className={`p-5 space-y-2.5 cursor-pointer hover:bg-slate-800/30 transition-colors ${selected.has(lead.id) ? "bg-blue-950/20" : ""}`}
              onClick={() =>
                setExpandedId(expandedId === lead.id ? null : lead.id)
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectMode && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </div>
                  )}
                  <span className="flex items-center gap-2 min-w-0">
                    <Link
                      to={`/lead/${lead.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-100 font-semibold text-base hover:text-blue-400 transition-colors truncate"
                    >
                      {lead.businessName}
                    </Link>
                    <AgingDot lead={lead} />
                  </span>
                </div>
                <StatusCell lead={lead} />
              </div>
              <div className="flex items-center gap-3">
                <TypeBadge type={lead.type} />
                <StarRating value={lead.strength} />
              </div>
              {lead.followUpDate && (
                <p
                  className={`text-sm ${isOverdue(lead.followUpDate) ? "text-red-400 font-semibold" : "text-slate-500"}`}
                >
                  Follow-up: {lead.followUpDate}
                </p>
              )}
              {expandedId === lead.id && (
                <div className="pt-3 space-y-1.5 border-t border-slate-800/60 mt-2">
                  {lead.phone && (
                    <p className="text-sm text-slate-400">
                      {ICONS.phone}
                      {lead.phone}
                    </p>
                  )}
                  {lead.email && (
                    <p className="text-sm text-slate-400">
                      {ICONS.email}
                      {lead.email}
                    </p>
                  )}
                  {lead.address && (
                    <p className="text-sm text-slate-400">
                      {ICONS.location}
                      {lead.address}
                    </p>
                  )}
                  {customColumns.map(
                    (col) =>
                      lead[col.id] !== undefined && (
                        <p key={col.id} className="text-sm text-slate-400">
                          <span className="text-slate-600">{col.label}: </span>
                          <CustomCell col={col} value={lead[col.id]} />
                        </p>
                      ),
                  )}
                  {groups.length > 0 && (
                    <div
                      className="flex items-center gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs text-slate-600">Group:</span>
                      <select
                        value={lead.groupId || ""}
                        onChange={(e) =>
                          updateLead(lead.id, {
                            groupId: e.target.value || null,
                          })
                        }
                        className="bg-slate-800/80 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="">No group</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <NotesLog lead={lead} />
                  <div
                    className="flex gap-4 pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onEdit(lead)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const snapshot = { ...lead };
                        deleteLead(lead.id);
                        const timer = setTimeout(
                          () => setUndoToast(null),
                          4000,
                        );
                        setUndoToast({ lead: snapshot, timer });
                      }}
                      className="text-sm text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bulk toolbar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl px-4 py-3">
          <span className="text-sm text-slate-400 mr-1 whitespace-nowrap">
            {selected.size} selected
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Set status…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkStatus}
            disabled={!bulkStatus}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Apply
          </button>
          <div className="w-px h-5 bg-slate-700 mx-1" />
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950/40 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => {
              clearSelect();
              onExitSelect?.();
            }}
            className="text-slate-600 hover:text-slate-400 transition-colors ml-1 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBulkDeleteConfirm(false);
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
                  Delete {selected.size} lead{selected.size !== 1 ? "s" : ""}?
                </h3>
                <p className="text-slate-500 text-sm mt-0.5">
                  This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="text-sm font-medium bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single delete confirm */}
      {/* Undo toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl px-4 py-3">
          <span className="text-sm text-slate-300">
            Deleted{" "}
            <span className="text-slate-100 font-medium">
              {undoToast.lead.businessName}
            </span>
          </span>
          <button
            onClick={() => {
              clearTimeout(undoToast.timer);
              // Restore lead with original ID directly into store state
              useCRMStore.setState((s) => ({
                leads: [undoToast.lead, ...s.leads],
              }));
              setUndoToast(null);
            }}
            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < new Date().toISOString().slice(0, 10);
}
