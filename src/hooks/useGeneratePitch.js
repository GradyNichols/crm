import { useState } from "react";
import useCRMStore from "../store/useCRMStore";
import { daysSinceTouch } from "../constants";

// ── Pitch generation ────────────────────────────────────────────────────────────
// One hook behind every trigger — Lead Detail, Pitch Mode, Call Prep, the
// Pipeline Advisor, and the bulk prep on Run Overview — so the request shape, the
// snapshot stamped onto each result, and the error handling can't drift.
//
// `pendingId` is the lead currently generating on its own, which lets a list show
// a spinner on exactly one row. `bulk` tracks a batch run separately.

// Keep in step with MAX_BATCH in api/pitch.js.
const CHUNK = 6;

// Everything the endpoint needs to write something specific to THIS lead.
// Trimmed to the last 12 touchpoints: older history stops changing the pitch and
// starts costing tokens.
function buildPayload(lead, pageSpeedCache, portfolioUrl) {
  const cached = lead.website ? pageSpeedCache[lead.website.trim()] : null;
  return {
    id: lead.id,
    businessName: lead.businessName,
    ownerName: lead.ownerName || "",
    address: lead.address || "",
    website: lead.website || "",
    type: lead.type || "Walk-in",
    status: lead.status,
    strength: lead.strength,
    lastTouchDate: lead.lastTouchDate || "",
    followUpDate: lead.followUpDate || "",
    daysSinceTouch: daysSinceTouch(lead),
    notes: (lead.notesLog || []).slice(-12).map((n) => `[${n.ts}] ${n.text}`),
    pageSpeed: cached
      ? { score: cached.score, lcp: cached.lcp, status: cached.status }
      : null,
    portfolioUrl: portfolioUrl || "",
  };
}

// The snapshot a pitch was written against — see isPitchStale() in constants.
function snapshot(lead, pageSpeedCache) {
  const cached = lead.website ? pageSpeedCache?.[lead.website.trim()] : null;
  return {
    status: lead.status,
    notesCount: (lead.notesLog || []).length,
    lastTouchDate: lead.lastTouchDate || "",
    speedScore: cached?.score ?? null,
  };
}

const chunk = (arr, size) =>
  arr.reduce(
    (out, item, i) => (
      i % size ? out[out.length - 1].push(item) : out.push([item]),
      out
    ),
    [],
  );

// Leads worth spending a call on: no pitch yet. An existing pitch is never
// silently overwritten — rewriting is always an explicit single-lead action.
export function needsPitch(lead) {
  return !!lead && !lead.generatedPitch;
}

export default function useGeneratePitch() {
  const [pendingId, setPendingId] = useState(null);
  const [bulk, setBulk] = useState(null); // { done, total }
  const [error, setError] = useState("");

  const busy = !!pendingId || !!bulk;

  const generate = async (lead) => {
    if (!lead || busy) return null;
    setPendingId(lead.id);
    setError("");

    const { pageSpeedCache, portfolioUrl, setLeadPitch } =
      useCRMStore.getState();

    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: buildPayload(lead, pageSpeedCache ?? {}, portfolioUrl),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const pitch = {
        ...data,
        generatedAt: new Date().toISOString(),
        basedOn: snapshot(lead, pageSpeedCache),
      };
      setLeadPitch(lead.id, pitch);
      return pitch;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setPendingId(null);
    }
  };

  // Prep a whole queue in as few calls as possible. Chunks sequentially so a
  // long queue doesn't fire six requests at once, and writes each chunk's
  // results as they land — a failure partway through keeps what already
  // succeeded rather than throwing the batch away.
  const generateMany = async (leadList) => {
    const targets = (leadList || []).filter(needsPitch);
    if (busy || targets.length === 0) return { written: 0, failed: 0 };

    setError("");
    setBulk({ done: 0, total: targets.length });

    const { pageSpeedCache, portfolioUrl, setLeadPitch } =
      useCRMStore.getState();
    let written = 0;
    let lastError = "";

    for (const group of chunk(targets, CHUNK)) {
      try {
        const res = await fetch("/api/pitch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: group.map((l) =>
              buildPayload(l, pageSpeedCache ?? {}, portfolioUrl),
            ),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");

        const generatedAt = new Date().toISOString();
        for (const l of group) {
          const p = data.pitches?.[l.id];
          if (!p) continue;
          setLeadPitch(l.id, {
            ...p,
            generatedAt,
            basedOn: snapshot(l, pageSpeedCache),
          });
          written += 1;
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
        lastError ||
          `${failed} of ${targets.length} pitches came back empty. Try again.`,
      );
    }
    return { written, failed };
  };

  return {
    generate,
    generateMany,
    pendingId,
    bulk,
    busy,
    error,
    clearError: () => setError(""),
  };
}
