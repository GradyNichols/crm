import { useState, useEffect, useRef, useMemo } from "react";
import useCRMStore from "../store/useCRMStore";
import { STATUSES, OUTREACH_TYPES } from "../constants";

const FIXED_STEPS = [
  {
    key: "businessName",
    label: "Business Name",
    type: "text",
    required: true,
    placeholder: "e.g. El Maizal",
  },
  {
    key: "phone",
    label: "Phone",
    type: "tel",
    required: false,
    placeholder: "(805) 555-0000",
    skippable: true,
  },
  {
    key: "ownerName",
    label: "Owner Name",
    type: "text",
    required: false,
    placeholder: "Optional",
    skippable: true,
  },
  {
    key: "address",
    label: "Address",
    type: "text",
    required: false,
    placeholder: "123 Main St, Simi Valley",
    skippable: true,
  },
  {
    key: "website",
    label: "Website",
    type: "text",
    required: false,
    placeholder: "restaurant.com (or leave blank if none)",
    skippable: true,
  },
  {
    key: "type",
    label: "Outreach Type",
    type: "select",
    required: false,
    options: OUTREACH_TYPES,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: false,
    options: STATUSES,
  },
  { key: "strength", label: "Strength", type: "strength", required: false },
  {
    key: "followUpDate",
    label: "Follow-up Date",
    type: "date",
    required: false,
    skippable: true,
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    required: false,
    placeholder: "Anything worth remembering…",
    skippable: true,
  },
];

const EMPTY_FIXED = {
  businessName: "",
  phone: "",
  ownerName: "",
  address: "",
  website: "",
  type: "Phone Call",
  status: "Cold",
  strength: 3,
  followUpDate: "",
  notes: "",
};

const FOLLOWUP_DAYS = { Warm: 3, Contacted: 7, Waiting: 5, Cold: 14 };

