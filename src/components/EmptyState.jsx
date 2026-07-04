import React from "react";

// Reusable illustrated empty state component

const illustrations = {
  leads: (
    <svg
      viewBox="0 0 200 160"
      className="w-40 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Table outline */}
      <rect
        x="20"
        y="30"
        width="160"
        height="100"
        rx="10"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Header row */}
      <rect
        x="20"
        y="30"
        width="160"
        height="28"
        rx="10"
        fill="#0d1117"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <rect x="35" y="41" width="40" height="6" rx="3" fill="#1e293b" />
      <rect x="85" y="41" width="30" height="6" rx="3" fill="#1e293b" />
      <rect x="125" y="41" width="40" height="6" rx="3" fill="#1e293b" />
      {/* Empty rows */}
      <rect x="35" y="72" width="130" height="6" rx="3" fill="#0f172a" />
      <rect x="35" y="90" width="100" height="6" rx="3" fill="#0f172a" />
      <rect x="35" y="108" width="115" height="6" rx="3" fill="#0f172a" />
      {/* Plus circle */}
      <circle
        cx="150"
        cy="130"
        r="18"
        fill="#1d4ed8"
        opacity="0.15"
        stroke="#3b82f6"
        strokeWidth="1.5"
      />
      <line
        x1="150"
        y1="123"
        x2="150"
        y2="137"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="143"
        y1="130"
        x2="157"
        y2="130"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),

  search: (
    <svg
      viewBox="0 0 200 160"
      className="w-40 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="88" cy="76" r="38" stroke="#1e293b" strokeWidth="2" />
      <circle cx="88" cy="76" r="26" stroke="#0f172a" strokeWidth="8" />
      <line
        x1="115"
        y1="103"
        x2="140"
        y2="128"
        stroke="#1e293b"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="76"
        y1="76"
        x2="100"
        y2="76"
        stroke="#1e293b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="88"
        y1="64"
        x2="88"
        y2="88"
        stroke="#1e293b"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),

  checklist: (
    <svg
      viewBox="0 0 200 160"
      className="w-40 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="40"
        y="25"
        width="120"
        height="110"
        rx="10"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Checkmarks */}
      <circle
        cx="62"
        cy="60"
        r="8"
        stroke="#22c55e"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M57 60l3.5 3.5L68 55"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <rect x="78" y="57" width="60" height="5" rx="2.5" fill="#0f172a" />
      <circle
        cx="62"
        cy="85"
        r="8"
        stroke="#22c55e"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M57 85l3.5 3.5L68 80"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <rect x="78" y="82" width="45" height="5" rx="2.5" fill="#0f172a" />
      {/* Empty item */}
      <circle cx="62" cy="110" r="8" stroke="#1e293b" strokeWidth="1.5" />
      <rect x="78" y="107" width="55" height="5" rx="2.5" fill="#0f172a" />
    </svg>
  ),

  reference: (
    <svg
      viewBox="0 0 200 160"
      className="w-40 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="30"
        y="20"
        width="90"
        height="120"
        rx="8"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <rect x="40" y="35" width="70" height="6" rx="3" fill="#0f172a" />
      <rect x="40" y="50" width="55" height="5" rx="2.5" fill="#0f172a" />
      <rect x="40" y="63" width="65" height="5" rx="2.5" fill="#0f172a" />
      <rect x="40" y="80" width="70" height="6" rx="3" fill="#0f172a" />
      <rect x="40" y="95" width="50" height="5" rx="2.5" fill="#0f172a" />
      {/* Second book behind */}
      <rect
        x="90"
        y="30"
        width="80"
        height="110"
        rx="8"
        fill="#03060f"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <rect x="102" y="48" width="56" height="6" rx="3" fill="#0f172a" />
      <rect x="102" y="62" width="42" height="5" rx="2.5" fill="#0f172a" />
    </svg>
  ),

  map: (
    <svg
      viewBox="0 0 200 160"
      className="w-40 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="20"
        y="20"
        width="160"
        height="120"
        rx="10"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Grid lines */}
      <line x1="20" y1="60" x2="180" y2="60" stroke="#0f172a" strokeWidth="1" />
      <line
        x1="20"
        y1="100"
        x2="180"
        y2="100"
        stroke="#0f172a"
        strokeWidth="1"
      />
      <line x1="73" y1="20" x2="73" y2="140" stroke="#0f172a" strokeWidth="1" />
      <line
        x1="127"
        y1="20"
        x2="127"
        y2="140"
        stroke="#0f172a"
        strokeWidth="1"
      />
      {/* Ghost pin */}
      <path
        d="M100 50c-8 0-14 6-14 14 0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z"
        stroke="#1e293b"
        strokeWidth="2"
        strokeDasharray="4 2"
      />
      <circle cx="100" cy="64" r="4" stroke="#1e293b" strokeWidth="1.5" />
    </svg>
  ),

  group: (
    <svg
      viewBox="0 0 200 160"
      className="w-40 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Folder shape */}
      <path
        d="M20 55h160v75a10 10 0 01-10 10H30a10 10 0 01-10-10V55z"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <path
        d="M20 55V45a10 10 0 0110-10h40l15 20H20z"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Dotted lines inside */}
      <rect x="45" y="85" width="110" height="6" rx="3" fill="#0f172a" />
      <rect x="45" y="102" width="85" height="6" rx="3" fill="#0f172a" />
    </svg>
  ),
};

export default function EmptyState({
  type = "leads",
  title,
  subtitle,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="opacity-40">
        {illustrations[type] || illustrations.leads}
      </div>
      <div className="space-y-1.5">
        <p className="text-slate-400 text-base font-medium">{title}</p>
        {subtitle && (
          <p className="text-slate-600 text-sm max-w-xs mx-auto">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors mt-1"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
