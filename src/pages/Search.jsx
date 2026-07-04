import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS } from "../constants";

export default function Search() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const results =
    q.length === 0
      ? []
      : leads.filter((l) =>
          [
            l.businessName,
            l.ownerName,
            l.phone,
            l.email,
            l.address,
            l.notes,
            l.status,
            l.type,
          ].some((field) => field && field.toLowerCase().includes(q)),
        );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
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
          <h2 className="text-2xl font-semibold text-slate-100">Search</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Search across all lead fields.
          </p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Business name, owner, phone, status…"
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-base rounded-xl pl-10 pr-4 py-3 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Results */}
      {q.length > 0 && (
        <div>
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">
            {results.length === 0
              ? "No results"
              : `${results.length} result${results.length !== 1 ? "s" : ""}`}
          </p>

          {results.length > 0 && (
            <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
              {results.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/lead/${lead.id}`}
                  className="block px-5 py-4 bg-slate-900/20 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-slate-100 font-semibold text-base">
                        <Highlight text={lead.businessName} query={q} />
                      </p>
                      {lead.ownerName && (
                        <p className="text-slate-400 text-sm">
                          <Highlight text={lead.ownerName} query={q} />
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
                        {lead.phone && (
                          <span>
                            <Highlight text={lead.phone} query={q} />
                          </span>
                        )}
                        {lead.email && (
                          <span>
                            <Highlight text={lead.email} query={q} />
                          </span>
                        )}
                        {lead.address && (
                          <span>
                            <Highlight text={lead.address} query={q} />
                          </span>
                        )}
                      </div>
                      {lead.notes && (
                        <p className="text-slate-600 text-sm italic truncate">
                          "<Highlight text={lead.notes} query={q} />"
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`text-sm px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[lead.status] || ""}`}
                      >
                        {lead.status}
                      </span>
                      <span className="text-xs text-slate-600 whitespace-nowrap">
                        {lead.type}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {q.length === 0 && (
        <EmptyState
          type="search"
          title="Search your leads"
          subtitle="Search by name, phone, email, status, notes and more."
        />
      )}
    </main>
  );
}

// Highlights matching substring in text
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-blue-500/30 text-blue-200 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
