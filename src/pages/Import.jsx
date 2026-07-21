import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUSES, OUTREACH_TYPES } from "../constants";

// Lead fields available for mapping
const LEAD_FIELDS = [
  { key: "", label: "— Skip —" },
  { key: "businessName", label: "Business Name" },
  { key: "ownerName", label: "Owner Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "website", label: "Website" },
  { key: "type", label: "Type" },
  { key: "strength", label: "Strength (1-5)" },
  { key: "status", label: "Status" },
  { key: "lastTouchDate", label: "Last Touch Date" },
  { key: "followUpDate", label: "Follow-up Date" },
  { key: "notes", label: "Notes" },
];

// Naive CSV parser — handles quoted fields with commas
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (field !== "" || row.length > 0) {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
        }
        if (char === "\r" && next === "\n") i++;
      } else field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Guess a sensible default mapping based on header names
function guessMapping(headers) {
  const guesses = {
    business: "businessName",
    name: "businessName",
    owner: "ownerName",
    phone: "phone",
    tel: "phone",
    email: "email",
    mail: "email",
    address: "address",
    location: "address",
    website: "website",
    site: "website",
    url: "website",
    type: "type",
    outreach: "type",
    strength: "strength",
    rating: "strength",
    status: "status",
    "last touch": "lastTouchDate",
    lasttouch: "lastTouchDate",
    touched: "lastTouchDate",
    "follow-up": "followUpDate",
    followup: "followUpDate",
    "follow up": "followUpDate",
    notes: "notes",
    note: "notes",
  };
  return headers.map((h) => {
    const norm = h.trim().toLowerCase();
    for (const [key, field] of Object.entries(guesses)) {
      if (norm.includes(key)) return field;
    }
    return "";
  });
}

function normalizeStrength(val) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
}

function normalizeStatus(val) {
  if (!val) return "Cold";
  const match = STATUSES.find(
    (s) => s.toLowerCase() === val.trim().toLowerCase(),
  );
  return match || "Cold";
}

function normalizeType(val) {
  if (!val) return "Phone Call";
  const match = OUTREACH_TYPES.find(
    (t) => t.toLowerCase() === val.trim().toLowerCase(),
  );
  return match || "Phone Call";
}

export default function Import() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const addLeadsBulk = useCRMStore((s) => s.addLeadsBulk);
  const groups = useCRMStore((s) => s.groups) ?? [];

  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [imported, setImported] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => parseInput(e.target.result);
    reader.readAsText(file);
  };

  const parseInput = (text) => {
    setError("");
    setImported(null);
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      setError(
        "Could not find any data rows. Make sure the first row is a header.",
      );
      setRows([]);
      setHeaders([]);
      return;
    }
    const [headerRow, ...dataRows] = parsed;
    setRawText(text);
    setHeaders(headerRow);
    setRows(dataRows);
    setMapping(guessMapping(headerRow));
  };

  const handlePasteParse = () => {
    if (!rawText.trim()) {
      setError("Paste some CSV data first.");
      return;
    }
    parseInput(rawText);
  };

  const updateMapping = (colIndex, fieldKey) => {
    setMapping((prev) => {
      const next = [...prev];
      next[colIndex] = fieldKey;
      return next;
    });
  };

  const businessNameMapped = mapping.includes("businessName");

  const handleImport = () => {
    if (!businessNameMapped) {
      setError("You must map a column to Business Name.");
      return;
    }

    const newLeads = rows
      .map((row) => {
        const lead = {};
        mapping.forEach((field, i) => {
          if (!field) return;
          const val = (row[i] || "").trim();
          if (!val) return;
          if (field === "strength") lead.strength = normalizeStrength(val);
          else if (field === "status") lead.status = normalizeStatus(val);
          else if (field === "type") lead.type = normalizeType(val);
          else lead[field] = val;
        });
        // Defaults for unmapped required fields
        if (!lead.status) lead.status = "Cold";
        if (!lead.type) lead.type = "Phone Call";
        if (!lead.strength) lead.strength = 3;
        if (groupId) lead.groupId = groupId;
        return lead;
      })
      .filter((l) => l.businessName); // skip rows with no business name

    addLeadsBulk(newLeads);
    setImported(newLeads.length);
    setRows([]);
    setHeaders([]);
    setRawText("");
  };

  const reset = () => {
    setRawText("");
    setHeaders([]);
    setRows([]);
    setMapping([]);
    setImported(null);
    setError("");
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <h2 className="text-2xl font-semibold text-slate-100">
            Import Leads
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Paste or upload a CSV to add leads in bulk.
          </p>
        </div>
      </div>

      {/* Success state */}
      {imported !== null && (
        <div className="rounded-xl border border-green-900/50 bg-green-950/20 px-5 py-4 flex items-center justify-between">
          <p className="text-green-400 text-sm">
            Imported {imported} lead{imported !== 1 ? "s" : ""} successfully.
          </p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Import more
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Go to dashboard →
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Input */}
      {imported === null && rows.length === 0 && (
        <div className="space-y-4">
          {/* Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-xl border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/20 px-6 py-10 text-center cursor-pointer transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-slate-600 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-slate-400 text-sm">
              Drop a .csv file here, or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-700 uppercase tracking-widest">
              or paste
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Paste */}
          <div className="space-y-2">
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "Business Name,Phone,Status\nEl Maizal,(805) 555-0101,Warm\nLa Cocina,(805) 555-0184,Contacted"
              }
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 font-mono focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <button
              onClick={handlePasteParse}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Parse Data
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* Step 2: Column mapping + preview */}
      {imported === null && rows.length > 0 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4">
            <p className="text-sm text-slate-400">
              Found{" "}
              <span className="text-slate-100 font-medium">{rows.length}</span>{" "}
              row{rows.length !== 1 ? "s" : ""}. Map each column below, then
              review the preview.
            </p>
          </div>

          {/* Column mapping */}
          <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
            {headers.map((header, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3 bg-slate-900/20"
              >
                <span className="text-slate-300 text-sm font-medium flex-1 truncate">
                  {header || `Column ${i + 1}`}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-slate-700 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
                <select
                  value={mapping[i] || ""}
                  onChange={(e) => updateMapping(i, e.target.value)}
                  className="bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors shrink-0"
                >
                  {LEAD_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!businessNameMapped && (
            <p className="text-sm text-amber-400">
              ⚠ Map a column to "Business Name" to continue.
            </p>
          )}

          {/* Group assignment */}
          {groups.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assign to group (optional)
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
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

          {/* Preview table */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Preview (first 5 rows)
            </p>
            <div className="rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800">
                    {mapping.map(
                      (field, i) =>
                        field && (
                          <th
                            key={i}
                            className="px-4 py-2 text-left text-xs text-slate-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {LEAD_FIELDS.find((f) => f.key === field)?.label}
                          </th>
                        ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-slate-800/60 last:border-0"
                    >
                      {mapping.map(
                        (field, i) =>
                          field && (
                            <td
                              key={i}
                              className="px-4 py-2 text-slate-300 whitespace-nowrap"
                            >
                              {row[i] || (
                                <span className="text-slate-700">—</span>
                              )}
                            </td>
                          ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!businessNameMapped}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Import {rows.length} Lead{rows.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
