// Deterministic website checks for /api/research.
// Files under /api prefixed with "_" are not treated as routes by Vercel.
//
// Everything the research feature claims about a restaurant's site comes from
// here, not from the model. Code fetches the page and records what it saw; the
// model only chooses which of those verified facts matter and rates the
// opportunity. That split is the whole trust story: a finding can't exist unless
// this file produced it.
//
// Layout:
//   analyzeHtml()      — pure. HTML string in, signals out. Unit-tested.
//   verifiedFacts()    — pure. Checks in, owner-facing facts out. Unit-tested.
//   inspectSite()      — network. Fetches the page and a handful of links.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// ── Known hosts ─────────────────────────────────────────────────────────────────

const HOST_NAMES = {
  "toasttab.com": "Toast",
  "doordash.com": "DoorDash",
  "order.online": "DoorDash Storefront",
  "ubereats.com": "Uber Eats",
  "grubhub.com": "Grubhub",
  "seamless.com": "Seamless",
  "postmates.com": "Postmates",
  "chownow.com": "ChowNow",
  "menufy.com": "Menufy",
  "beyondmenu.com": "BeyondMenu",
  "slicelife.com": "Slice",
  "olo.com": "Olo",
  "clover.com": "Clover",
  "spoton.com": "SpotOn",
  "owner.com": "Owner",
  "opentable.com": "OpenTable",
  "resy.com": "Resy",
  "exploretock.com": "Tock",
  "sevenrooms.com": "SevenRooms",
  "yelp.com": "Yelp",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "instagram.com": "Instagram",
  "linktr.ee": "Linktree",
  "singleplatform.com": "SinglePlatform",
  "allmenus.com": "Allmenus",
  "menupages.com": "MenuPages",
  "google.com": "Google",
  "g.page": "Google",
};

// A "website" on one of these isn't a site of their own.
const THIRD_PARTY_SITE_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "yelp.com",
  "linktr.ee",
  "toasttab.com",
  "doordash.com",
  "order.online",
  "ubereats.com",
  "grubhub.com",
  "chownow.com",
  "menufy.com",
  "beyondmenu.com",
  "slicelife.com",
  "clover.com",
  "google.com",
  "g.page",
];

// Their own site, but on a builder's free address rather than their own domain.
const FREE_SUBDOMAIN_HOSTS = [
  "wixsite.com",
  "godaddysites.com",
  "weebly.com",
  "square.site",
  "wordpress.com",
  "blogspot.com",
  "webflow.io",
  "squarespace.com",
  "business.site",
];

const ORDERING_HOSTS = [
  "toasttab.com",
  "doordash.com",
  "order.online",
  "ubereats.com",
  "grubhub.com",
  "seamless.com",
  "postmates.com",
  "chownow.com",
  "menufy.com",
  "beyondmenu.com",
  "slicelife.com",
  "olo.com",
  "clover.com",
  "spoton.com",
  "owner.com",
];

const RESERVATION_HOSTS = [
  "opentable.com",
  "resy.com",
  "exploretock.com",
  "sevenrooms.com",
];

// Builders an owner typically set up themselves.
const DIY_PLATFORMS = new Set([
  "Wix",
  "GoDaddy",
  "Weebly",
  "Square Online",
  "Squarespace",
]);

// Paid, restaurant-specific platforms — someone is already selling to them.
const RESTAURANT_PLATFORMS = new Set(["BentoBox", "Popmenu", "SpotHopper"]);

