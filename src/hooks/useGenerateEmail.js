import { useState } from "react";
import useCRMStore from "../store/useCRMStore";
import { buildEmailPayload, leadSnapshot } from "../leadContext";
import { inferEmailKind } from "../constants";

// ── Email generation ────────────────────────────────────────────────────────────
// Same contract as useGeneratePitch, one lead at a time. Deliberately no bulk
// path: you read an email before you send it, so generating eight of them at
// once produces a queue of drafts you still have to open one by one. Pitches are
// different — you prep a run and glance at each as you arrive.
//
// The portfolio URL is a hard precondition, not a nice-to-have. The email exists
// to send them to the work; without a link there is nothing to write toward, so
// the hook refuses rather than producing something vague.

export function canGenerateEmail(portfolioUrl) {
  return !!(portfolioUrl && portfolioUrl.trim());
}

export default function useGenerateEmail() {
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState("");

  const generate = async (lead, kind) => {
    if (!lead || pendingId) return null;

    const {
      pageSpeedCache,
      portfolioUrl,
      setLeadEmail,
      leads,
      customColumns,
      groups,
      senderName,
    } = useCRMStore.getState();

    if (!canGenerateEmail(portfolioUrl)) {
      setError(
        "Set your portfolio URL in Settings first — the email exists to send them there.",
      );
      return null;
    }

    const chosen = kind || inferEmailKind(lead);
    setPendingId(lead.id);
    setError("");

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: buildEmailPayload(lead, {
            pageSpeedCache: pageSpeedCache ?? {},
            portfolioUrl,
            leads: leads ?? [],
            customColumns: customColumns ?? [],
            groups: groups ?? [],
            senderName: senderName ?? "",
          }),
          kind: chosen,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const email = {
        subject: data.subject,
        body: data.body,
        kind: data.kind || chosen,
        generatedAt: new Date().toISOString(),
        basedOn: leadSnapshot(lead, pageSpeedCache),
      };
      setLeadEmail(lead.id, email);
      return email;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setPendingId(null);
    }
  };

  return { generate, pendingId, error, clearError: () => setError("") };
}
