import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";

const FIELD_TYPES = [
  { value: "text", label: "Text", desc: "Free-form text entry" },
  { value: "number", label: "Number", desc: "Numeric values only" },
  { value: "date", label: "Date", desc: "Date picker" },
  { value: "select", label: "Dropdown", desc: "Pick from options you define" },
  { value: "checkbox", label: "Checkbox", desc: "Yes / No toggle" },
  { value: "stars", label: "Star Rating", desc: "1–5 stars" },
];

const EMPTY_FORM = { label: "", type: "text", options: "" };

function DeleteColModal({ col, onConfirm, onCancel }) {
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
              <span className="text-slate-300">"{col.label}"</span> and all its
              data will be permanently removed from every lead.
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

export default function Settings() {
  const navigate = useNavigate();
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const addCustomColumn = useCRMStore((s) => s.addCustomColumn);
  const deleteCustomColumn = useCRMStore((s) => s.deleteCustomColumn);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

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
            Manage custom columns for your lead table.
          </p>
        </div>
      </div>

      {/* Existing custom columns */}
      <section>
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

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteColModal
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
