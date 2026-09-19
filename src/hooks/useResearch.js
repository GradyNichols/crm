import { useState } from "react";
import useCRMStore from "../store/useCRMStore";
import { buildResearchSubject } from "../leadContext";
import { researchStaleReason } from "../constants";

// ── Site research ───────────────────────────────────────────────────────────────
// The single path to /api/research, same contract as useGeneratePitch:
// `pendingId` for one lead, `bulk` for a batch, one run at a time.
//
// Nothing here researches automatically. A check fetches someone else's site and
// costs a model call, so it only ever happens because a button was pressed.

// Keep in step with MAX_BATCH in api/research.js.
const CHUNK = 6;

// A PageSpeed result younger than this is passed along instead of re-run —
// PSI is the slowest part of a check.
const SPEED_REUSE_DAYS = 7;

const chunk = (arr, size) =>
  arr.reduce(
    (out, item, i) => (
      i % size ? out[out.length - 1].push(item) : out.push([item]),
      out
    ),
    [],
  );

export function canResearch(lead) {
  return !!lead?.website?.trim();
}

// Has a site and either no research yet or research that no longer holds.
export function needsResearch(lead) {
  return canResearch(lead) && (!lead.research || !!researchStaleReason(lead));
}

export function reusableSpeed(cache, website, now = new Date()) {
  const c = website ? cache?.[website.trim()] : null;
  if (!c?.checkedAt) return null;
  const age = now - new Date(c.checkedAt);
  return age >= 0 && age < SPEED_REUSE_DAYS * 86400000 ? c : null;
}

// Endpoint response → the object that gets stored. Transport-only fields are
// dropped here so every caller stores the same shape.
export function toResearch(data = {}) {
  const { speedFetched, assessError, truncated, error, raw, ...research } =
    data;
  return research;
}

// Endpoint response → stored research. A PageSpeed run the server did on our
// behalf also lands in pageSpeedCache, so the Site Speed panel and the pitch
// see it without a second check.
export function saveResearch(lead, data) {
  const { setLeadResearch, setPageSpeed } = useCRMStore.getState();
  const research = toResearch(data);
  setLeadResearch(lead.id, research);
  // `speedFetched` is a transport field: toResearch() strips it, so read it
  // from the response rather than from the stored object.
  if (data?.speedFetched && research.speed && lead.website?.trim()) {
    setPageSpeed(lead.website.trim(), {
      url: research.checks?.finalUrl || research.checks?.url || lead.website,
      ...research.speed,
    });
  }
  return research;
}

const UNRATED =
  "Couldn't get a rating this time — the findings shown are still verified.";

// The endpoint knows why it couldn't rate something; a generic message hides it.
const unratedNotice = (data) =>
  data?.assessError ? `Couldn't get a rating: ${data.assessError}` : UNRATED;

export default function useResearch() {
  const [pendingId, setPendingId] = useState(null);
  const [bulk, setBulk] = useState(null); // { done, total }
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const busy = !!pendingId || !!bulk;

  // `save` is how the same engine serves two homes: leads store research on the
  // lead, prospects store it on the prospect. Everything else — the request,
  // the error handling, the one-at-a-time rule — stays shared.
  const research = async (lead, { save = saveResearch } = {}) => {
    if (!lead || busy) return null;
    if (!canResearch(lead)) {
      setError("This lead has no website to check.");
      return null;
    }
    setPendingId(lead.id);
    setError("");
    setNotice("");

    const { pageSpeedCache } = useCRMStore.getState();
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: buildResearchSubject(
            lead,
            reusableSpeed(pageSpeedCache, lead.website),
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      // A site that blocked the check isn't "unrated" — the card explains it.
      if (data.assessError || (!data.assessed && data.visibility !== "blocked"))
        setNotice(unratedNotice(data));
      return save(lead, data);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setPendingId(null);
    }
  };

  // For checking a list at once (Prospects, later). Sequential chunks; each
  // chunk's results are saved as they land, so a failure keeps what succeeded.
  const researchMany = async (leadList, { save = saveResearch } = {}) => {
    const targets = (leadList || []).filter(needsResearch);
    if (busy || targets.length === 0) return { written: 0, failed: 0 };

    setError("");
    setNotice("");
    setBulk({ done: 0, total: targets.length });

    const { pageSpeedCache } = useCRMStore.getState();
    let written = 0;
    let unrated = 0;
    let lastError = "";
    let lastUnrated = "";

    for (const group of chunk(targets, CHUNK)) {
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjects: group.map((l) =>
              buildResearchSubject(l, reusableSpeed(pageSpeedCache, l.website)),
            ),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Check failed");
        for (const l of group) {
          const r = data.results?.[l.id];
          if (!r) continue;
          save(l, r);
          written += 1;
          if (!r.assessed && r.visibility !== "blocked") {
            unrated += 1;
            lastUnrated = unratedNotice(data);
          }
        }
      } catch (err) {
        lastError = err.message;
      }
      setBulk((b) =>
        b ? { ...b, done: Math.min(b.done + group.length, b.total) } : b,
      );
    }

    setBulk(null);
    const failed = targets.length - written;
    if (failed > 0) {
      setError(
        lastError || `${failed} of ${targets.length} checks didn't come back.`,
      );
    }
    if (unrated > 0) setNotice(lastUnrated || UNRATED);
    return { written, failed };
  };

  return {
    research,
    researchMany,
    pendingId,
    bulk,
    busy,
    error,
    notice,
    clearError: () => {
      setError("");
      setNotice("");
    },
  };
}
