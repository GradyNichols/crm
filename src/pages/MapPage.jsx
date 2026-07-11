import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import useCRMStore from "../store/useCRMStore";
import EmptyState from "../components/EmptyState";
import { STATUS_COLORS, STATUSES } from "../constants";

// ── Pin colors ───────────────────────────────────────────────────────────────────
const PIN_COLORS = {
  Cold: "#64748b",
  Contacted: "#3b82f6",
  Warm: "#f59e0b",
  Waiting: "#a855f7",
  Dead: "#ef4444",
  Closed: "#22c55e",
};

function makeIcon(color, label) {
  const svg = label
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 24 16 24S32 26.667 32 16C32 7.163 24.837 0 16 0z"
          fill="#3b82f6" stroke="white" stroke-width="2"/>
        <text x="16" y="21" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">${label}</text>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
          fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
      </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: label ? [32, 40] : [28, 36],
    iconAnchor: label ? [16, 40] : [14, 36],
    popupAnchor: [0, label ? -40 : -36],
  });
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 13);
    } else {
      map.fitBounds(
        positions.map((p) => [p.lat, p.lng]),
        { padding: [48, 48] },
      );
    }
  }, [positions.map((p) => `${p.lat},${p.lng}`).join("|")]);
  return null;
}

// ── Route panel ──────────────────────────────────────────────────────────────────
function RoutePanel({
  route,
  leads,
  resolved,
  onRemove,
  onMove,
  onClear,
  onNavigate,
}) {
  if (route.length === 0) {
    return (
      <div className="absolute top-4 right-4 z-[1000] w-64 bg-[#0d1117]/95 border border-slate-700 rounded-xl p-4 shadow-2xl">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">
          Route Mode
        </p>
        <p className="text-slate-500 text-xs">
          Tap pins on the map to add stops to your route.
        </p>
      </div>
    );
  }

  const buildMapsUrl = () => {
    const addrs = route
      .map((id) => {
        const lead = leads.find((l) => l.id === id);
        return encodeURIComponent(lead?.address || "");
      })
      .filter(Boolean);
    if (addrs.length === 0) return null;
    if (addrs.length === 1)
      return `https://www.google.com/maps/search/?api=1&query=${addrs[0]}`;
    const origin = addrs[0];
    const dest = addrs[addrs.length - 1];
    const waypoints = addrs.slice(1, -1).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=driving`;
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] w-64 bg-[#0d1117]/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
          Route · {route.length} stop{route.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onClear}
          className="text-xs text-slate-600 hover:text-red-400 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
        {route.map((leadId, i) => {
          const lead = leads.find((l) => l.id === leadId);
          if (!lead) return null;
          return (
            <div key={leadId} className="flex items-center gap-2 px-3 py-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              <p className="text-slate-200 text-xs flex-1 truncate">
                {lead.businessName}
              </p>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 15.75l7.5-7.5 7.5 7.5"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onMove(i, 1)}
                  disabled={i === route.length - 1}
                  className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onRemove(leadId)}
                  className="p-0.5 text-slate-600 hover:text-red-400 transition-colors ml-0.5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-3 border-t border-slate-800">
        <button
          onClick={() => {
            const url = buildMapsUrl();
            if (url) window.open(url, "_blank");
          }}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
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
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          Open in Maps
        </button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────────
export default function Map() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const geocache = useCRMStore((s) => s.geocache) ?? {};
  const setGeocode = useCRMStore((s) => s.setGeocode);
  const updateLead = useCRMStore((s) => s.updateLead);

  const [statusFilter, setStatusFilter] = useState("all");
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [resolved, setResolved] = useState({});
  const [routeMode, setRouteMode] = useState(false);
  const [route, setRoute] = useState([]); // ordered lead IDs
  const cancelRef = useRef(false);

  const leadsWithAddress = leads.filter((l) => l.address?.trim());
  const filtered =
    statusFilter === "all"
      ? leadsWithAddress
      : leadsWithAddress.filter((l) => l.status === statusFilter);

  const geocodeAll = async () => {
    cancelRef.current = false;
    const toGeocode = leadsWithAddress.filter((l) => !geocache[l.address]);
    if (toGeocode.length === 0) return;
    setGeocoding(true);
    setProgress({ done: 0, total: toGeocode.length });
    for (let i = 0; i < toGeocode.length; i++) {
      if (cancelRef.current) break;
      const lead = toGeocode[i];
      try {
        const coords = await geocodeAddress(lead.address);
        if (coords) setGeocode(lead.address, coords);
        await new Promise((r) => setTimeout(r, 1100));
      } catch {}
      setProgress({ done: i + 1, total: toGeocode.length });
    }
    setGeocoding(false);
  };

  useEffect(() => {
    const map = {};
    leadsWithAddress.forEach((l) => {
      if (geocache[l.address]) map[l.id] = geocache[l.address];
    });
    setResolved(map);
  }, [geocache, leads]);

  const plottable = filtered.filter((l) => resolved[l.id]);
  const unresolved = leadsWithAddress.filter((l) => !geocache[l.address]);
  const defaultCenter = [34.2694, -118.7815];

  // Route actions
  const toggleRouteStop = (leadId) => {
    if (!routeMode) return;
    setRoute((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId],
    );
  };

  const moveRouteStop = (index, dir) => {
    setRoute((prev) => {
      const arr = [...prev];
      const newIdx = index + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
      return arr;
    });
  };

  // Route polyline coords
  const routeCoords = route
    .map((id) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead || !resolved[lead.id]) return null;
      return [resolved[lead.id].lat, resolved[lead.id].lng];
    })
    .filter(Boolean);

  return (
    <div className="flex flex-col h-screen bg-[#03060f]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
        <button
          onClick={() => navigate("/")}
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
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-100">
            Territory Map
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {plottable.length} of {leadsWithAddress.length} lead
            {leadsWithAddress.length !== 1 ? "s" : ""} plotted
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Route mode toggle */}
          <button
            onClick={() => {
              setRouteMode((r) => !r);
              if (routeMode) setRoute([]);
            }}
            className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors border ${
              routeMode
                ? "bg-blue-600 border-blue-500 text-white"
                : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            {routeMode ? "✕ Exit Route" : "↗ Plan Route"}
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All statuses</option>
            {["Cold", "Contacted", "Warm", "Waiting", "Dead", "Closed"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>

          {unresolved.length > 0 && !geocoding && (
            <button
              onClick={geocodeAll}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Plot {unresolved.length} address
              {unresolved.length !== 1 ? "es" : ""}
            </button>
          )}

          {geocoding && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-400 whitespace-nowrap">
                Geocoding {progress.done}/{progress.total}…
              </div>
              <button
                onClick={() => {
                  cancelRef.current = true;
                  setGeocoding(false);
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b border-slate-800 shrink-0 overflow-x-auto">
        {Object.entries(PIN_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 shrink-0">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-500">{status}</span>
          </div>
        ))}
        {routeMode && (
          <div className="flex items-center gap-1.5 shrink-0 ml-2 pl-2 border-l border-slate-700">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-blue-400 font-medium">
              Route stop
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {leadsWithAddress.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            type="map"
            title="No addresses to plot"
            subtitle="Add addresses to your leads and they'll appear on the map."
          />
        </div>
      )}

      {/* Map */}
      {leadsWithAddress.length > 0 && (
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Route line */}
            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 3,
                  opacity: 0.8,
                  dashArray: "8 6",
                }}
              />
            )}

            {plottable.map((lead) => {
              const coords = resolved[lead.id];
              const inRoute = route.includes(lead.id);
              const routeIdx = route.indexOf(lead.id);
              const color = PIN_COLORS[lead.status] || "#64748b";
              return (
                <Marker
                  key={lead.id}
                  position={[coords.lat, coords.lng]}
                  icon={makeIcon(
                    inRoute ? "#3b82f6" : color,
                    inRoute ? String(routeIdx + 1) : null,
                  )}
                  eventHandlers={{
                    click: () => {
                      if (routeMode) toggleRouteStop(lead.id);
                    },
                  }}
                >
                  {!routeMode && (
                    <Popup>
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold text-base text-slate-100 leading-tight">
                            {lead.businessName}
                          </p>
                          {lead.ownerName && (
                            <p className="text-slate-400 text-xs mt-0.5">
                              {lead.ownerName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}
                          >
                            {lead.status}
                          </span>
                          <span className="text-amber-400 text-xs">
                            {"★".repeat(lead.strength)}
                            <span className="text-slate-700">
                              {"★".repeat(5 - lead.strength)}
                            </span>
                          </span>
                        </div>
                        {lead.phone && (
                          <p className="text-slate-400 text-xs">{lead.phone}</p>
                        )}
                        {lead.address && (
                          <p className="text-slate-600 text-xs">
                            {lead.address}
                          </p>
                        )}
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateLead(lead.id, { status: e.target.value })
                          }
                          className="w-full mt-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => navigate(`/lead/${lead.id}`)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1 block"
                        >
                          View lead →
                        </button>
                      </div>
                    </Popup>
                  )}
                </Marker>
              );
            })}

            {plottable.length > 0 && (
              <FitBounds positions={plottable.map((l) => resolved[l.id])} />
            )}
          </MapContainer>

          {/* Route panel */}
          {routeMode && (
            <RoutePanel
              route={route}
              leads={leads}
              resolved={resolved}
              onRemove={(id) => setRoute((r) => r.filter((x) => x !== id))}
              onMove={moveRouteStop}
              onClear={() => setRoute([])}
            />
          )}

          {/* Unplotted badge */}
          {leadsWithAddress.length - plottable.length > 0 &&
            !geocoding &&
            !routeMode && (
              <div className="absolute bottom-4 left-4 z-[1000] bg-[#0d1117]/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
                {leadsWithAddress.length - plottable.length} address
                {leadsWithAddress.length - plottable.length !== 1 ? "es" : ""}{" "}
                not yet plotted
                {unresolved.length > 0 && (
                  <button
                    onClick={geocodeAll}
                    className="text-blue-400 hover:text-blue-300 ml-2 transition-colors"
                  >
                    → Plot now
                  </button>
                )}
              </div>
            )}

          {/* Route mode hint */}
          {routeMode && route.length === 0 && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-[#0d1117]/90 border border-blue-900/50 rounded-lg px-3 py-2 text-xs text-blue-400">
              Tap pins to add stops · Tap again to remove
            </div>
          )}
        </div>
      )}
    </div>
  );
}
