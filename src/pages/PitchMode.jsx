import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { STATUS_COLORS, stopPathFor } from "../constants";
import FinishStopModal, {
  INTEREST_OPTIONS,
} from "../components/FinishStopModal";
import GeneratedPitch from "../components/GeneratedPitch";
import useGeneratePitch from "../hooks/useGeneratePitch";

const SPEED_STYLES = {
  bad: { bg: "bg-red-600", ring: "ring-red-400", label: "SLOW SITE" },
  warn: { bg: "bg-amber-600", ring: "ring-amber-400", label: "NEEDS WORK" },
  good: { bg: "bg-green-600", ring: "ring-green-400", label: "FAST SITE" },
};

// ── Speed flash banner ─────────────────────────────────────────────────────────
function SpeedFlashBanner({ cached }) {
  if (!cached) return null;
  const style = SPEED_STYLES[cached.status];
  return (
    <div
      className={`rounded-2xl ${style.bg} ring-4 ${style.ring} px-5 py-4 flex items-center justify-between shadow-lg`}
    >
      <div>
        <p className="text-white text-4xl font-black tabular-nums leading-none">
          {cached.lcp !== null ? `${cached.lcp}s` : "—"}
        </p>
        <p className="text-white/90 text-xs font-bold tracking-widest mt-1.5">
          {style.label} · LCP
        </p>
      </div>
      <div className="text-right">
        <p className="text-white text-3xl font-bold tabular-nums leading-none">
          {cached.score}
        </p>
        <p className="text-white/80 text-xs mt-1.5">Perf Score</p>
      </div>
    </div>
  );
}

