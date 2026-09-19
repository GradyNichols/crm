import { cityFromAddress } from "./leadContext";

// ── Prospects ───────────────────────────────────────────────────────────────────
// Everything that decides what a swept candidate is and where it sits in the
// list. Pure functions only — the store calls them, the page reads them, and
// both can be tested without a network or a render.
//
// The ordering rule is the important part. Slice 1 showed the model's
// `opportunity` coming back "medium" for every readable site whose only problem
// was speed, so it can't carry a list of three hundred restaurants. Tiers come
// from what code knows for certain; the rating is a label on the card.

export const PROSPECT_MAX_AGE_DAYS = 30;

export const TIERS = [
  {
    rank: 1,
    key: "no_site",
    label: "No website at all",
    hint: "Nothing to compare against — the strongest opening you get.",
  },
  {
    rank: 2,
    key: "not_own",
    label: "Not their own site",
    hint: "A Facebook page or a builder's free address doing the job of a website.",
  },
  {
    rank: 3,
    key: "broken",
    label: "Down or broken",
    hint: "The site didn't load, is parked, or has links that go nowhere.",
  },
  {
    rank: 4,
    key: "problems",
    label: "Has problems",
    hint: "Loads, but the check found something worth raising.",
  },
  {
    rank: 5,
    key: "unchecked",
    label: "Not checked yet",
    hint: "Has a site nobody has looked at. Check the ones worth your time.",
  },
  {
    rank: 6,
    key: "clean",
    label: "Clean, or already paying someone",
    hint: "Nothing found, or they're on a paid restaurant platform.",
  },
];

export const tierByKey = (key) => TIERS.find((t) => t.key === key) || TIERS[4];

// Findings that mean the site is failing, not merely imperfect.
const BROKEN_FINDINGS = new Set([
  "unreachable",
  "parked",
  "cert_error",
  "menu_broken",
  "broken_links",
]);

export function tierOf(item = {}) {
  if (!item.website) return tierByKey("no_site");
  if (item.siteKind === "third_party" || item.siteKind === "free_subdomain")
    return tierByKey("not_own");

  const research = item.research;
  if (!research) return tierByKey("unchecked");

  const findings = research.findings || [];
  // A site that blocked the check and gave up nothing is still an unknown.
  if (research.visibility === "blocked" && findings.length === 0)
    return tierByKey("unchecked");
  if (findings.some((f) => BROKEN_FINDINGS.has(f.check)))
    return tierByKey("broken");
  if (findings.length) return tierByKey("problems");
  return tierByKey("clean");
}

// ── Matching against leads already in the pipeline ──────────────────────────────