// Checked in order; generator meta wins over asset fingerprints.
const PLATFORM_FINGERPRINTS = [
  ["Wix", /static\.wixstatic\.com|wix\.com website builder|x-wix-/i],
  ["Squarespace", /static1\.squarespace\.com|squarespace-cdn\.com/i],
  ["GoDaddy", /img1\.wsimg\.com|go daddy website builder/i],
  ["Square Online", /editmysite\.com|square\.site/i],
  ["Weebly", /weebly\.com\/|weeblycloud\.com/i],
  ["BentoBox", /getbento\.com|bentobox/i],
  ["Popmenu", /popmenu\.com|popmenucloud/i],
  ["SpotHopper", /spothopperapp\.com/i],
  ["Webflow", /assets\.website-files\.com|website-files\.com/i],
  ["Duda", /multiscreensite\.com|irp\.cdn-website\.com/i],
  ["Shopify", /cdn\.shopify\.com/i],
  ["WordPress", /\/wp-content\/|\/wp-includes\//i],
];

const GENERATOR_NAMES = [
  ["Wix", /wix/i],
  ["Squarespace", /squarespace/i],
  ["GoDaddy", /go ?daddy|starfield/i],
  ["Weebly", /weebly/i],
  ["Webflow", /webflow/i],
  ["Duda", /duda/i],
  ["WordPress", /wordpress/i],
  ["Drupal", /drupal/i],
  ["Joomla", /joomla/i],
];

// ── Small helpers ───────────────────────────────────────────────────────────────

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const hostMatches = (host, domain) =>
  !!host && (host === domain || host.endsWith(`.${domain}`));

const matchHost = (host, list) => list.find((d) => hostMatches(host, d));

export const hostLabel = (host) => {
  const known = Object.keys(HOST_NAMES).find((d) => hostMatches(host, d));
  return known ? HOST_NAMES[known] : host;
};

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&copy;|&#169;|&#xa9;/gi, "©");

const stripTags = (s) =>
  decodeEntities(String(s).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export function parseAttrs(tag = "") {
  const out = {};
  const inner = tag.replace(/^<\s*[\w:-]+/, "").replace(/\/?>$/, "");
  const re =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(inner))) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

const resolve = (href, base) => {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
};

const extOf = (url) => {
  try {
    const m = new URL(url).pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
};

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic"]);
const ASSET_EXT = new Set([
  ...IMAGE_EXT,
  "css",
  "js",
  "svg",
  "ico",
  "mp4",
  "mov",
  "zip",
  "xml",
  "json",
]);

function linkKind(url, siteHost) {
  const ext = extOf(url);
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXT.has(ext)) return "image";
  const host = hostOf(url);
  if (
    host &&
    siteHost &&
    !hostMatches(host, siteHost) &&
    !hostMatches(siteHost, host)
  )
    return matchHost(host, [...THIRD_PARTY_SITE_HOSTS, ...ORDERING_HOSTS])
      ? "third_party"
      : "external";
  return "page";
}

function findJsonLdBusiness(html) {
  const re =
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  const wanted =
    /Restaurant|FoodEstablishment|LocalBusiness|CafeOrCoffeeShop|BarOrPub|Bakery/;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes = [];
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(walk);
      nodes.push(n);
      if (n["@graph"]) walk(n["@graph"]);
    };
    walk(data);
    for (const n of nodes) {
      const type = [].concat(n["@type"] || []).join(" ");
      if (!wanted.test(type)) continue;
      const a = n.address;
      const address =
        typeof a === "string"
          ? a
          : a && typeof a === "object"
            ? [
                a.streetAddress,
                a.addressLocality,
                a.addressRegion,
                a.postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : "";
      return {
        name: typeof n.name === "string" ? n.name.trim() : "",
        phone: typeof n.telephone === "string" ? n.telephone.trim() : "",
        address: address.trim(),
      };
    }
  }
  return null;
}

// ── analyzeHtml — pure ──────────────────────────────────────────────────────────

