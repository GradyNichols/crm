import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";
import { OUTREACH_TYPES } from "../constants";
import {
  buildQueries,
  groupProspects,
  prospectCounts,
  isNewProspect,
  needsCheck,
  liveProspects,
  prospectSubject,
  tierOf,
} from "../prospects";
import useResearch, { toResearch } from "../hooks/useResearch";

// ── Prospects ───────────────────────────────────────────────────────────────────
// Restaurants he hasn't got yet. A sweep asks Google Places who is out there,
// the list tiers them by what the app knows for certain, and Accept turns one
// into a real lead.
//
// Deliberately not a bottom-nav tab: this is a desk job, done occasionally,
// while Today and Leads are the daily ones. Nothing here changes what happens
// during a call or a walk-in.

const DEFAULT_AREAS = ["Simi Valley, CA", "Moorpark, CA", "Thousand Oaks, CA"];

// Six at a time: the batch size /api/research takes, and about a minute of
// PageSpeed runs. Checking a whole sweep would run for the better part of an
// hour, which is why tiers 1 and 2 are never checked at all.
const CHECK_BATCH = 6;

const cityOf = (address = "") => {
  const parts = String(address).split(",");
  return parts.length >= 3 ? parts[parts.length - 2].trim() : "";
};

function SiteChip({ item }) {
  if (!item.website)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-900/60">
        No website
      </span>
    );
  if (item.siteKind === "third_party")
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/30 text-amber-300 border border-amber-900/50">
        {item.siteLabel} page
      </span>
    );
  if (item.siteKind === "free_subdomain")
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/30 text-amber-300 border border-amber-900/50">
        {item.siteLabel} address
      </span>
    );
  return (
    <a
      href={
        item.website.startsWith("http")
          ? item.website
          : `https://${item.website}`
      }
      target="_blank"
      rel="noreferrer"
      className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
    >
      {item.siteLabel || item.website} ↗
    </a>
  );
}