// ── Pitch script cards ───────────────────────────────────────────────────────────
function PitchScripts({ scripts }) {
  const [index, setIndex] = useState(0);
  if (scripts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-6 text-center space-y-1">
        <p className="text-slate-500 text-sm">No pitch scripts marked yet.</p>
        <a
          href="/reference"
          className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
        >
          Mark a Reference card with the pin icon →
        </a>
      </div>
    );
  }

  const script = scripts[index];

  return (
    <div className="rounded-xl border border-purple-900/40 bg-purple-950/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-900/30">
        <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest">
          {script.title}
        </p>
        {scripts.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setIndex((i) => (i === 0 ? scripts.length - 1 : i - 1))
              }
              className="p-1 text-slate-600 hover:text-slate-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <span className="text-slate-700 text-xs">
              {index + 1}/{scripts.length}
            </span>
            <button
              onClick={() => setIndex((i) => (i + 1) % scripts.length)}
              className="p-1 text-slate-600 hover:text-slate-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
      <p className="px-4 py-4 text-slate-200 text-base leading-relaxed whitespace-pre-wrap">
        {script.body}
      </p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export default function PitchMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const leads = useCRMStore((s) => s.leads) ?? [];
  const refSections = useCRMStore((s) => s.refSections) ?? [];
  const portfolioUrl = useCRMStore((s) => s.portfolioUrl) ?? "";
  const pageSpeedCache = useCRMStore((s) => s.pageSpeedCache) ?? {};
  const dailyPlan = useCRMStore((s) => s.dailyPlan) ?? [];
  const activeRun = useCRMStore((s) => s.activeRun);

  const updateLead = useCRMStore.getState().updateLead;
  const logTouchpoint = useCRMStore.getState().logTouchpoint;
  const checkOffPlan = useCRMStore.getState().checkOffPlan;
  const setPageSpeed = useCRMStore.getState().setPageSpeed;
  const completeRunStop = useCRMStore.getState().completeRunStop;
  const skipRunStop = useCRMStore.getState().skipRunStop;
  const {
    generate: generatePitch,
    pendingId: pitchPending,
    error: pitchError,
  } = useGeneratePitch();

  const lead = leads.find((l) => l.id === id);

  const [showFinish, setShowFinish] = useState(false);
  const [speedChecking, setSpeedChecking] = useState(false);
  const [speedError, setSpeedError] = useState("");

  // Reset transient state whenever we jump to a new lead
  useEffect(() => {
    setShowFinish(false);
    setSpeedChecking(false);
    setSpeedError("");
  }, [id]);

  if (!lead) {
    return (
      <div className="fixed inset-0 bg-[#03060f] flex items-center justify-center">
        <p className="text-slate-500">Lead not found.</p>
      </div>
    );
  }

  // ── Run context ───────────────────────────────────────────────────────────────
  // Only true when this lead is a stop in the run that's actually in progress.
  const runIndex = activeRun ? activeRun.queue.indexOf(lead.id) : -1;
  const inRun = runIndex !== -1;
  const runTotal = activeRun ? activeRun.queue.length : 0;

  const pitchScripts = refSections
    .flatMap((sec) => sec.cards)
    .filter((c) => c.isPitchScript);

  const lastNote = lead.notesLog?.length
    ? [...lead.notesLog].reverse()[0]
    : null;

  const handleCheckSpeed = async () => {
    if (!lead.website?.trim()) return;
    setSpeedChecking(true);
    setSpeedError("");
    try {
      const res = await fetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lead.website.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setPageSpeed(lead.website.trim(), data);
    } catch (err) {
      setSpeedError(err.message);
    } finally {
      setSpeedChecking(false);
    }
  };

  const getNextPendingLeadId = () => {
    const pending = dailyPlan.filter(
      (i) => !i.checkedAt && i.leadId !== lead.id,
    );
    return pending.length > 0 ? pending[0].leadId : null;
  };

  // Where to go once this stop is closed out. Inside a run the store owns the
  // cursor, so we read it back after the write rather than guessing here.
  const goToNextStop = () => {
    const {
      activeRun: runAfter,
      lastRun,
      leads: freshLeads,
    } = useCRMStore.getState();
    if (runAfter) {
      const nextLead = freshLeads.find(
        (l) => l.id === runAfter.queue[runAfter.cursor],
      );
      navigate(stopPathFor(runAfter.mode, nextLead));
      return;
    }
    if (lastRun) {
      navigate("/run");
      return;
    }
    navigate("/today");
  };

  const handleSkipStop = () => {
    skipRunStop(lead.id);
    goToNextStop();
  };

  const handleFinish = ({ interested, followUpDate, notes, nextAction }) => {
    const opt = INTEREST_OPTIONS.find((o) => o.key === interested);

    // Update status + follow-up
    updateLead(lead.id, {
      status: opt.status,
      followUpDate: followUpDate || "",
    });

    // Log a combined touchpoint
    const parts = [];
    if (notes.trim()) parts.push(notes.trim());
    if (nextAction.trim()) parts.push(`Next: ${nextAction.trim()}`);
    if (parts.length > 0) {
      logTouchpoint(lead.id, {
        type: "Walk-in",
        note: `[Pitch: ${interested}] ${parts.join(" — ")}`,
      });
    } else {
      logTouchpoint(lead.id, { type: "Walk-in", note: "" });
    }

    setShowFinish(false);

    if (inRun) {
      // Records the outcome, mirrors it into today's plan, advances the cursor.
      completeRunStop(lead.id, interested);
      goToNextStop();
      return;
    }

    // ── No run: the original Daily Plan auto-advance, unchanged ────────────────
    const nextId = getNextPendingLeadId();
    if (dailyPlan.some((i) => i.leadId === lead.id)) {
      checkOffPlan(lead.id);
    }
    if (nextId) navigate(`/pitch/${nextId}`);
    else navigate("/today");
  };

  return (
    <div className="px-4 sm:px-6 pb-24 sm:pb-4 pt-24 mx-auto fixed left-0 right-0 max-w-3xl inset-0 bg-[#03060f] flex flex-col overflow-hidden">
      {/* Scrollable content */}
      {/* min-h-0 so this actually becomes a bounded scroll box rather than
          growing past the fixed parent and getting clipped — same failure mode
          that was cutting off Call Prep. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5 scrollbar-none">
        {/* Header */}
        <div className="flex items-center justify-between px-0 pt-6 pb-4 shrink-0">
          <button
            onClick={() =>
              inRun
                ? navigate("/run")
                : navigate(`/lead/${id}`, { state: location.state })
            }
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
          <span className="text-xs text-purple-400 uppercase tracking-widest font-medium">
            Pitch Mode
            {inRun && (
              <span className="text-slate-600 normal-case tracking-normal">
                {" "}
                · stop {runIndex + 1} of {runTotal}
              </span>
            )}
          </span>
          <div className="w-9" />
        </div>

        {/* Business info */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 leading-tight">
            {lead.businessName}
          </h1>
          {lead.ownerName && (
            <p className="text-slate-400 text-lg mt-1">{lead.ownerName}</p>
          )}
          {lead.address && (
            <p className="text-slate-600 text-sm mt-1">{lead.address}</p>
          )}

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}
            >
              {lead.status}
            </span>
            <span className="text-amber-400 text-base">
              {"★".repeat(lead.strength)}
              <span className="text-slate-700">
                {"★".repeat(5 - lead.strength)}
              </span>
            </span>
          </div>
        </div>

        {/* Portfolio + Call quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {portfolioUrl ? (
            <a
              href={
                portfolioUrl.startsWith("http")
                  ? portfolioUrl
                  : `https://${portfolioUrl}`
              }
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-900/50 bg-blue-950/20 text-blue-400 text-sm font-medium py-3 hover:border-blue-700 transition-colors"
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
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
              Portfolio
            </a>
          ) : (
            <a
              href="/settings?action=pitch-mode"
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 text-slate-600 text-xs py-3 hover:border-slate-700 transition-colors"
            >
              Set portfolio in Settings
            </a>
          )}

          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-green-900/50 bg-green-950/20 text-green-400 text-sm font-medium py-3 hover:border-green-700 transition-colors"
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
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                />
              </svg>
              Quick Call
            </a>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-700 text-xs py-3">
              No phone on file
            </div>
          )}
        </div>

        {/* Site speed */}
        {lead.website ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Site Speed
              </p>
              <button
                onClick={handleCheckSpeed}
                disabled={speedChecking}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
              >
                {speedChecking
                  ? "Checking…"
                  : pageSpeedCache[lead.website.trim()]
                    ? "Re-check"
                    : "Check Speed"}
              </button>
            </div>
            {speedError && <p className="text-xs text-red-400">{speedError}</p>}
            {speedChecking && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-6 text-center">
                <p className="text-slate-500 text-sm animate-pulse">
                  Running PageSpeed check…
                </p>
              </div>
            )}
            {!speedChecking && (
              <SpeedFlashBanner cached={pageSpeedCache[lead.website.trim()]} />
            )}
          </div>
        ) : null}

        {/* Last note */}
        {lastNote && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">
              Last note
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {lastNote.text}
            </p>
            <p className="text-slate-700 text-xs mt-1">{lastNote.ts}</p>
          </div>
        )}

        {/* This lead's own pitch, written from its history. Sits above the
            Reference cards because it's specific and they're general. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              This Lead's Pitch
            </p>
            {!pitchPending && (
              <button
                onClick={() => generatePitch(lead)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {lead.generatedPitch ? "Rewrite" : "Write one"}
              </button>
            )}
          </div>

          {pitchError && <p className="text-xs text-red-400">{pitchError}</p>}

          {pitchPending === lead.id ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-6 text-center">
              <p className="text-slate-500 text-sm animate-pulse">
                Writing a pitch from this lead's history…
              </p>
            </div>
          ) : lead.generatedPitch ? (
            <GeneratedPitch lead={lead} compact />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-5 text-center space-y-1">
              <p className="text-slate-500 text-sm">
                No pitch written for {lead.businessName} yet.
              </p>
              <p className="text-slate-700 text-xs">
                Takes a few seconds — worth doing before you get out of the car.
              </p>
            </div>
          )}
        </div>

        {/* Stable hand-written material */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Reference Scripts
          </p>
          <PitchScripts scripts={pitchScripts} />
        </div>
      </div>

      {/* Finish Pitch CTA */}
      <div className="px-6 pb-6 pt-3 border-t border-slate-800 shrink-0 space-y-2">
        <button
          onClick={() => setShowFinish(true)}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-base font-semibold py-3.5 rounded-xl transition-colors"
        >
          Finish Pitch
        </button>
        {inRun && runTotal > 1 && (
          <button
            onClick={handleSkipStop}
            className="w-full text-sm text-slate-500 hover:text-slate-300 py-1.5 transition-colors"
          >
            Nobody home — skip to next stop
          </button>
        )}
      </div>

      {showFinish && (
        <FinishStopModal
          lead={lead}
          kind="pitch"
          onSave={handleFinish}
          onCancel={() => setShowFinish(false)}
        />
      )}
    </div>
  );
}