export function analyzeHtml(html = "", pageUrl = "") {
  const src = String(html);
  const siteHost = hostOf(pageUrl);

  // Meta tags
  const metas = (src.match(/<meta\b[^>]*>/gi) || []).map(parseAttrs);
  const viewport = metas.some(
    (a) => (a.name || "").toLowerCase() === "viewport",
  );
  const generator =
    metas.find((a) => (a.name || "").toLowerCase() === "generator")?.content ||
    "";

  let platform = null;
  if (generator) {
    platform =
      GENERATOR_NAMES.find(([, re]) => re.test(generator))?.[0] || null;
  }
  if (!platform) {
    platform =
      PLATFORM_FINGERPRINTS.find(([, re]) => re.test(src))?.[0] || null;
  }

  const titleMatch = src.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 120) : "";

  // Visible text — scripts, styles and templates removed first.
  const visible = stripTags(
    src
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " "),
  );
  const textLength = visible.length;

  // Copyright — the latest year mentioned next to ©/copyright. A footer that
  // writes the year with JavaScript has no digits in the HTML → null.
  let copyrightYear = null;
  const cre =
    /(?:©|copyright)[^0-9<]{0,25}((?:19|20)\d{2})(?:\s*[-–—]\s*((?:19|20)\d{2}))?/gi;
  let cm;
  while ((cm = cre.exec(visible))) {
    const y = Math.max(Number(cm[1]), Number(cm[2] || 0));
    if (!copyrightYear || y > copyrightYear) copyrightYear = y;
  }

  const parked =
    /this domain (?:name )?(?:is|may be) for sale|buy this domain|domain (?:has )?expired|this domain is parked|parked free|parkingcrew|sedoparking|hugedomains\.com|future home of something/i.test(
      `${title} ${visible.slice(0, 3000)}`,
    );

  const telLink = /href\s*=\s*["']?\s*tel:/i.test(src);

  // Anchors
  const anchors = [];
  const are = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = are.exec(src))) {
    const attrs = parseAttrs(`<a ${am[1]}>`);
    const raw = (attrs.href || "").trim();
    if (
      !raw ||
      raw.startsWith("#") ||
      /^(javascript|mailto|tel|sms):/i.test(raw)
    )
      continue;
    const url = resolve(raw, pageUrl);
    if (!url) continue;
    const text = stripTags(
      `${am[2]} ${attrs["aria-label"] || ""} ${attrs.title || ""}`,
    ).toLowerCase();
    anchors.push({ url, text });
  }

  // Menu — prefer a link whose text says menu; fall back to one whose path does.
  const menuByText = anchors.find((a) => /\bmenus?\b/.test(a.text));
  const menuByPath = anchors.find((a) => {
    try {
      return /(^|\/)(our-?)?menus?(\/|\.|$|-)/i.test(new URL(a.url).pathname);
    } catch {
      return false;
    }
  });
  const menuLink = menuByText || menuByPath;
  const menu = menuLink
    ? {
        url: menuLink.url,
        kind: linkKind(menuLink.url, siteHost),
        host: hostOf(menuLink.url),
      }
    : null;

  const ordering = anchors.find(
    (a) =>
      matchHost(hostOf(a.url), ORDERING_HOSTS) ||
      /\border (online|now|pickup|delivery|here)\b|\bonline order/.test(a.text),
  );
  const reservations = anchors.find(
    (a) =>
      matchHost(hostOf(a.url), RESERVATION_HOSTS) ||
      /\breserv(e|ation)|\bbook a table\b/.test(a.text),
  );

  // Internal links worth a status check — deduped by path, assets skipped.
  const seen = new Set();
  const navLinks = [];
  for (const a of anchors) {
    const host = hostOf(a.url);
    if (!siteHost || host !== siteHost) continue;
    if (ASSET_EXT.has(extOf(a.url))) continue;
    let key;
    try {
      const u = new URL(a.url);
      key = u.pathname.replace(/\/+$/, "") || "/";
    } catch {
      continue;
    }
    if (key === "/" || seen.has(key)) continue;
    seen.add(key);
    navLinks.push(a.url);
    if (navLinks.length >= 8) break;
  }

  return {
    title,
    platform,
    viewport,
    copyrightYear,
    parked,
    telLink,
    textLength,
    thinContent: textLength < 300,
    menu,
    ordering: ordering
      ? { url: ordering.url, host: hostOf(ordering.url) }
      : null,
    reservations: reservations
      ? { url: reservations.url, host: hostOf(reservations.url) }
      : null,
    contact: findJsonLdBusiness(src),
    navLinks,
  };
}

