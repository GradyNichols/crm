import { useState } from "react";
import { researchStaleReason } from "../constants";

// ── LeadResearch ────────────────────────────────────────────────────────────────
// What a check of the lead's website found.
//
// Two kinds of content, styled apart on purpose:
//   - Findings are evidence. Code fetched the site and saw these, so they're
//     neutral slate with a link to the page they came from.
//   - The rating and the one-line reason are Claude's opinion of that evidence,
//     so they get the purple used for generated content and say so.
// Mixing the two is exactly how a guess ends up read aloud as a fact.

const OPPORTUNITY = {
  high: {
    label: "High opportunity",
    cls: "border-emerald-800 bg-emerald-950/30 text-emerald-300",
  },
  medium: {
    label: "Medium opportunity",
    cls: "border-amber-800 bg-amber-950/30 text-amber-300",
  },
  low: {
    label: "Low opportunity",
    cls: "border-slate-700 bg-slate-800/40 text-slate-400",
  },
};

const shortSource = (url) => {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    const s = `${u.hostname.replace(/^www\./, "")}${path}`;
    return s.length > 42 ? `${s.slice(0, 40)}…` : s;
  } catch {
    return "";
  }
};

function Finding({ item }) {
  const src = shortSource(item.source);
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-slate-200 text-sm leading-relaxed">{item.text}</p>
        {src && (
          <a
            href={item.source}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-600 hover:text-blue-400 transition-colors break-all"
          >
            {src} ↗
          </a>
        )}
      </div>
    </li>
  );
}

// Neutral context worth a glance — what it's built on and who handles orders.
function contextLine(checks = {}) {
  const bits = [];
  if (checks.thirdParty) return "";
  if (checks.platform) bits.push(`Built with ${checks.platform}`);
  if (checks.ordering?.host) bits.push(`Ordering via ${checks.ordering.host}`);
  if (checks.reservations?.host)
    bits.push(`Reservations via ${checks.reservations.host}`);
  if (checks.linksChecked) bits.push(`${checks.linksChecked} links checked`);
  return bits.join(" · ");
}

export default function LeadResearch({ lead }) {
  const [showMore, setShowMore] = useState(false);
  const r = lead?.research;
  if (!r) return null;

  const stale = researchStaleReason(lead);
  const findings = r.findings || [];
  const leading = findings.filter((f) => f.lead);
  const more = findings.filter((f) => !f.lead);
  const opp = OPPORTUNITY[r.opportunity];
  const context = contextLine(r.checks);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 space-y-4">
      {stale && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
          <span className="text-amber-500 text-xs mt-0.5 shrink-0">!</span>
          <p className="text-amber-500/90 text-xs leading-relaxed">
            {stale} — check again before relying on this.
          </p>
        </div>
      )}

      {/* Nothing was verified, so there is nothing to rate. Saying "medium
          opportunity" here would be an opinion with no evidence under it. */}
      {r.visibility === "blocked" ? (
        <div className="space-y-2">
          <p className="text-slate-300 text-sm leading-relaxed">
            Couldn't check this site.{" "}
            {r.visibilityNote
              ? `${r.visibilityNote.charAt(0).toUpperCase()}${r.visibilityNote.slice(1)}.`
              : ""}
          </p>
          <p className="text-slate-600 text-xs leading-relaxed">
            That's about their security setup, not their website — plenty of
            restaurant platforms block automated visitors. Open it yourself to
            judge it.
          </p>
          {lead.website && (
            <a
              href={
                lead.website.startsWith("http")
                  ? lead.website
                  : `https://${lead.website}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open their site ↗
            </a>
          )}
        </div>
      ) : r.assessed && opp ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${opp.cls}`}
            >
              {opp.label}
            </span>
            <span className="text-xs text-slate-600">
              {r.confidence} confidence
            </span>
            {r.likelyChain && (
              <span className="text-xs text-amber-500/90">
                · looks like a chain
              </span>
            )}
          </div>
          {r.reason && (
            <p className="text-sm text-purple-300/90 leading-relaxed">
              <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-purple-400 mr-1.5">
                Claude's read
              </span>
              {r.reason}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Not rated — the findings below are still verified.
        </p>
      )}

      {r.visibility &&
        !["full", "blocked"].includes(r.visibility) &&
        r.visibilityNote && (
          <p className="text-xs text-slate-500 leading-relaxed">
            Limited view: {r.visibilityNote}.
          </p>
        )}

      {/* Evidence */}
      {r.visibility !== "blocked" && (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
            {leading.length ? "Worth raising" : "Findings"}
          </p>
          {leading.length > 0 ? (
            <ul className="space-y-2.5">
              {leading.map((f) => (
                <Finding key={f.check} item={f} />
              ))}
            </ul>
          ) : more.length === 0 ? (
            <p className="text-sm text-slate-500">
              No problems found on what the check could read.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Nothing here is strong enough to lead a pitch with.
            </p>
          )}
        </div>
      )}

      {more.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showMore ? "Hide" : "Also found"} ({more.length})
          </button>
          {showMore && (
            <ul className="space-y-2.5">
              {more.map((f) => (
                <Finding key={f.check} item={f} />
              ))}
            </ul>
          )}
        </div>
      )}

      {context && <p className="text-xs text-slate-600">{context}</p>}
    </div>
  );
}
