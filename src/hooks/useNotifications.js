import { useEffect } from "react";
import useCRMStore from "../store/useCRMStore";
import { isAging, daysSinceTouch } from "../constants";

const STORAGE_KEY = "trace_notifications_last_sent";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NAMES_SHOWN = 3;

function getLastSent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setLastSent(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function canFire(key, lastSent) {
  const last = lastSent[key];
  if (!last) return true;
  return Date.now() - last > ONE_DAY_MS;
}

function fire(title, body, tag) {
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: "/logo.png",
      badge: "/logo.png",
      silent: false,
    });
  } catch {}
}

// Turns a list of leads into a short readable string, e.g.
// "El Maizal, La Cocina, and 3 more"
function summarizeNames(leads) {
  const names = leads.map((l) => l.businessName);
  if (names.length <= MAX_NAMES_SHOWN) return names.join(", ");
  const shown = names.slice(0, MAX_NAMES_SHOWN);
  const remaining = names.length - MAX_NAMES_SHOWN;
  return `${shown.join(", ")}, and ${remaining} more`;
}

export async function requestPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function useNotifications() {
  const leads = useCRMStore((s) => s.leads) ?? [];
  const settings = useCRMStore((s) => s.notifSettings) ?? {};

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!settings.enabled) return;
    if (!canFire("daily_digest", getLastSent())) return;

    const today = new Date().toISOString().slice(0, 10);

    // ── Gather each category, respecting individual toggles ──────────────────
    const overdue =
      settings.overdue !== false
        ? leads.filter(
            (l) =>
              l.followUpDate &&
              l.followUpDate < today &&
              l.lastTouchDate !== today &&
              !["Closed", "Dead"].includes(l.status),
          )
        : [];

    const dueToday =
      settings.dueToday !== false
        ? leads.filter(
            (l) =>
              l.followUpDate === today &&
              !["Closed", "Dead"].includes(l.status),
          )
        : [];

    const stale =
      settings.stale !== false ? leads.filter((l) => isAging(l)) : [];

    const totalCount = overdue.length + dueToday.length + stale.length;
    if (totalCount === 0) return;

    // ── Build a single combined digest ────────────────────────────────────────
    const parts = [];
    if (overdue.length > 0) parts.push(`${overdue.length} overdue`);
    if (dueToday.length > 0) parts.push(`${dueToday.length} due today`);
    if (stale.length > 0) parts.push(`${stale.length} going stale`);

    const title =
      totalCount === 1
        ? "1 lead needs attention"
        : `${totalCount} leads need attention`;

    const bodyLines = [];
    if (overdue.length > 0)
      bodyLines.push(`Overdue: ${summarizeNames(overdue)}`);
    if (dueToday.length > 0)
      bodyLines.push(`Due today: ${summarizeNames(dueToday)}`);
    if (stale.length > 0)
      bodyLines.push(`Going stale: ${summarizeNames(stale)}`);

    fire(title, bodyLines.join("\n"), "daily_digest");

    const lastSent = getLastSent();
    setLastSent({ ...lastSent, daily_digest: Date.now() });
  }, [leads, settings]);
}