// What kind of "website" an address is, without fetching anything. Discovery
// needs this to tier a few hundred candidates, where a fetch each is out of the
// question — and it's the same host lists inspectSite() uses, so a prospect and
// a lead can't disagree about what counts as "not their own site".
export function classifyWebsite(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return { kind: "none", label: "" };
  const host = hostOf(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!host) return { kind: "none", label: "" };
  const thirdParty = matchHost(host, THIRD_PARTY_SITE_HOSTS);
  if (thirdParty) return { kind: "third_party", label: hostLabel(host) };
  const free = matchHost(host, FREE_SUBDOMAIN_HOSTS);
  if (free) return { kind: "free_subdomain", label: free };
  return { kind: "own", label: host };
}

// ── PageSpeed signals — pure ────────────────────────────────────────────────────
// Google renders the page, so its request list fingerprints the platform even
// when the site refused to serve us the HTML. Same fingerprints as the page
// read; a host list that matches nothing gives null, not a guess.
export function platformFromHosts(hosts = []) {
  if (!Array.isArray(hosts) || hosts.length === 0) return null;
  const joined = hosts.join(" ");
  return PLATFORM_FINGERPRINTS.find(([, re]) => re.test(joined))?.[0] || null;
}

// Fills gaps in `checks` from a PageSpeed result. What we read ourselves always
// wins; Google only fills what's missing, and `psiConfirmedLoad` records that
// the site does load for someone.
export function mergePsiSignals(checks = {}, speed = null, attempted = false) {
  const out = { ...checks, psiAttempted: attempted };
  if (!speed) return out;
  out.psiConfirmedLoad = true;
  const s = speed.signals || {};
  if (out.viewport === undefined && typeof s.viewport === "boolean")
    out.viewport = s.viewport;
  if (!out.platform) {
    const p = platformFromHosts(s.requestHosts);
    if (p) out.platform = p;
  }
  if (!out.finalUrl && s.finalUrl) out.finalUrl = s.finalUrl;
  return out;
}

// ── verifiedFacts — pure ────────────────────────────────────────────────────────
// Turns raw checks into the only statements research is allowed to make.
// `problems` are pickable findings; `context` is neutral background for the
// model. Wording is plain and factual — no "you're losing customers". The pitch
// generator adds the argument; this layer only says what was seen.

// Fallback order when the model doesn't rank them.
export const PROBLEM_PRIORITY = [
  "unreachable",
  "parked",
  "third_party_site",
  "cert_error",
  "menu_broken",
  "no_viewport",
  "broken_links",
  "slow",
  "no_custom_domain",
  "menu_image",
  "menu_pdf",
  "menu_missing",
  "old_copyright",
  "no_https",
  "no_tel_link",
];

const UNREACHABLE_REASON = {
  dns: "the address doesn't resolve",
  timeout: "it timed out",
  refused: "the connection was refused",
  http: "the server returned an error",
  tls: "its security certificate is invalid",
  other: "the connection failed",
};

// Google's own render, for a site that wouldn't let us read it. Only the two
// signals Google reports plainly: is there a mobile viewport tag, and is it
// slow. Nothing is inferred about the parts we couldn't see.
function psiOnlyFacts(checks, speed, qualityNote) {
  const problems = [];
  const context = [];
  const url = checks.finalUrl || checks.url || "";

  if (checks.viewport === false) {
    problems.push({
      check: "no_viewport",
      text: "The homepage isn't set up for phones (no mobile viewport tag, measured by Google PageSpeed), so phones show a shrunken desktop layout.",
      source: url,
    });
  } else if (checks.viewport === true) {
    context.push("Has a mobile viewport tag (per Google PageSpeed)");
  }

  if (speed && typeof speed.score === "number") {
    const lcp =
      speed.lcp != null
        ? `, with ${speed.lcp}s before the main content appears`
        : "";
    if (speed.status === "bad") {
      problems.push({
        check: "slow",
        text: `Google PageSpeed scores the mobile site ${speed.score}/100${lcp}.`,
        source: url,
      });
    } else {
      context.push(
        `Google PageSpeed mobile score ${speed.score}/100 (not flagged as slow)`,
      );
    }
  }

  if (checks.platform) context.push(platformContext(checks.platform));

  problems.sort(
    (a, b) =>
      PROBLEM_PRIORITY.indexOf(a.check) - PROBLEM_PRIORITY.indexOf(b.check),
  );
  return { problems, context, quality: "psi_only", qualityNote };
}

