// Shared lead brief for the Anthropic-backed generators.
// Files under /api prefixed with "_" are not treated as routes by Vercel.
//
// Both pitch.js and email.js write from the same picture of a lead, so the
// picture is built in one place. Exported for unit tests: the entire value of
// these endpoints is that they're grounded in real lead data, so what goes into
// the prompt is the part worth checking.

export function buildLeadBrief(lead = {}) {
  const lines = [
    `Business: ${lead.businessName || "Unknown"}`,
    lead.ownerName ? `Owner: ${lead.ownerName}` : null,
    lead.address ? `Address: ${lead.address}` : null,
    `Outreach type: ${lead.type || "Walk-in"}`,
    `Status: ${lead.status || "Cold"} | Strength: ${lead.strength ?? "?"}/5`,
    lead.lastTouchDate
      ? `Last contacted: ${lead.lastTouchDate}${
          lead.daysSinceTouch != null ? ` (${lead.daysSinceTouch}d ago)` : ""
        }`
      : "Last contacted: never",
    lead.followUpDate ? `Follow-up due: ${lead.followUpDate}` : null,
  ].filter(Boolean);

  if (lead.website) {
    lines.push(`Current website: ${lead.website}`);
    if (lead.pageSpeed) {
      const { score, lcp, status } = lead.pageSpeed;
      lines.push(
        `Site speed (Google PageSpeed): performance score ${score}/100, largest contentful paint ${lcp}s — rated ${status}.`,
      );
    } else {
      lines.push("Site speed: not measured.");
    }
  } else {
    lines.push("Current website: none found.");
  }

  const notes = Array.isArray(lead.notes) ? lead.notes : [];
  lines.push(
    notes.length
      ? `\nTouchpoint history (oldest first):\n${notes.join("\n")}`
      : "\nTouchpoint history: none yet — this is a first contact.",
  );

  // ── Additive email-only context ──────────────────────────────────────────────
  // The pitch payload never carries these keys, so every block below is silent
  // for /api/pitch and only appears when the email endpoint supplies it.

  const custom = Array.isArray(lead.customFields) ? lead.customFields : [];
  if (lead.groupName || custom.length) {
    const extra = [
      lead.groupName ? `Group: ${lead.groupName}` : null,
      ...custom.map((f) => `${f.label}: ${f.value}`),
    ].filter(Boolean);
    lines.push(`\nWhat else he tracks on this lead:\n${extra.join("\n")}`);
  }

  if (lead.pitchAngle) {
    lines.push(
      `\nThe angle his pitch script already takes with this restaurant:\n"${lead.pitchAngle}"`,
    );
  }

  if (lead.socialProof && lead.socialProof.closed > 0) {
    const { closed, areas } = lead.socialProof;
    const where = areas && areas.length ? ` in ${areas.join(", ")}` : "";
    lines.push(
      `\nHis track record: ${closed} restaurant${
        closed === 1 ? "" : "s"
      }${where} have hired him. These are counts from his own pipeline — never name a client, never round them up.`,
    );
  }

  if (lead.today) lines.push(`\nToday's date: ${lead.today}`);

  if (lead.portfolioUrl) lines.push(`\nMy portfolio: ${lead.portfolioUrl}`);
  if (lead.senderName) lines.push(`His first name: ${lead.senderName}`);

  return lines.join("\n");
}