// The accept sheet. Two decisions, both his: how he'll approach them, and which
// group they belong to. Everything else is copied from the prospect.
function AcceptSheet({ item, groups, onCancel, onAccept }) {
  const [type, setType] = useState(item.website ? "Walk-in" : "Walk-in");
  const [groupId, setGroupId] = useState("");

  return (
    <div className="rounded-lg border border-blue-900/50 bg-blue-950/15 px-4 py-4 space-y-3">
      <p className="text-slate-200 text-sm font-medium">
        Add {item.name} as a lead
      </p>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          How you'll reach them
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
        >
          {OUTREACH_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {groups.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Group
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
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
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAccept({ type, groupId: groupId || null })}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Add lead
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ProspectRow({
  item,
  isNew,
  groups,
  checking,
  onCheck,
  onAccept,
  onDismiss,
  onOpenLead,
}) {
  const [accepting, setAccepting] = useState(false);
  const city = cityOf(item.address);
  const finding = (item.research?.findings || []).find((f) => f.lead);

  return (
    <div className="px-4 py-3.5 bg-slate-900/20 hover:bg-slate-900/40 transition-colors space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-100 text-sm font-medium">{item.name}</p>
            {isNew && (
              <span className="text-[0.65rem] uppercase tracking-widest text-blue-400">
                New
              </span>
            )}
            {item.chain && (
              <span className="text-[0.65rem] uppercase tracking-widest text-amber-500/90">
                Chain?
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            {item.rating != null && (
              <span className="text-amber-400/90">
                ★ {item.rating} · {item.reviewCount}
              </span>
            )}
            {city && <span>{city}</span>}
            <SiteChip item={item} />
          </div>
          {finding && (
            <p className="text-slate-400 text-xs leading-relaxed">
              {finding.text}
            </p>
          )}
          {item.existingLeadId && (
            <button
              onClick={() => onOpenLead(item.existingLeadId)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Already in your leads →
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Only where a check would tell us something. A Facebook page or a
              free subdomain is already tier 2 — checking it can't improve on
              that, and it costs a minute of PageSpeed. Same rule the bulk
              button uses, so the two can't disagree. */}
          {needsCheck(item) && (
            <button
              onClick={onCheck}
              disabled={checking}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
            >
              {checking ? "Checking…" : "Check site"}
            </button>
          )}
          <button
            onClick={() => setAccepting((v) => !v)}
            className="text-xs font-semibold text-slate-200 border border-slate-700 hover:border-slate-500 px-3 py-1 rounded-lg transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-slate-600 hover:text-red-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {accepting && (
        <AcceptSheet
          item={item}
          groups={groups}
          onCancel={() => setAccepting(false)}
          onAccept={(opts) => {
            setAccepting(false);
            onAccept(opts);
          }}
        />
      )}
    </div>
  );
}

export default function Prospects() {
  const navigate = useNavigate();
  const prospecting = useCRMStore((s) => s.prospecting) ?? {
    items: {},
    lastSweepAt: null,
    sweepCount: 0,
  };
  const groups = useCRMStore((s) => s.groups) ?? [];

  const recordSweep = useCRMStore.getState().recordSweep;
  const acceptProspect = useCRMStore.getState().acceptProspect;
  const dismissProspect = useCRMStore.getState().dismissProspect;
  const setProspectResearch = useCRMStore.getState().setProspectResearch;

  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [customArea, setCustomArea] = useState("");
  const [keywords, setKeywords] = useState("restaurants");
  const [sweeping, setSweeping] = useState(false);
  const [sweepError, setSweepError] = useState("");
  const [sweepStats, setSweepStats] = useState(null);
  const [hideChains, setHideChains] = useState(true);
  const [hideExisting, setHideExisting] = useState(true);

  const {
    research,
    researchMany,
    pendingId,
    bulk,
    busy,
    error: researchError,
    notice,
  } = useResearch();

  // Research is stored on the prospect instead of a lead — same engine, same
  // verified findings, different home.
  const saveToProspect = (subject, data) => {
    const stored = toResearch(data);
    setProspectResearch(subject.id, stored);
    return stored;
  };

  const counts = prospectCounts(prospecting);
  const groupsOfProspects = groupProspects(prospecting, {
    hideChains,
    hideExisting,
  });
  const checkable = liveProspects(prospecting).filter(needsCheck);

  const toggleArea = (area) =>
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );

  const queries = buildQueries(
    customArea.trim() ? [...areas, customArea.trim()] : areas,
    keywords.split(",").map((k) => k.trim()),
  );

  const runSweep = async () => {
    if (sweeping || queries.length === 0) return;
    setSweeping(true);
    setSweepError("");
    setSweepStats(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      recordSweep(data.candidates || []);
      setSweepStats({
        ...data.stats,
        found: (data.candidates || []).length,
        errors: data.errors,
      });
    } catch (err) {
      setSweepError(err.message);
    } finally {
      setSweeping(false);
    }
  };

  const checkNext = () =>
    researchMany(checkable.slice(0, CHECK_BATCH).map(prospectSubject), {
      save: saveToProspect,
    });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors mt-1 shrink-0"
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
          <h2 className="text-2xl font-semibold text-slate-100">Prospects</h2>
          <p className="text-slate-500 text-sm mt-1">
            Restaurants in your territory that aren't leads yet. Accept the ones
            worth working.
          </p>
        </div>
      </div>

      {/* Sweep */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Where to look
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  areas.includes(area)
                    ? "border-blue-700 bg-blue-950/40 text-blue-300"
                    : "border-slate-700 text-slate-500 hover:text-slate-300"
                }`}
              >
                {area.replace(", CA", "")}
              </button>
            ))}
          </div>
          <input
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            placeholder="Somewhere else — e.g. Camarillo, CA"
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            What to search for
          </p>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="restaurants, mexican restaurants, cafes"
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-slate-600">
            Each word is searched in each area — {queries.length} search
            {queries.length === 1 ? "" : "es"}, up to 60 results each. Google
            bills per search, so a narrow sweep beats a broad one.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runSweep}
            disabled={sweeping || queries.length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {sweeping ? "Searching…" : "Find restaurants"}
          </button>
          {prospecting.lastSweepAt && (
            <p className="text-xs text-slate-600">
              Last search{" "}
              {new Date(prospecting.lastSweepAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {sweepError && <p className="text-xs text-red-400">{sweepError}</p>}
        {sweepStats && (
          <p className="text-xs text-slate-500">
            {sweepStats.found} restaurant{sweepStats.found === 1 ? "" : "s"}{" "}
            from {sweepStats.calls} search{sweepStats.calls === 1 ? "" : "es"}
            {sweepStats.notFood > 0 && ` · ${sweepStats.notFood} not food`}
            {sweepStats.closed > 0 && ` · ${sweepStats.closed} closed`}
          </p>
        )}
      </section>

      {/* Filters + bulk check */}
      {counts.total > 0 && (
        <section className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setHideChains((v) => !v)}
              className={`transition-colors ${hideChains ? "text-slate-300" : "text-slate-600 hover:text-slate-400"}`}
            >
              {hideChains ? "☑" : "☐"} Hide chains ({counts.chains})
            </button>
            <button
              onClick={() => setHideExisting((v) => !v)}
              className={`transition-colors ${hideExisting ? "text-slate-300" : "text-slate-600 hover:text-slate-400"}`}
            >
              {hideExisting ? "☑" : "☐"} Hide existing leads (
              {counts.alreadyLeads})
            </button>
          </div>
          {checkable.length > 0 && (
            <button
              onClick={checkNext}
              disabled={busy}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
            >
              {bulk
                ? `Checking ${bulk.done}/${bulk.total}…`
                : `Check ${Math.min(CHECK_BATCH, checkable.length)} site${
                    Math.min(CHECK_BATCH, checkable.length) === 1 ? "" : "s"
                  }`}
            </button>
          )}
        </section>
      )}

      {researchError && <p className="text-xs text-red-400">{researchError}</p>}
      {notice && !researchError && (
        <p className="text-xs text-amber-500/90">{notice}</p>
      )}

      {/* The list */}
      {counts.total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-10 text-center space-y-1">
          <p className="text-slate-500 text-sm">No prospects yet.</p>
          <p className="text-slate-700 text-xs max-w-sm mx-auto">
            Pick your areas above and search. Restaurants with no website of
            their own come out on top — those are the ones worth a walk-in.
          </p>
        </div>
      ) : groupsOfProspects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-10 text-center">
          <p className="text-slate-500 text-sm">
            Everything is filtered out. Turn a filter off above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupsOfProspects.map(({ tier, items }) => (
            <section key={tier.key} className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  {tier.label}{" "}
                  <span className="text-slate-700 normal-case font-normal">
                    ({items.length})
                  </span>
                </p>
                <p className="text-slate-600 text-xs mt-0.5">{tier.hint}</p>
              </div>
              <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
                {items.map((item) => (
                  <ProspectRow
                    key={item.placeId}
                    item={item}
                    isNew={isNewProspect(item, prospecting)}
                    groups={groups}
                    checking={pendingId === item.placeId || !!bulk}
                    onCheck={() =>
                      research(prospectSubject(item), { save: saveToProspect })
                    }
                    onAccept={(opts) => {
                      const leadId = acceptProspect(item.placeId, opts);
                      if (leadId)
                        navigate(`/lead/${leadId}`, {
                          state: { from: "/prospects" },
                        });
                    }}
                    onDismiss={() => dismissProspect(item.placeId)}
                    onOpenLead={(leadId) =>
                      navigate(`/lead/${leadId}`, {
                        state: { from: "/prospects" },
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Required when Places data is shown without a Google map. */}
      {counts.total > 0 && (
        <p className="text-xs text-slate-700 text-center">
          Business listings from Google Maps
        </p>
      )}
    </main>
  );
}