const platformContext = (platform) =>
  RESTAURANT_PLATFORMS.has(platform)
    ? `Built with ${platform} (a paid restaurant website platform)`
    : DIY_PLATFORMS.has(platform)
      ? `Built with ${platform} (a do-it-yourself site builder)`
      : `Built with ${platform}`;

export function verifiedFacts(checks = {}, speed = null, now = new Date()) {
  const problems = [];
  const context = [];
  const add = (check, text, source = checks.finalUrl || checks.url || "") =>
    problems.push({ check, text, source });

  const url = checks.url || "";
  let quality = "full";
  let qualityNote = "";

  if (checks.thirdParty) {
    add(
      "third_party_site",
      `Their listed website is a ${checks.thirdParty} page, not a site of their own.`,
      url,
    );
    return { problems, context, quality: "full", qualityNote };
  }

  // Blocked, or unreachable for us. If Google loaded the same page, the site is
  // up and the problem is that it won't talk to us — saying "the site didn't
  // load" there would be a false finding about their business.
  if (checks.blocked || !checks.reachable) {
    if (checks.psiConfirmedLoad) {
      return psiOnlyFacts(
        checks,
        speed,
        checks.blocked
          ? "the site blocks automated checks, so only Google's PageSpeed data could be used"
          : "the site didn't answer our check but loads for Google, so only Google's PageSpeed data could be used",
      );
    }

    if (checks.blocked) {
      return {
        problems,
        context: ["The site blocked the automated check"],
        quality: "blocked",
        qualityNote: checks.psiAttempted
          ? "the site blocked the automated check and Google PageSpeed couldn't measure it either, so nothing could be verified"
          : "the site blocked the automated check, so nothing on the page could be read",
      };
    }

    const why =
      checks.error === "http" && checks.status
        ? `the server returned ${checks.status}`
        : UNREACHABLE_REASON[checks.error] || UNREACHABLE_REASON.other;
    add(
      "unreachable",
      `The site didn't load when checked (${why})${
        checks.psiAttempted
          ? ", and Google PageSpeed couldn't load it either"
          : ""
      }.`,
      url,
    );
    return {
      problems,
      context,
      quality: "limited",
      qualityNote: "the site didn't load, which may be temporary",
    };
  }

  if (checks.parked) {
    add(
      "parked",
      "The domain shows a parked or for-sale page instead of a restaurant site.",
    );
    return { problems, context, quality: "full", qualityNote };
  }

  if (checks.certError) {
    add(
      "cert_error",
      "The site's security certificate is invalid, so browsers show a warning before it loads.",
      url,
    );
  } else if (checks.https === false) {
    add(
      "no_https",
      "The site loads without HTTPS, so browsers label it “Not secure”.",
    );
  } else {
    context.push("Loads over HTTPS");
  }

  if (checks.freeSubdomain) {
    add(
      "no_custom_domain",
      `The site is on a free ${checks.freeSubdomain} address rather than its own domain.`,
    );
  }

  if (checks.thinContent) {
    quality = "limited";
    qualityNote =
      "the page builds its content with JavaScript, so the check could only see part of it";
  }

  if (checks.viewport === false) {
    add(
      "no_viewport",
      "The homepage isn't set up for phones (no mobile viewport tag), so phones show a shrunken desktop layout.",
    );
  } else if (checks.viewport) {
    context.push("Has a mobile viewport tag");
  }

  const menu = checks.menu;
  if (
    menu &&
    menu.status &&
    (menu.status === 404 || menu.status === 410 || menu.status >= 500)
  ) {
    add(
      "menu_broken",
      `The menu link returns an error (${menu.status}).`,
      menu.url,
    );
  } else if (menu?.kind === "pdf") {
    add("menu_pdf", "The menu is a PDF download.", menu.url);
  } else if (menu?.kind === "image") {
    add("menu_image", "The menu is posted as an image, not text.", menu.url);
  } else if (menu?.kind === "third_party" || menu?.kind === "external") {
    context.push(`The menu link goes to ${hostLabel(menu.host)}`);
  } else if (menu) {
    context.push("Has a menu page");
  } else if (!checks.thinContent) {
    add("menu_missing", "No menu link was found on the homepage.");
  }

  const broken = Array.isArray(checks.brokenLinks) ? checks.brokenLinks : [];
  if (broken.length) {
    const first = broken[0];
    let path = first.url;
    try {
      path = new URL(first.url).pathname;
    } catch {}
    const n = broken.length;
    add(
      "broken_links",
      `${n} link${n === 1 ? "" : "s"} on the homepage return${n === 1 ? "s" : ""} an error (e.g. ${path} → ${first.status}).`,
      first.url,
    );
  }

  if (speed && typeof speed.score === "number") {
    const lcp =
      speed.lcp != null
        ? `, with ${speed.lcp}s before the main content appears`
        : "";
    if (speed.status === "bad") {
      add(
        "slow",
        `Google PageSpeed scores the mobile site ${speed.score}/100${lcp}.`,
      );
    } else {
      context.push(
        `Google PageSpeed mobile score ${speed.score}/100 (not flagged as slow)`,
      );
    }
  }

  const year = Number(checks.copyrightYear);
  if (year && year <= now.getFullYear() - 3) {
    add("old_copyright", `The footer copyright says ${year}.`);
  } else if (year) {
    context.push(`Footer copyright ${year}`);
  }

  if (checks.telLink === false && !checks.thinContent) {
    add("no_tel_link", "The homepage has no tap-to-call link.");
  }

  if (checks.platform) context.push(platformContext(checks.platform));
  if (checks.ordering?.host && checks.ordering.host !== hostOf(url)) {
    context.push(`Online ordering links to ${hostLabel(checks.ordering.host)}`);
  }
  if (checks.reservations?.host && checks.reservations.host !== hostOf(url)) {
    context.push(`Reservations link to ${hostLabel(checks.reservations.host)}`);
  }

  problems.sort(
    (a, b) =>
      PROBLEM_PRIORITY.indexOf(a.check) - PROBLEM_PRIORITY.indexOf(b.check),
  );
  return { problems, context, quality, qualityNote };
}

