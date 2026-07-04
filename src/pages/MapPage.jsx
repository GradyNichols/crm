import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import useCRMStore from "../store/useCRMStore";
import EmptyState from "../components/EmptyState";
import { STATUS_COLORS, STATUSES } from "../constants";

// ── Pin colors by status ────────────────────────────────────────────────────────
const PIN_COLORS = {
  Cold: "#64748b",
  Contacted: "#3b82f6",
  Warm: "#f59e0b",
  Waiting: "#a855f7",
  Dead: "#ef4444",
  Closed: "#22c55e",
};

function makeIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

// Geocode a single address using Nominatim
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// Fit map bounds to all visible markers
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

export default function Map() {
  const navigate = useNavigate();
  const leads = useCRMStore((s) => s.leads) ?? [];
  const geocache = useCRMStore((s) => s.geocache) ?? {};
  const setGeocode = useCRMStore((s) => s.setGeocode);
  const updateLead = useCRMStore((s) => s.updateLead);
  const [statusFilter, setStatusFilter] = useState("all");
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [resolved, setResolved] = useState({}); // id → { lat, lng } | null
  const cancelRef = useRef(false);

  const leadsWithAddress = leads.filter((l) => l.address?.trim());

  const filtered =
    statusFilter === "all"
      ? leadsWithAddress
      : leadsWithAddress.filter((l) => l.status === statusFilter);

  // Geocode leads that aren't cached yet
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
        // Nominatim rate limit: 1 req/sec
        await new Promise((r) => setTimeout(r, 1100));
      } catch {}
      setProgress({ done: i + 1, total: toGeocode.length });
    }
    setGeocoding(false);
  };

  // Build resolved map from cache on mount and when cache changes
  useEffect(() => {
    const map = {};
    leadsWithAddress.forEach((l) => {
      if (geocache[l.address]) map[l.id] = geocache[l.address];
    });
    setResolved(map);
  }, [geocache, leads]);

  const plottable = filtered.filter((l) => resolved[l.id]);
  const unresolved = leadsWithAddress.filter((l) => !geocache[l.address]);

  // Default center — Simi Valley
  const defaultCenter = [34.2694, -118.7815];

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

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Status filter */}
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

          {/* Geocode button */}
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

            {plottable.map((lead) => {
              const coords = resolved[lead.id];
              const color = PIN_COLORS[lead.status] || "#64748b";
              return (
                <Marker
                  key={lead.id}
                  position={[coords.lat, coords.lng]}
                  icon={makeIcon(color)}
                >
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
                        <p className="text-slate-600 text-xs">{lead.address}</p>
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
                </Marker>
              );
            })}

            {plottable.length > 0 && (
              <FitBounds positions={plottable.map((l) => resolved[l.id])} />
            )}
          </MapContainer>

          {/* Unplotted badge */}
          {leadsWithAddress.length - plottable.length > 0 && !geocoding && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-[#0d1117]/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
              {leadsWithAddress.length - plottable.length} address
              {leadsWithAddress.length - plottable.length !== 1 ? "es" : ""} not
              yet plotted
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
        </div>
      )}
    </div>
  );
}
