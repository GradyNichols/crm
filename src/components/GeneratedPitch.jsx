import { useState } from "react";
import { pitchStaleReason } from "../constants";

// ── GeneratedPitch ──────────────────────────────────────────────────────────────
// Renders a per-lead pitch. Shared by Lead Detail (reading at a desk) and Pitch
// Mode (reading it while standing in a doorway), so it stays structured rather
// than a wall of prose — mid-conversation you want to jump straight to the
// objection you just heard, not scan a paragraph for it.

function Block({ label, children, accent = "text-slate-500" }) {
  if (!children) return null;
  return (
    <div className="space-y-1">
      <p
        className={`text-[0.7rem] font-semibold uppercase tracking-widest ${accent}`}
      >
        {label}
      </p>
      <p className="text-slate-200 text-base leading-relaxed">{children}</p>
    </div>
  );
}

function Objection({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
      >
        <span
          className={`text-slate-600 text-xs mt-0.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="text-slate-300 text-sm flex-1">
          "{item.objection}"
        </span>
      </button>
      {open && (
        <p className="px-3 pb-3 pl-8 text-slate-200 text-sm leading-relaxed">
          {item.response}
        </p>
      )}
    </div>
  );
}

export default function GeneratedPitch({ lead, compact = false }) {
  const pitch = lead?.generatedPitch;
  if (!pitch) return null;

  const stale = pitchStaleReason(lead);

  return (
    <div
      className={`rounded-xl border border-purple-900/40 bg-purple-950/10 ${
        compact ? "px-4 py-4" : "px-5 py-5"
      } space-y-4`}
    >
      {stale && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
          <span className="text-amber-500 text-xs mt-0.5 shrink-0">!</span>
          <p className="text-amber-500/90 text-xs leading-relaxed">
            {stale} — this pitch may be arguing from facts that have moved on.
          </p>
        </div>
      )}

      <Block label="Open with" accent="text-purple-400">
        {pitch.opener}
      </Block>
      <Block label="The hook" accent="text-purple-400">
        {pitch.hook}
      </Block>
      <Block label="The offer" accent="text-purple-400">
        {pitch.value}
      </Block>

      {pitch.objections?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-purple-400">
            If they say…
          </p>
          <div className="space-y-1.5">
            {pitch.objections.map((o, i) => (
              <Objection key={i} item={o} />
            ))}
          </div>
        </div>
      )}

      <Block label="Ask for" accent="text-purple-400">
        {pitch.close}
      </Block>
    </div>
  );
}
