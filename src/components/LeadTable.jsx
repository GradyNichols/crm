import { useState } from "react";
import { COLUMNS, STATUS_COLORS } from "../constants";
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
      className={`text-sm px-2.5 py-1 rounded-full font-medium ${colors[type] || "bg-slate-700 text-slate-300"}`}
    >
      {type}
    </span>
  );
}

// Custom delete confirmation modal
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
  const { sortKey, sortDir, setSort } = useCRMStore();
  const deleteLead = useCRMStore((s) => s.deleteLead);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // lead to confirm deletion

  const sorted = [...leads].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ col }) => {
    if (sortKey !== col)
      return <span className="text-slate-700 ml-1 text-xs">↕</span>;
    return (
      <span className="text-blue-400 ml-1 text-xs">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
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
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => setSort(col.key)}
                    className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none whitespace-nowrap"
                  >
                    {ICONS[col.icon] ?? null}
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
                <>
                  <tr
                    key={lead.id}
                    onClick={() =>
                      setExpandedId(expandedId === lead.id ? null : lead.id)
                    }
                    className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                      i % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"
                    } hover:bg-slate-800/40`}
                  >
                    <td className="px-5 py-4 text-slate-100 font-semibold whitespace-nowrap text-base">
                      {lead.businessName}
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {lead.ownerName || (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <TypeBadge type={lead.type} />
                    </td>
                    <td className="px-5 py-4">
                      <StarRating value={lead.strength} />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}
                      >
                        {lead.status}
                      </span>
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
                  {/* Expanded notes row */}
                  {expandedId === lead.id && (
                    <tr
                      key={`${lead.id}-expanded`}
                      className="bg-slate-900/50 border-b border-slate-800/60"
                    >
                      <td colSpan={8} className="px-6 py-4">
                        <div className="flex flex-wrap gap-5 text-sm text-slate-400">
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
                        </div>
                        {lead.notes && (
                          <p className="text-sm text-slate-500 mt-2 italic">
                            "{lead.notes}"
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {leads.length === 0 && (
            <div className="text-center py-16 text-slate-600 text-base">
              No leads yet — add your first one above.
            </div>
          )}
        </div>

        {/* Mobile card list */}
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
                <span className="text-slate-100 font-semibold text-base">
                  {lead.businessName}
                </span>
                <span
                  className={`text-sm px-2.5 py-0.5 rounded-full shrink-0 font-medium ${STATUS_COLORS[lead.status] || ""}`}
                >
                  {lead.status}
                </span>
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
                  {lead.notes && (
                    <p className="text-sm text-slate-500 italic">
                      "{lead.notes}"
                    </p>
                  )}
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
                      onClick={() => setDeleteTarget(lead)}
                      className="text-sm text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
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

      {/* Delete confirmation modal */}
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
