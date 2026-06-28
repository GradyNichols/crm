import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";

function formatPipeline(leads) {
  if (!leads.length) return "No leads in pipeline.";
  const today = new Date().toISOString().slice(0, 10);

  return leads
    .map((l) => {
      const lastNote = l.notesLog?.length
        ? [...l.notesLog].reverse()[0].text
        : "No notes";
      const daysSinceTouch = l.lastTouchDate
        ? Math.floor((new Date(today) - new Date(l.lastTouchDate)) / 86400000)
        : null;
      const followUpOverdue =
        l.followUpDate && l.followUpDate < today
          ? `OVERDUE since ${l.followUpDate}`
          : l.followUpDate
            ? `due ${l.followUpDate}`
            : "none set";

      return [
        `Business: ${l.businessName}`,
        `Status: ${l.status} | Strength: ${l.strength}/5 | Type: ${l.type}`,
        `Last touch: ${l.lastTouchDate ? `${l.lastTouchDate} (${daysSinceTouch}d ago)` : "never"}`,
        `Follow-up: ${followUpOverdue}`,
        `Latest note: ${lastNote}`,
      ].join("\n");
    })
    .join("\n\n");
}

// ── Section components ──────────────────────────────────────────────────────────

function UrgentCard({ item }) {
  return (
    <div className="flex gap-3 items-start px-4 py-3 rounded-lg bg-red-950/30 border border-red-900/40">
      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
      <div>
        <p className="text-slate-100 font-semibold text-sm">{item.lead}</p>
        <p className="text-slate-400 text-sm mt-0.5">{item.reason}</p>
      </div>
    </div>
  );
}

function StaleCard({ item }) {
  return (
    <div className="flex gap-3 items-start px-4 py-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
      <div>
        <p className="text-slate-100 font-semibold text-sm">{item.lead}</p>
        <p className="text-slate-400 text-sm mt-0.5">{item.reason}</p>
      </div>
    </div>
  );
}

function InsightRow({ text, index }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-xs font-bold text-slate-600 mt-0.5 w-4 shrink-0">
        {index + 1}.
      </span>
      <p className="text-slate-300 text-sm">{text}</p>
    </div>
  );
}

function NextStepRow({ text, index }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs text-slate-500 font-medium">{index + 1}</span>
      </div>
      <p className="text-slate-200 text-sm">{text}</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function AI() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const pipeline = formatPipeline(leads);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      searchParams.get("action") === "analyze" &&
      !loading &&
      !result &&
      leads.length > 0
    ) {
      setSearchParams({}, { replace: true });
      handleAnalyze();
    }
  }, [searchParams]);

  const isEmpty = leads.length === 0;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
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
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-slate-100">
            Pipeline Advisor
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            AI analysis of your {leads.length} lead
            {leads.length !== 1 ? "s" : ""}.
          </p>
        </div>
      </div>

      {/* Trigger */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-8 text-center space-y-4">
        {!result && !loading && (
          <>
            <div className="w-12 h-12 rounded-full bg-blue-950/60 border border-blue-900/50 flex items-center justify-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-slate-300 text-base font-medium">
                Ready to analyze your pipeline
              </p>
              <p className="text-slate-600 text-sm mt-1">
                {isEmpty
                  ? "Add some leads first before running an analysis."
                  : "Sends your lead data to Claude for a full pipeline review."}
              </p>
            </div>
          </>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-950/60 border border-blue-900/50 flex items-center justify-center mx-auto animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Analyzing your pipeline…</p>
          </div>
        )}

        {result && !loading && (
          <p className="text-slate-500 text-sm">
            Analysis complete. Run again anytime.
          </p>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || isEmpty}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Analyzing…" : result ? "Run Again" : "Analyze Pipeline"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4">
          <p className="text-red-400 text-sm font-medium">Error</p>
          <p className="text-red-400/70 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Urgent */}
          {result.urgent?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Urgent — Act Now
                </h3>
              </div>
              <div className="space-y-2">
                {result.urgent.map((item, i) => (
                  <UrgentCard key={i} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Stale */}
          {result.stale?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Going Stale
                </h3>
              </div>
              <div className="space-y-2">
                {result.stale.map((item, i) => (
                  <StaleCard key={i} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Insights */}
          {result.insights?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Pipeline Insights
                </h3>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4 space-y-3">
                {result.insights.map((text, i) => (
                  <InsightRow key={i} text={text} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Next steps */}
          {result.nextSteps?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Next Steps This Week
                </h3>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4 space-y-3">
                {result.nextSteps.map((text, i) => (
                  <NextStepRow key={i} text={text} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