// Last ten digits: "(805) 555-0100", "805-555-0100" and "+1 805 555 0100" are
// one phone number.
export function phoneKey(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

// "El Maizal Restaurant" and "el maizal" are one business. Accents, punctuation
// and the words every restaurant name carries are all noise here.
const NAME_NOISE =
  /\b(the|restaurant|restaurante|cafe|café|caffe|bar|grill|grille|kitchen|eatery|bistro|taqueria|pizzeria|bakery|deli|diner|co|inc|llc)\b/g;

export function normalizeName(name = "") {
  return (
    String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      // Apostrophes close up rather than splitting the word: "McDonald's" is
      // "mcdonalds", not "mcdonald s", or it never matches the chain list.
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(NAME_NOISE, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// The lead this candidate already is, or null. Phone first — it's the one field
// that can't coincide. Name alone would collide across towns, so it needs the
// city to agree.
export function findExistingLead(candidate = {}, leads = []) {
  const phone = phoneKey(candidate.phone);
  if (phone) {
    const byPhone = leads.find((l) => phoneKey(l.phone) === phone);
    if (byPhone) return byPhone;
  }
  const name = normalizeName(candidate.name);
  if (!name) return null;
  const city = cityFromAddress(candidate.address).toLowerCase();
  return (
    leads.find((l) => {
      if (normalizeName(l.businessName) !== name) return false;
      const leadCity = cityFromAddress(l.address).toLowerCase();
      return !city || !leadCity || city === leadCity;
    }) || null
  );
}

// ── Chains ──────────────────────────────────────────────────────────────────────
// Not his market: a franchisee can't commission a website. The list catches the
// obvious ones; the repeat rules catch the regional chains no list would have.

const CHAIN_NAMES = [
  "mcdonalds",
  "subway",
  "starbucks",
  "dominos",
  "pizza hut",
  "taco bell",
  "chipotle",
  "panda express",
  "kfc",
  "wendys",
  "burger king",
  "jack in box",
  "del taco",
  "in n out",
  "in n out burger",
  "carls jr",
  "dennys",
  "ihop",
  "applebees",
  "chilis",
  "olive garden",
  "panera",
  "panera bread",
  "jersey mikes",
  "jimmy johns",
  "wingstop",
  "little caesars",
  "papa johns",
  "el pollo loco",
  "popeyes",
  "raising canes",
  "five guys",
  "buffalo wild wings",
  "dunkin",
  "baskin robbins",
  "jamba",
  "jamba juice",
  "sonic",
  "arbys",
  "chick fil a",
  "round table pizza",
  "blaze pizza",
  "cheesecake factory",
  "bjs brewhouse",
  "yard house",
  "red robin",
  "habit burger",
  "rubios",
  "wetzels pretzels",
  "cinnabon",
  "crumbl",
  "nothing bundt cakes",
  "shakey s",
  "farmer boys",
  "daphnes",
  "pieology",
  "mod pizza",
  "chronic tacos",
  "wienerschnitzel",
  "tommys",
  "norms",
  "coffee bean",
  "peets coffee",
  "seven eleven",
  "quiznos",
  "togos",
];

const domainOf = (url = "") => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
};

// `others` is the rest of the sweep: the same name or the same website domain
// appearing three or more times across a territory is a chain, whoever it is.
export function looksLikeChain(candidate = {}, others = []) {
  const name = normalizeName(candidate.name);
  if (!name) return false;
  if (CHAIN_NAMES.includes(name)) return true;
  if (CHAIN_NAMES.some((c) => name.startsWith(`${c} `))) return true;

  const sameName = others.filter((o) => normalizeName(o.name) === name).length;
  if (sameName >= 3) return true;

  const domain = domainOf(candidate.website);
  if (!domain) return false;
  return others.filter((o) => domainOf(o.website) === domain).length >= 3;
}

// ── The stored collection ───────────────────────────────────────────────────────
// prospecting = { items: { [placeId]: item }, lastSweepAt, sweepCount }
//
// An item is either live (stage "found" or "researched") or a tombstone
// ("accepted", "dismissed", "expired"). Tombstones keep a dismissed restaurant
// from coming back every sweep, and keep an accepted one from being added
// twice, while carrying none of the details — those live on the lead now.

export const emptyProspecting = () => ({
  items: {},
  lastSweepAt: null,
  sweepCount: 0,
});

const TOMBSTONE_STAGES = new Set(["accepted", "dismissed"]);

export const acceptedTombstone = (item, leadId, at) => ({
  placeId: item.placeId,
  stage: "accepted",
  firstSeenAt: item.firstSeenAt,
  acceptedAt: at,
  leadId,
});

export const dismissedTombstone = (item, reason, at) => ({
  placeId: item.placeId,
  stage: "dismissed",
  firstSeenAt: item.firstSeenAt,
  dismissedAt: at,
  dismissedReason: reason || "",
});

const expiredTombstone = (item) => ({
  placeId: item.placeId,
  stage: "expired",
  firstSeenAt: item.firstSeenAt,
});

// Candidates that were never acted on go back to a tombstone after 30 days, so
// the stored collection can't grow without bound. A later sweep revives them
// with their original firstSeenAt, so they don't masquerade as new.
export function pruneProspects(items = {}, now = new Date()) {
  const cutoff = now.getTime() - PROSPECT_MAX_AGE_DAYS * 86400000;
  const out = {};
  for (const [placeId, item] of Object.entries(items)) {
    const live = item.stage === "found" || item.stage === "researched";
    const old = new Date(item.firstSeenAt || 0).getTime() < cutoff;
    out[placeId] = live && old ? expiredTombstone(item) : item;
  }
  return out;
}

// Merge a sweep's candidates into the collection. Accepted and dismissed
// tombstones are never overwritten; everything else takes the fresh details
// while keeping firstSeenAt, research and stage.
export function mergeSweep(
  prospecting = emptyProspecting(),
  candidates = [],
  { at = new Date().toISOString(), leads = [], now = new Date() } = {},
) {
  const items = { ...pruneProspects(prospecting.items || {}, now) };

  for (const candidate of candidates) {
    if (!candidate?.placeId) continue;
    const existing = items[candidate.placeId];
    if (existing && TOMBSTONE_STAGES.has(existing.stage)) continue;

    const lead = findExistingLead(candidate, leads);
    const fresh = {
      ...candidate,
      chain: looksLikeChain(candidate, candidates),
      existingLeadId: lead ? lead.id : null,
    };

    items[candidate.placeId] = existing
      ? {
          ...existing,
          ...fresh,
          // An expired item coming back is the same item, not a new one.
          stage: existing.stage === "expired" ? "found" : existing.stage,
          firstSeenAt: existing.firstSeenAt || at,
        }
      : { ...fresh, stage: "found", firstSeenAt: at };
  }

  return {
    items,
    lastSweepAt: at,
    sweepCount: (prospecting.sweepCount || 0) + 1,
  };
}

// ── Reading the collection ──────────────────────────────────────────────────────

export const liveProspects = (prospecting = emptyProspecting()) =>
  Object.values(prospecting.items || {}).filter(
    (i) => i.stage === "found" || i.stage === "researched",
  );

// First sweep finds everything, so nothing is "new" until there's a sweep to be
// new since.
export function isNewProspect(item = {}, prospecting = emptyProspecting()) {
  if ((prospecting.sweepCount || 0) < 2 || !prospecting.lastSweepAt)
    return false;
  return (item.firstSeenAt || "") >= prospecting.lastSweepAt;
}

// Tier first, then new arrivals, then the busiest place. Review count is the
// one popularity signal Places gives that says "enough customers to care".
export function sortProspects(list = [], prospecting = emptyProspecting()) {
  return [...list].sort((a, b) => {
    const rank = tierOf(a).rank - tierOf(b).rank;
    if (rank) return rank;
    const fresh =
      Number(isNewProspect(b, prospecting)) -
      Number(isNewProspect(a, prospecting));
    if (fresh) return fresh;
    const reviews = (b.reviewCount || 0) - (a.reviewCount || 0);
    if (reviews) return reviews;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

// What the page renders: filtered, sorted, and grouped under tier headings.
export function groupProspects(
  prospecting = emptyProspecting(),
  { hideChains = true, hideExisting = true } = {},
) {
  const visible = liveProspects(prospecting).filter(
    (i) => (!hideChains || !i.chain) && (!hideExisting || !i.existingLeadId),
  );
  const sorted = sortProspects(visible, prospecting);
  const groups = [];
  for (const item of sorted) {
    const tier = tierOf(item);
    const last = groups[groups.length - 1];
    if (last && last.tier.key === tier.key) last.items.push(item);
    else groups.push({ tier, items: [item] });
  }
  return groups;
}

export function prospectCounts(prospecting = emptyProspecting()) {
  const live = liveProspects(prospecting);
  const counts = {
    total: live.length,
    chains: live.filter((i) => i.chain).length,
    alreadyLeads: live.filter((i) => i.existingLeadId).length,
    unchecked: 0,
    byTier: {},
  };
  for (const item of live) {
    const key = tierOf(item).key;
    counts.byTier[key] = (counts.byTier[key] || 0) + 1;
  }
  counts.unchecked = counts.byTier.unchecked || 0;
  return counts;
}

// Worth spending a site check on: it has a site, nobody has checked it, and
// it's neither a chain nor already a lead. Tiers 1 and 2 are excluded on
// purpose — a restaurant with no website of its own is already the best kind of
// lead, and a check would tell us nothing we don't know.
export function needsCheck(item = {}) {
  return (
    !!item.website &&
    !item.research &&
    !item.chain &&
    !item.existingLeadId &&
    tierOf(item).key === "unchecked"
  );
}

// The shape /api/research wants. Prospects have a placeId where leads have an
// id, and the endpoint only cares that it's a stable string.
export const prospectSubject = (item = {}) => ({
  id: item.placeId,
  businessName: item.name,
  address: item.address || "",
  website: item.website || "",
  research: item.research,
});

// Queries for a sweep: each area crossed with each keyword, capped so a stray
// paste can't fire off a hundred billable searches.
export function buildQueries(areas = [], keywords = [], max = 8) {
  const cleanAreas = areas.map((a) => String(a).trim()).filter(Boolean);
  const cleanWords = keywords.map((k) => String(k).trim()).filter(Boolean);
  const words = cleanWords.length ? cleanWords : ["restaurants"];
  const out = [];
  for (const area of cleanAreas)
    for (const word of words) out.push(`${word} in ${area}`);
  return out.slice(0, max);
}