function suggestFollowUp(status) {
  const days = FOLLOWUP_DAYS[status];
  if (!days) return "";
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Map custom column type → spree step type
function colTypeToStepType(colType) {
  if (colType === "stars") return "strength";
  if (colType === "checkbox") return "checkbox";
  if (colType === "select") return "customSelect";
  if (colType === "number") return "number";
  if (colType === "date") return "date";
  return "text";
}

export default function LeadSpree({ onClose }) {
  const addLead = useCRMStore((s) => s.addLead);
  const groups = useCRMStore((s) => s.groups) ?? [];
  const customColumns = useCRMStore((s) => s.customColumns) ?? [];

  // Build steps dynamically — fixed + custom columns
  const STEPS = useMemo(
    () => [
      ...FIXED_STEPS,
      ...customColumns.map((col) => ({
        key: col.id,
        label: col.label,
        type: colTypeToStepType(col.type),
        required: false,
        skippable: true,
        options: col.options, // for customSelect
        colType: col.type, // original col type
      })),
    ],
    [customColumns],
  );

  const buildEmptyForm = () => {
    const base = { ...EMPTY_FIXED };
    customColumns.forEach((col) => {
      base[col.id] =
        col.type === "checkbox" ? false : col.type === "stars" ? 3 : "";
    });
    return base;
  };

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(buildEmptyForm);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [groupId, setGroupId] = useState("");
  const inputRef = useRef(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [step]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const setValue = (val) => {
    setError("");
    if (current.key === "status") {
      const suggested = suggestFollowUp(val);
      setForm((f) => ({
        ...f,
        status: val,
        followUpDate: suggested || f.followUpDate,
      }));
    } else {
      setForm((f) => ({ ...f, [current.key]: val }));
    }
  };

  const advance = () => {
    if (current.required && !form[current.key]?.toString().trim()) {
      setError(`${current.label} is required.`);
      return;
    }
    if (isLast) saveLead();
    else setStep((s) => s + 1);
  };

  const skip = () => {
    if (isLast) saveLead();
    else setStep((s) => s + 1);
  };

  const saveLead = () => {
    if (!form.businessName.trim()) {
      setStep(0);
      setError("Business name is required.");
      return;
    }
    addLead({ ...form, groupId: groupId || null });
    setLastSaved(form.businessName);
    setSaved((n) => n + 1);
    setForm(buildEmptyForm());
    setStep(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && current.type !== "textarea") {
      e.preventDefault();
      advance();
    }
  };

  const value = form[current.key];

  // Progress bar — show custom column steps in a distinct color
  const isCustomStep = step >= FIXED_STEPS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-[#0d1117] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i < step
                      ? i >= FIXED_STEPS.length
                        ? "w-4 bg-purple-500"
                        : "w-4 bg-blue-500"
                      : i === step
                        ? i >= FIXED_STEPS.length
                          ? "w-6 bg-purple-400"
                          : "w-6 bg-blue-400"
                        : "w-1.5 bg-slate-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-600">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {saved > 0 && (
              <span className="text-xs text-green-400 font-medium">
                {saved} lead{saved !== 1 ? "s" : ""} added
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="Exit spree mode (Esc)"
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
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Last saved flash */}
        {lastSaved && (
          <div className="px-6 py-2 bg-green-950/30 border-b border-green-900/30">
            <p className="text-xs text-green-400">
              ✓ Saved <span className="font-medium">{lastSaved}</span> — ready
              for next lead
            </p>
          </div>
        )}

        {/* Step content */}
        <div className="px-6 py-8 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {current.label}
                {current.required && (
                  <span className="text-blue-500 ml-1">*</span>
                )}
              </label>
              {isCustomStep && (
                <span className="text-xs text-purple-400 border border-purple-900/50 px-1.5 py-0.5 rounded-full">
                  Custom
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-slate-100">
              {current.label}
            </p>
          </div>

          {/* text / tel */}
          {(current.type === "text" ||
            current.type === "tel" ||
            current.type === "number") && (
            <input
              ref={inputRef}
              type={current.type}
              value={value ?? ""}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={current.placeholder || ""}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-lg rounded-xl px-4 py-3 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          )}

          {/* date */}
          {current.type === "date" && (
            <div className="w-full overflow-hidden">
              <input
                ref={inputRef}
                type="date"
                value={value ?? ""}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ width: "100%", minWidth: 0 }}
                className="block w-full min-w-0 bg-slate-800/60 border border-slate-700 text-slate-100 text-base rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
              />
            </div>
          )}

          {/* textarea */}
          {current.type === "textarea" && (
            <textarea
              ref={inputRef}
              rows={3}
              value={value ?? ""}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) advance();
              }}
              placeholder={current.placeholder || ""}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-base rounded-xl px-4 py-3 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          )}

          {/* select (fixed) */}
          {current.type === "select" && (
            <div className="grid grid-cols-2 gap-2">
              {current.options.map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => {
                    setValue(opt);
                    setTimeout(advance, 120);
                  }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                    value === opt
                      ? "border-blue-500 bg-blue-950/40 text-blue-300"
                      : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <span className="text-xs text-slate-600 font-mono w-4">
                    {i + 1}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* customSelect (custom column dropdown) */}
          {current.type === "customSelect" && (
            <div className="grid grid-cols-2 gap-2">
              {(current.options || []).map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => {
                    setValue(opt);
                    setTimeout(advance, 120);
                  }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                    value === opt
                      ? "border-purple-500 bg-purple-950/40 text-purple-300"
                      : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <span className="text-xs text-slate-600 font-mono w-4">
                    {i + 1}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* strength / stars */}
          {current.type === "strength" && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Unlikely to close</span>
                <span>Almost certain</span>
              </div>
              <input
                ref={inputRef}
                type="range"
                min={1}
                max={5}
                value={value || 3}
                onChange={(e) => setValue(Number(e.target.value))}
                onKeyDown={handleKeyDown}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-center text-amber-400 text-2xl tracking-wider">
                {"★".repeat(value || 3)}
                <span className="text-slate-700">
                  {"★".repeat(5 - (value || 3))}
                </span>
              </p>
            </div>
          )}

          {/* checkbox */}
          {current.type === "checkbox" && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setValue(!value);
                  setTimeout(advance, 120);
                }}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-colors ${
                  value
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-slate-600 hover:border-blue-400"
                }`}
              >
                {value && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-blue-400"
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
              <div>
                <p className="text-slate-200 text-base font-medium">
                  {value ? "Yes" : "No"}
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Tap to toggle, then hit Next
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Group selector — first step only */}
          {step === 0 && groups.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs text-slate-600 uppercase tracking-widest">
                Assign to group
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-sm text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ← Back
              </button>
            )}
            {current.skippable && (
              <button
                onClick={skip}
                className="text-sm text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Skip →
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {current.type === "textarea" && (
              <p className="text-xs text-slate-600">⌘ Enter to continue</p>
            )}
            <button
              onClick={isLast ? saveLead : advance}
              className={`text-sm font-medium text-white px-5 py-2 rounded-lg transition-colors ${
                isCustomStep
                  ? "bg-purple-700 hover:bg-purple-600"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {isLast ? "Save Lead →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