// ── Network ─────────────────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 TraceSiteCheck/1.0";
const MAX_BYTES = 1_500_000;
const PAGE_TIMEOUT = 8000;
const LINK_TIMEOUT = 5000;
const MAX_REDIRECTS = 5;

// Private, loopback, link-local and carrier-NAT ranges. The server fetches URLs
// that came from lead data, so it must never be pointed at its own network.
// Checked on every redirect hop. (A DNS answer that changes between this check
// and the fetch isn't covered — acceptable for a single-user tool whose URLs
// come from its own lead list.)
export function isPrivateAddress(ip = "") {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === "::1" || s === "::") return true;
    if (/^f[cd]/.test(s) || /^fe[89ab]/.test(s)) return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  return true;
}

class CheckError extends Error {
  constructor(kind, status) {
    super(kind);
    this.kind = kind;
    this.status = status;
  }
}

// Throws CheckError("dns") / ("blocked-host") when the URL may not be fetched.
// `allowPrivate` exists only so the test suite can point this at a local
// server; the endpoint never passes it.
async function assertFetchable(url, allowPrivate = false) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new CheckError("other");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new CheckError("other");
  if (!allowPrivate && u.port && u.port !== "80" && u.port !== "443")
    throw new CheckError("blocked-host");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    !allowPrivate &&
    (host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal"))
  )
    throw new CheckError("blocked-host");
  let addrs;
  if (isIP(host)) addrs = [{ address: host }];
  else {
    try {
      addrs = await lookup(host, { all: true });
    } catch {
      throw new CheckError("dns");
    }
  }
  if (!addrs.length) throw new CheckError("dns");
  if (!allowPrivate && addrs.some((a) => isPrivateAddress(a.address)))
    throw new CheckError("blocked-host");
}

const TLS_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_NOT_YET_VALID",
]);

