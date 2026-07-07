import { useEffect } from "react";
import useCRMStore from "../store/useCRMStore";
import { isAging, daysSinceTouch, AGING_THRESHOLDS } from "../constants";

const STORAGE_KEY = "trace_notifications_last_sent";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

export async function requestPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function useNotifications() {
  const leads = useCRMStore((s) => s.leads) ?? [];
  const settings = useCRMStore((s) => s.notificationSettings) ?? {};

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!settings.enabled) return;

    const lastSent = getLastSent();
    const today = new Date().toISOString().slice(0, 10);
    const updates = {};

    // ── Overdue follow-ups ──────────────────────────────────────────────────────
    if (settings.overdue !== false) {
      const overdue = leads.filter(
        (l) =>
          l.followUpDate &&
          l.followUpDate < today &&
          l.lastTouchDate !== today &&
          !["Closed", "Dead"].includes(l.status),
      );

      if (overdue.length > 0 && canFire("overdue_summary", lastSent)) {
        if (overdue.length === 1) {
          fire(
            "Follow-up overdue",
            `${overdue[0].businessName} needs a follow-up.`,
            "overdue_summary",
          );
        } else {
          fire(
            `${overdue.length} follow-ups overdue`,
            overdue
              .slice(0, 3)
              .map((l) => l.businessName)
              .join(", ") + (overdue.length > 3 ? "…" : ""),
            "overdue_summary",
          );
        }
        updates["overdue_summary"] = Date.now();
      }
    }

    // ── Due today ───────────────────────────────────────────────────────────────
    if (settings.dueToday !== false) {
      const dueToday = leads.filter(
        (l) =>
          l.followUpDate === today && !["Closed", "Dead"].includes(l.status),
      );

      if (dueToday.length > 0 && canFire("due_today", lastSent)) {
        fire(
          `${dueToday.length} follow-up${dueToday.length !== 1 ? "s" : ""} due today`,
          dueToday
            .slice(0, 3)
            .map((l) => l.businessName)
            .join(", ") + (dueToday.length > 3 ? "…" : ""),
          "due_today",
        );
        updates["due_today"] = Date.now();
      }
    }

    // ── Going stale ─────────────────────────────────────────────────────────────
    if (settings.stale !== false) {
      const stale = leads.filter((l) => isAging(l));

      stale.forEach((lead) => {
        const key = `stale_${lead.id}`;
        const days = daysSinceTouch(lead);
        if (canFire(key, lastSent)) {
          fire(
            `${lead.businessName} is going stale`,
            days === null
              ? "Never been contacted."
              : `${days} days since last contact.`,
            key,
          );
          updates[key] = Date.now();
        }
      });
    }

    if (Object.keys(updates).length > 0) {
      setLastSent({ ...lastSent, ...updates });
    }
  }, [leads, settings]);
}
