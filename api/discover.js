import { classifyWebsite } from "./_inspect.js";

// ── /api/discover ───────────────────────────────────────────────────────────────
// Finds restaurants with Google Places Text Search and returns plain candidates.
// No AI here at all: discovery is a list, and a list is something code can get
// right on its own.
//
// Body: { queries: ["restaurants in Simi Valley, CA", …] }
// Returns { candidates, stats }.
//
// Cost: the fields below bill at the Places Enterprise SKU ($35 per 1,000 calls,
// 1,000 free per month as of September 2026), and every results page is one
// call. The caps here are the first guard; the real one is a daily quota set on
// the key in Google Cloud, which this code can't be talked out of.

export const MAX_QUERIES = 8;
export const MAX_PAGES = 3; // Places returns at most 60 results per query
export const PAGE_SIZE = 20;

// Paging plus a few queries, each a network round trip.
export const config = { maxDuration: 60 };

// Only what's actually used. Every extra field is a wider (pricier) SKU.
export const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
  "places.location",
  "nextPageToken",
].join(",");

// Places types that mean "somewhere you eat". Anything else a text search drags
// in — a hotel, a grocery store, a caterer's office — isn't his market.
const FOOD_TYPES = new Set([
  "restaurant",
  "cafe",
  "coffee_shop",
  "bakery",
  "bar",
  "bar_and_grill",
  "pub",
  "diner",
  "fast_food_restaurant",
  "meal_takeaway",
  "meal_delivery",
  "pizza_restaurant",
  "sandwich_shop",
  "breakfast_restaurant",
  "brunch_restaurant",
  "ice_cream_shop",
  "juice_shop",
  "dessert_shop",
  "deli",
  "steak_house",
  "sushi_restaurant",
  "ramen_restaurant",
  "mexican_restaurant",
  "italian_restaurant",
  "chinese_restaurant",
  "thai_restaurant",
  "indian_restaurant",
  "japanese_restaurant",
  "korean_restaurant",
  "greek_restaurant",
  "mediterranean_restaurant",
  "middle_eastern_restaurant",
  "vietnamese_restaurant",
  "american_restaurant",
  "seafood_restaurant",
  "barbecue_restaurant",
  "hamburger_restaurant",
  "vegetarian_restaurant",
  "vegan_restaurant",
]);

export function isRestaurant(place = {}) {
  const types = [place.primaryType, ...(place.types || [])].filter(Boolean);
  return types.some((t) => FOOD_TYPES.has(t));
}

export function isOperating(place = {}) {
  // Absent means Google doesn't say; only an explicit closure is a closure.
  return !place.businessStatus || place.businessStatus === "OPERATIONAL";
}

export function buildSearchBody(textQuery, pageToken = "") {
  const body = {
    textQuery: String(textQuery || "").trim(),
    pageSize: PAGE_SIZE,
  };
  if (pageToken) body.pageToken = pageToken;
  return body;
}

// A Places result → the only shape the app stores. `siteKind` is decided here
// with the same host lists the site checker uses, so a candidate with a
// Facebook page as its "website" is already known to be tier 2 before anything
// is fetched.
export function normalizePlace(place = {}) {
  const website = place.websiteUri || "";
  const site = classifyWebsite(website);
  return {
    placeId: place.id || "",
    name: place.displayName?.text || place.displayName || "",
    address: place.formattedAddress || "",
    phone: place.nationalPhoneNumber || "",
    website,
    siteKind: site.kind,
    siteLabel: site.label,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
    primaryType: place.primaryType || "",
    location: place.location
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : null,
  };
}

async function searchPage(textQuery, pageToken, apiKey) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(buildSearchBody(textQuery, pageToken)),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Google Places error (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      error:
        "No Google Places key set. Add GOOGLE_PLACES_API_KEY in Vercel, enable the Places API (New), and set a daily quota on the key.",
    });
  }

  const queries = (Array.isArray(req.body?.queries) ? req.body.queries : [])
    .map((q) => String(q || "").trim())
    .filter(Boolean)
    .slice(0, MAX_QUERIES);

  if (queries.length === 0) {
    return res.status(400).json({ error: "No searches given." });
  }

  const byPlaceId = new Map();
  const stats = {
    queries: queries.length,
    calls: 0,
    returned: 0,
    closed: 0,
    notFood: 0,
    duplicates: 0,
  };
  const errors = [];

  for (const query of queries) {
    let pageToken = "";
    for (let page = 0; page < MAX_PAGES; page++) {
      let data;
      try {
        data = await searchPage(query, pageToken, apiKey);
        stats.calls += 1;
      } catch (err) {
        // One bad query shouldn't lose the results already gathered.
        errors.push(`${query}: ${err.message}`);
        break;
      }
      const places = Array.isArray(data.places) ? data.places : [];
      stats.returned += places.length;
      for (const place of places) {
        if (!place.id) continue;
        if (!isOperating(place)) {
          stats.closed += 1;
          continue;
        }
        if (!isRestaurant(place)) {
          stats.notFood += 1;
          continue;
        }
        if (byPlaceId.has(place.id)) {
          stats.duplicates += 1;
          continue;
        }
        byPlaceId.set(place.id, normalizePlace(place));
      }
      pageToken = data.nextPageToken || "";
      if (!pageToken) break;
    }
  }

  if (byPlaceId.size === 0 && errors.length) {
    return res.status(502).json({ error: errors[0] });
  }

  return res.status(200).json({
    candidates: [...byPlaceId.values()],
    stats,
    errors: errors.length ? errors : undefined,
  });
}