function classifyFetchError(err) {
  if (err instanceof CheckError) return err.kind;
  if (err?.name === "TimeoutError" || err?.name === "AbortError")
    return "timeout";
  const code = err?.cause?.code || err?.code || "";
  if (
    TLS_CODES.has(code) ||
    /certificate|SSL|TLS/i.test(err?.cause?.message || "")
  )
    return "tls";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns";
  if (code === "ECONNREFUSED") return "refused";
  if (code === "UND_ERR_CONNECT_TIMEOUT") return "timeout";
  return "other";
}

async function readCapped(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let out = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (bytes >= MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return out + decoder.decode();
}

// Follows redirects by hand so every hop passes the address check.
// With `stopAtThirdParty`, a redirect onto Facebook, Toast etc. isn't followed:
// the answer is already known ("not a site of their own") and there's no reason
// to fetch someone else's platform. Returns { res: null, finalUrl } then.
async function fetchChecked(
  url,
  {
    method = "GET",
    timeout,
    deadline,
    allowPrivate = false,
    stopAtThirdParty = false,
  },
) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertFetchable(current, allowPrivate);
    const remaining = deadline ? deadline - Date.now() : timeout;
    if (remaining <= 0) throw new CheckError("timeout");
    const res = await fetch(current, {
      method,
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
      signal: AbortSignal.timeout(Math.min(timeout, remaining)),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel().catch(() => {});
      const next = resolve(res.headers.get("location"), current);
      if (!next) throw new CheckError("other");
      if (stopAtThirdParty && matchHost(hostOf(next), THIRD_PARTY_SITE_HOSTS))
        return { res: null, finalUrl: next };
      current = next;
      continue;
    }
    return { res, finalUrl: current };
  }
  throw new CheckError("other");
}

// Status of one link. null = couldn't tell, which is never reported as broken.
async function linkStatus(url, deadline, allowPrivate) {
  try {
    let { res } = await fetchChecked(url, {
      method: "HEAD",
      timeout: LINK_TIMEOUT,
      deadline,
      allowPrivate,
    });
    await res.body?.cancel().catch(() => {});
    if ([403, 405, 501].includes(res.status)) {
      ({ res } = await fetchChecked(url, {
        method: "GET",
        timeout: LINK_TIMEOUT,
        deadline,
        allowPrivate,
      }));
      await res.body?.cancel().catch(() => {});
    }
    return res.status;
  } catch {
    return null;
  }
}

