import { useState } from "react";
import useCRMStore from "../store/useCRMStore";
import { emailStaleReason, EMAIL_KIND_LABELS } from "../constants";

// ── GeneratedEmail ──────────────────────────────────────────────────────────────
// A draft you can actually send. Trace has no mail transport, so the two exits
// are copy-to-clipboard (reliable, works with any client, survives long bodies)
// and a mailto: link (fewer taps, but URL-length limits and client quirks make it
// the convenience rather than the primary).
//
// Sending is invisible to the app, so "Log as sent" is what closes the loop —
// without it the email lives outside the touchpoint history and the lead looks
// untouched to every other screen.

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
      />
    </svg>
  );
}

export default function GeneratedEmail({ lead, onSent }) {
  const email = lead?.generatedEmail;
  const [copied, setCopied] = useState("");
  const [logged, setLogged] = useState(false);

  if (!email) return null;

  const stale = emailStaleReason(lead);
  const hasAddress = !!lead.email?.trim();
  const fullText = `Subject: ${email.subject}\n\n${email.body}`;

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("failed");
      setTimeout(() => setCopied(""), 2500);
    }
  };

  const mailto = `mailto:${encodeURIComponent(lead.email || "")}?subject=${encodeURIComponent(
    email.subject,
  )}&body=${encodeURIComponent(email.body)}`;

  const handleSent = () => {
    useCRMStore.getState().logTouchpoint(lead.id, {
      type: "Cold Email",
      note: `Sent: ${email.subject}`,
    });
    setLogged(true);
    onSent?.();
  };

  return (
    <div className="rounded-xl border border-sky-900/40 bg-sky-950/10 px-4 py-4 space-y-3">
      {stale && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
          <span className="text-amber-500 text-xs mt-0.5 shrink-0">!</span>
          <p className="text-amber-500/90 text-xs leading-relaxed">
            {stale} — this draft may be arguing from facts that have moved on.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-sky-400">
          {EMAIL_KIND_LABELS[email.kind] || "Email"}
        </span>
        <span className="text-slate-700 text-xs">
          {new Date(email.generatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Subject */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
            Subject
          </p>
          <button
            onClick={() => copy("subject", email.subject)}
            className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
          >
            {copied === "subject" ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-slate-100 text-base font-medium leading-snug">
          {email.subject}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
            Body
          </p>
          <button
            onClick={() => copy("body", email.body)}
            className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
          >
            {copied === "body" ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-3">
          {email.body}
        </p>
      </div>

      {copied === "failed" && (
        <p className="text-xs text-amber-500">
          Couldn't reach the clipboard — select the text and copy manually.
        </p>
      )}

      {/* Exits */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => copy("all", fullText)}
          className="flex-1 flex items-center justify-center gap-2 bg-sky-800/60 hover:bg-sky-700/60 text-sky-100 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <CopyIcon />
          {copied === "all" ? "Copied" : "Copy all"}
        </button>
        {hasAddress ? (
          <a
            href={mailto}
            className="flex-1 text-center border border-slate-700 hover:border-slate-500 text-slate-300 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Open in mail
          </a>
        ) : (
          <span
            className="flex-1 text-center border border-dashed border-slate-800 text-slate-700 text-xs py-2.5 rounded-lg"
            title="No email address on this lead"
          >
            No address on file
          </span>
        )}
      </div>

      {/* Trace can't see that you sent it — this is what keeps the lead's
          history honest. */}
      <button
        onClick={handleSent}
        disabled={logged}
        className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
          logged
            ? "text-green-400 cursor-default"
            : "text-slate-500 hover:text-slate-200"
        }`}
      >
        {logged ? "Logged as sent ✓" : "Log as sent"}
      </button>
    </div>
  );
}
