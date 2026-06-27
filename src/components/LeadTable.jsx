import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLUMNS, STATUS_COLORS, STATUSES } from "../constants";
import { ICONS } from "../icons";
import useCRMStore from "../store/useCRMStore";

function StarRating({ value }) {
  return (
    <span className="text-amber-400 text-base tracking-tight">
      {"★".repeat(value)}
      <span className="text-slate-700">{"★".repeat(5 - value)}</span>
    </span>
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

// Inline status dropdown
function StatusCell({ lead }) {
  const updateLead = useCRMStore((s) => s.updateLead);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-sm px-3 py-1 rounded-full font-medium whitespace-nowrap transition-opacity hover:opacity-80 ${STATUS_COLORS[lead.status] || ""}`}
      >
        {lead.status}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-[#0d1117] border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[120px]">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                updateLead(lead.id, { status: s });
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-800 ${
                lead.status === s ? "text-blue-400" : "text-slate-300"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.split(" ")[0] || "bg-slate-600"}`}
              />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Notes log display inside expanded row
function NotesLog({ lead }) {
  const deleteNoteEntry = useCRMStore((s) => s.deleteNoteEntry);
  const log = lead.notesLog || [];
  if (log.length === 0)
    return <p className="text-sm text-slate-700 italic mt-2">No notes yet.</p>;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-600 uppercase tracking-widest">Notes</p>
      {[...log].reverse().map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-3 group"
        >
          <div className="flex items-start gap-2">
            <span className="text-slate-700 text-xs mt-0.5 whitespace-nowrap">
              {entry.ts}
            </span>
            <p className="text-sm text-slate-400">{entry.text}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNoteEntry(lead.id, entry.id);
            }}
            className="text-slate-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all shrink-0"
          >
            ×
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

export default function LeadTable({ leads, onEdit }) {
  const sortKey = useCRMStore((s) => s.sortKey);
  const sortDir = useCRMStore((s) => s.sortDir);
  const setSort = useCRMStore((s) => s.setSort);
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];
  const updateLead = useCRMStore((s) => s.updateLead);
  const deleteLead = useCRMStore((s) => s.deleteLead);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
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
                    className={`border-b border-slate-800/60 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"} hover:bg-slate-800/40`}
                  >
                    <td className="px-5 py-4 font-semibold whitespace-nowrap">
                      <Link
                        to={`/lead/${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-100 hover:text-blue-400 transition-colors"
                      >
                        {lead.businessName}
                      </Link>
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
                        onClick={() => setDeleteTarget(lead)}
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
                      <td colSpan={allColumns.length + 1} className="px-6 py-4">
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
            <div className="text-center py-16 text-slate-600 text-base">
              No leads yet — add your first one.
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-800">
          {sorted.map((lead) => (
            <div
              key={lead.id}
              className="p-5 space-y-2.5 cursor-pointer hover:bg-slate-800/30 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === lead.id ? null : lead.id)
              }
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/lead/${lead.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-100 font-semibold text-base hover:text-blue-400 transition-colors"
                >
                  {lead.businessName}
                </Link>
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusCell lead={lead} />
                </div>
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
                  <NotesLog lead={lead} />
                  <div
                    className="pt-2 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {groups.length > 0 && (
                      <div className="flex items-center gap-2">
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
                    <div className="flex gap-4">
                      <button
                        onClick={() => onEdit(lead)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(lead)}
                        className="text-sm text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-12 text-slate-600 text-base">
              No leads yet — add your first one.
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          lead={deleteTarget}
          onConfirm={() => {
            deleteLead(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < new Date().toISOString().slice(0, 10);
}