const isBrokenStatus = (s) => s === 404 || s === 410 || (s >= 500 && s < 600);

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from(
    { length: Math.min(size, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

// Bot-protection interstitials. Deliberately narrow: plenty of ordinary small
// sites load reCAPTCHA on a contact form, and that must not read as "blocked".
const CHALLENGE =
  /cf-browser-verification|challenge-platform|<title>\s*(just a moment|attention required)/i;

// The full check for one site. Never throws — failures are recorded as data.
export async function inspectSite(
  rawUrl,
  { budgetMs = 25000, allowPrivate = false } = {},
) {
  const deadline = Date.now() + budgetMs;
  const given = String(rawUrl || "").trim();
  const url = /^https?:\/\//i.test(given) ? given : `https://${given}`;
  const host = hostOf(url);
  const checks = { url, checkedAt: new Date().toISOString() };

  if (!host) {
    return { ...checks, reachable: false, error: "other" };
  }

  const thirdParty = matchHost(host, THIRD_PARTY_SITE_HOSTS);
  if (thirdParty) {
    return { ...checks, reachable: true, thirdParty: hostLabel(host) };
  }
  const free = matchHost(host, FREE_SUBDOMAIN_HOSTS);
  if (free) checks.freeSubdomain = free;

  // Candidate addresses in order: as given → www. → plain http.
  const candidates = [url];
  if (!/^www\./i.test(new URL(url).hostname)) {
    const u = new URL(url);
    u.hostname = `www.${u.hostname}`;
    candidates.push(u.toString());
  }

  let page = null;
  let certError = false;
  let lastError = "other";
  let lastStatus;

  for (let i = 0; i < candidates.length && !page; i++) {
    try {
      page = await fetchChecked(candidates[i], {
        timeout: PAGE_TIMEOUT,
        deadline,
        allowPrivate,
        stopAtThirdParty: true,
      });
    } catch (err) {
      lastError = classifyFetchError(err);
      if (lastError === "blocked-host") break;
      if (lastError === "tls") certError = true;
      // Only a missing www. is worth trying the www. host for.
      if (lastError !== "dns") {
        // TLS failures and refused https connections: try plain http once.
        if (
          /^https:/i.test(candidates[i]) &&
          ["tls", "refused", "other"].includes(lastError)
        ) {
          try {
            page = await fetchChecked(
              candidates[i].replace(/^https:/i, "http:"),
              {
                timeout: PAGE_TIMEOUT,
                deadline,
                allowPrivate,
                stopAtThirdParty: true,
              },
            );
          } catch (err2) {
            const k = classifyFetchError(err2);
            if (k !== "other") lastError = k;
          }
        }
        break;
      }
    }
  }

  if (!page) {
    if (lastError === "blocked-host") {
      return { ...checks, reachable: false, error: "other" };
    }
    return { ...checks, reachable: false, error: lastError, certError };
  }

  const { res, finalUrl } = page;
  if (!res) {
    // Redirected onto a third-party platform — not followed.
    return {
      ...checks,
      finalUrl,
      reachable: true,
      thirdParty: hostLabel(hostOf(finalUrl)),
    };
  }
  lastStatus = res.status;
  const body = await readCapped(res).catch(() => "");
  checks.finalUrl = finalUrl;
  checks.status = lastStatus;
  checks.https = /^https:/i.test(finalUrl);
  checks.certError = certError;

  const challenged = CHALLENGE.test(body.slice(0, 20000));
  if (
    lastStatus === 403 ||
    lastStatus === 429 ||
    (lastStatus === 503 && challenged) ||
    (lastStatus < 400 && challenged)
  ) {
    return { ...checks, reachable: true, blocked: true };
  }
  if (lastStatus >= 400) {
    return { ...checks, reachable: false, error: "http" };
  }

  // The final address may have moved onto a third-party host.
  const finalHost = hostOf(finalUrl);
  const finalThirdParty = matchHost(finalHost, THIRD_PARTY_SITE_HOSTS);
  if (finalThirdParty) {
    return { ...checks, reachable: true, thirdParty: hostLabel(finalHost) };
  }
  if (!checks.freeSubdomain) {
    const f = matchHost(finalHost, FREE_SUBDOMAIN_HOSTS);
    if (f) checks.freeSubdomain = f;
  }

  const a = analyzeHtml(body, finalUrl);
  Object.assign(checks, {
    reachable: true,
    title: a.title,
    platform: a.platform,
    viewport: a.viewport,
    copyrightYear: a.copyrightYear,
    parked: a.parked,
    telLink: a.telLink,
    thinContent: a.thinContent,
    ordering: a.ordering ? { host: a.ordering.host } : null,
    reservations: a.reservations ? { host: a.reservations.host } : null,
    contact: a.contact,
    menu: a.menu,
  });

  if (a.parked) return checks;

  // Link checks: the menu first, then internal nav links. Only definite
  // failures (404, 410, 5xx) count — a 403 from bot protection isn't broken.
  const targets = [];
  if (
    a.menu &&
    (a.menu.kind === "page" ||
      a.menu.kind === "pdf" ||
      a.menu.kind === "image" ||
      a.menu.kind === "third_party")
  )
    targets.push(a.menu.url);
  for (const l of a.navLinks) if (!targets.includes(l)) targets.push(l);
  const statuses = await pool(targets.slice(0, 8), 4, (u) =>
    linkStatus(u, deadline, allowPrivate),
  );

  checks.linksChecked = statuses.filter((s) => s !== null).length;
  if (a.menu) {
    const idx = targets.indexOf(a.menu.url);
    checks.menu = { ...a.menu, status: idx === -1 ? null : statuses[idx] };
  }
  checks.brokenLinks = targets
    .map((u, i) => ({ url: u, status: statuses[i] }))
    .filter((l) => l.url !== a.menu?.url && isBrokenStatus(l.status))
    .slice(0, 5);

  return checks;
}
