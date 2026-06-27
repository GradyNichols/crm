import { useState, useEffect } from "react";
import { STATUSES, OUTREACH_TYPES } from "../constants";
import useCRMStore from "../store/useCRMStore";

const EMPTY_FORM = {
  businessName: "",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  type: "Phone Call",
  strength: 3,
  status: "Cold",
  lastTouchDate: "",
  followUpDate: "",
  notes: "", // used as "new note to append"
  groupId: null,
};

export default function LeadModal({ onClose, onSave, existing }) {
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];
  const groups = useCRMStore((s) => s.groups) ?? [];

  const buildForm = () => {
    if (!existing) return { ...EMPTY_FORM };
    // Strip notesLog — we only show add-note field in modal
    const { notesLog, ...rest } = existing;
    return { ...EMPTY_FORM, ...rest, notes: "" };
  };

  const [form, setForm] = useState(buildForm);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.businessName.trim()) e.businessName = "Required";
    if (!form.phone?.trim() && !form.email?.trim())
      e.phone = "Phone or email required";
    if (!form.status) e.status = "Required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave(form);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-8 px-4 pb-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">
            {existing ? "Edit Lead" : "Add Lead"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Business Name" required error={errors.businessName}>
            <input
              autoFocus
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="e.g. El Maizal"
              className={inputClass(errors.businessName)}
            />
          </Field>

          <Field label="Owner Name">
            <input
              value={form.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
              placeholder="Optional"
              className={inputClass()}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(805) 555-0000"
                className={inputClass(errors.phone)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="owner@restaurant.com"
                className={inputClass()}
              />
            </Field>
          </div>

          <Field label="Address">
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Main St, Simi Valley"
              className={inputClass()}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Outreach Type">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputClass()}
              >
                {OUTREACH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" required error={errors.status}>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass(errors.status)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {groups.length > 0 && (
            <Field label="Group">
              <select
                value={form.groupId || ""}
                onChange={(e) => set("groupId", e.target.value || null)}
                className={inputClass()}
              >
                <option value="">— No group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field
            label={`Strength: ${["", "★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"][form.strength]}`}
          >
            <input
              type="range"
              min={1}
              max={5}
              value={form.strength}
              onChange={(e) => set("strength", Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-0.5">
              <span>Unlikely</span>
              <span>Almost certain</span>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Last Touch Date">
              <input
                type="date"
                value={form.lastTouchDate}
                onChange={(e) => set("lastTouchDate", e.target.value)}
                className={inputClass()}
              />
            </Field>
            <Field label="Follow-up Date">
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => set("followUpDate", e.target.value)}
                className={inputClass()}
              />
            </Field>
          </div>

          <Field label={existing ? "Add a Note" : "Initial Note"}>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={
                existing
                  ? "Append a new note to history…"
                  : "First note (optional)…"
              }
              className={`${inputClass()} resize-none`}
            />
            {existing && (
              <p className="text-xs text-slate-700 mt-0.5">
                This will be added to the notes history, not replace it.
              </p>
            )}
          </Field>

          {/* Custom fields */}
          {customColumns.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Custom Fields
              </p>
              {customColumns.map((col) => (
                <Field key={col.id} label={col.label}>
                  <CustomFieldInput
                    col={col}
                    value={form[col.id]}
                    onChange={(val) => set(col.id, val)}
                  />
                </Field>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
          >
            {saved ? "✓ Saved" : existing ? "Save Changes" : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomFieldInput({ col, value, onChange }) {
  if (col.type === "text")
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      />
    );
  if (col.type === "number")
    return (
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      />
    );
  if (col.type === "date")
    return (
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      />
    );
  if (col.type === "select")
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      >
        <option value="">— Select —</option>
        {col.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  if (col.type === "checkbox")
    return (
      <div className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id={`check_${col.id}`}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-blue-500 cursor-pointer"
        />
        <label
          htmlFor={`check_${col.id}`}
          className="text-sm text-slate-400 cursor-pointer select-none"
        >
          {value ? "Yes" : "No"}
        </label>
      </div>
    );
  if (col.type === "stars") {
    const val = Number(value) || 1;
    return (
      <div className="space-y-1">
        <input
          type="range"
          min={1}
          max={5}
          value={val}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <p className="text-amber-400 text-sm">
          {"★".repeat(val)}
          <span className="text-slate-700">{"★".repeat(5 - val)}</span>
        </p>
      </div>
    );
  }
  return null;
}

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-blue-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function inputClass(error) {
  return `w-full bg-slate-800/60 border ${error ? "border-red-500" : "border-slate-700"} text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors`;
}
