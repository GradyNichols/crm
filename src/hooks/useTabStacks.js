import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useCRMStore from "../store/useCRMStore";

// ── Per-tab navigation ──────────────────────────────────────────────────────────
// Each bottom-nav tab remembers where you were inside it. Tapping an inactive tab
// restores that place; tapping the active tab pops to its root, which is what
// every other app on the phone does.
//
// This remembers ONE location per tab, not a stack. React Router has a single
// history, and on an installed iOS PWA the swipe-back gesture drives that history
// directly — a synthetic stack desynchronises from the gesture and then "back"
// means different things depending on how you arrived. The existing back buttons
// already walk the chain; this only fixes losing your place when you tab away.

export const TAB_ROOTS = ["/today", "/", "/search"];

// The run's own screens are never recorded. Tapping Today from Pitch Mode should
// give you Today — the Now Bar is the way back into a run.
const EXCLUDED_PREFIXES = ["/run", "/pitch/", "/call/"];

const isExcluded = (pathname) =>
  EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));

// A remembered lead can be deleted while you're off in another tab. Falling back
// to the root beats restoring a "Lead not found" screen.
const stillValid = (remembered) => {
  if (!remembered) return false;
  const match = remembered.match(/^\/lead\/([^/?]+)/);
  if (!match) return true;
  return useCRMStore.getState().leads.some((l) => l.id === match[1]);
};

export default function useTabStacks() {
  const location = useLocation();
  const navigate = useNavigate();
  const here = location.pathname + location.search;

  // The owning tab is a ref and the active tab is *derived* every render.
  // Holding it as state meant the tab update and the router's location update
  // landed in separate renders: the recorder would see the new tab alongside the
  // old path, decide the path's own root disagreed, and clobber the claim — so
  // tabbing back to a lead filed that lead under Search. Deriving removes the
  // race rather than papering over it.
  const ownerRef = useRef(
    TAB_ROOTS.includes(location.pathname) ? location.pathname : "/today",
  );

  // Deliberately in-memory: cold-starting tomorrow should land on a tab root,
  // not on the lead you happened to be reading yesterday.
  const remembered = useRef({});

  const activeTab = TAB_ROOTS.includes(location.pathname)
    ? location.pathname
    : ownerRef.current;

  // One effect captures every navigation in the app — sidebar, Now Bar,
  // QueueButton, back buttons — so no call site has to know this exists.
  useEffect(() => {
    if (isExcluded(location.pathname)) return;
    ownerRef.current = activeTab;
    remembered.current[activeTab] = here;
  }, [here, activeTab]);

  const tabTo = (root) => {
    if (root === activeTab) {
      // Second tap on the tab you're already in: pop to its root.
      remembered.current[root] = root;
      ownerRef.current = root;
      navigate(root);
      return;
    }
    ownerRef.current = root;
    const target = remembered.current[root];
    navigate(stillValid(target) ? target : root);
  };

  return { activeTab, tabTo };
}
