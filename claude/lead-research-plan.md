# Lead Research & Prospecting — Plan

**Status:** Slice 1 (Research this lead) approved and built. Next: the
calibration pass (§4), then Slice 2 (Prospects) — which still needs approval.
**Replaces:** the generic "AI Lead Generation & Research Engine" spec (written
without knowledge of Trace — assumed a backend DB, scheduled jobs and an
autonomous agent loop, none of which fit).

Read `TRACE.md` first. This doc covers only the new work.

---

## 1. Decisions already taken

| Question | Decision |
|---|---|
| Where discovered businesses live | A **holding area** (`prospecting` store key), not straight into `leads` |
| Discovery source | **Google Places, middle path** — see §6 for the residual it leaves |
| Agent loop vs pipeline | **Fixed pipeline.** Code runs the checks; Claude judges them. Claude has no web access in V1 |
| Outreach angle | **Not a new generator.** Findings feed the existing pitch/email via `buildLeadBrief()` |
| Build order | **Research this lead first**, then Prospects |

---

## 2. The shape

One research engine, two entry points.

```
                ┌──────────────────── api/research.js ────────────────────┐
Lead Detail ──► │ _inspect.js (deterministic checks)  ─┐                   │
  "Research"    │ _psi.js (PageSpeed, mobile)         ─┼─► Claude judges ─►│──► lead.research
                │                                      │   (no web access) │
Prospects   ──► │   up to 6 subjects per request       ─┘                   │──► prospect.research
  "Research"    └──────────────────────────────────────────────────────────┘
                                                                              │
                          buildLeadPayload → buildLeadBrief ◄─────────────────┘
                          (observed findings only) → pitch hook, email
```

**The trust rule.** Every finding Claude returns must cite a check key that the
inspector actually recorded. The server drops any finding that doesn't — the
same principle as `stripEnvelope()`: a prompt rule is a request, not a
guarantee. Claude's own reading (opportunity, reason, "looks like a chain") is
stored separately and labelled as inference in the UI. Only observed findings
ever reach a pitch or an email.

---

## 3. Slice 1 — Research this lead

**Built.** Where the build differs from the plan below:

- **The model returns keys only, never finding text.** The plan had Claude
  phrase 1–3 findings that cite a check. As built, Claude returns `picks`
  (keys), and the stored findings are always the inspector's own wording and
  source. Stronger than planned — the model can't smuggle a claim into the
  phrasing.
- **Every verified problem is stored**, picks first (`lead: true`), the rest
  under "Also found". Only `lead: true` findings reach the prompts.
- **PSI's response shape didn't change.** The inspector reads the viewport tag
  from the HTML itself, so `_psi.js` is a pure extraction with no new field.
- **Research's button says "Check again"**, not "Re-check" — Site Speed
  already uses that label on the same screen.
- **Also added:** `likelyChain` (Claude's opinion, unused until Prospects),
  `visibility`, `assessed`, and a local-network test seam
  (`inspectSite(url, { allowPrivate })`) that the endpoint never passes.

The as-built rules are in `TRACE.md` §5 (shape), §6 (Site research rules), §7
(endpoint) and §10.11 (limits). The description below is the original plan.

### Deterministic checks (`api/_inspect.js`)

Network part is thin; `analyzeHtml(html, url)` is pure and exported for tests.

- Reachable / final status / redirect chain / HTTPS
- Parked or for-sale domain (text heuristics)
- "Website" is really a third-party page (Toast, DoorDash, Yelp, Facebook,
  Instagram, Linktree…) → effectively no site of their own
- Mobile viewport meta tag present
- Copyright year in the footer
- Builder fingerprint (Wix, Squarespace, GoDaddy, WordPress, Weebly, BentoBox,
  Popmenu, Square Online, Owner.com…) from generator meta and asset hosts
- Menu: link found? kind (HTML page / PDF / image / third-party)? status code?
- Broken internal nav links (cap 10 requests), with status codes
- Ordering / reservation link present, and which host it points to
- `tel:` link present; schema.org JSON-LD (name, phone, address) if present
- **Thin content** — very little text in the HTML means the site is built by
  JavaScript. Not a finding about the site; it lowers confidence instead.

Guards: http/https only, private and loopback IPs rejected after DNS lookup,
8s per request, 1.5 MB body cap, total request budget per subject.

### PageSpeed (`api/_psi.js`)

The PSI call moves out of `api/pagespeed.js` into a shared helper so both
endpoints use one implementation. Response gains one additive field,
`viewport` (pass/fail from Lighthouse). Existing `pageSpeedCache` entries stay
valid. If a cached result is under 7 days old, research reuses it.

### Assessment (`api/research.js`)

`{ subject }` or `{ subjects: [...] }`, max 6 — same shape and batching as
`/api/pitch`. Checks run in parallel; one Claude call per request. Claude
returns per subject:

- `findings[]` — 1–3, plain language, each `{ check, text, source }`
- `opportunity` — high / medium / low
- `reason` — one sentence, **inference**
- `confidence` — high / medium / low (drops on thin content, fetch failures)

`normalizeResearch()` exported for tests. `maxDuration` set explicitly; worst
case (6 × PSI + fetches + one model call) stays well inside Hobby's 300s.

Leads with no website: no API call. The section says so and suggests adding
one if it exists.

### Stored shape — optional key on the lead

```js
research: {
  checkedAt: "<ISO>",
  website: "…",            // the URL that was checked — a changed site = stale
  checks: { … },           // raw inspector output, small
  findings: [{ check, text, source }],
  opportunity, reason, confidence,
}
```

~1–2 KB per lead. Rides along with `leads`, so it needs no persistence edits
and is already in backups.

### Wiring

- `src/leadContext.js` — `buildLeadPayload()` adds `siteFindings` (observed
  text only). `leadSnapshot()` adds `researchedAt`.
- `api/_lead.js` — additive section: "What a check of their site found
  (verified)". Silent when absent.
- `api/pitch.js`, `api/email.js` — one rule each: use the strongest listed
  finding; never claim a problem that isn't listed.
- `src/constants.js` — `isGeneratedStale()` also compares
  `basedOn.researchedAt ?? null` with `lead.research?.checkedAt ?? null`, reason
  "Research updated since". Old pitches on unresearched leads are unaffected.
  Plus `researchAge(lead)`; older than 30 days, or `website` changed → "Re-check".
- `src/pages/LeadDetail.jsx` — new **Research** section between Site Speed and
  Pitch (research feeds the pitch, so reading order matches).
- **HUDs unchanged.** Findings reach Call Prep and Pitch Mode through the pitch
  hook. No field-workflow change.

### Visual language

Observed findings are evidence, not generated text: neutral slate with a source
link. Only `reason` is purple, prefixed as Claude's read.

### Files

New: `api/research.js`, `api/_inspect.js`, `api/_psi.js`,
`src/hooks/useResearch.js`, `src/components/LeadResearch.jsx`

Modified: `api/pagespeed.js`, `api/_lead.js`, `api/pitch.js`, `api/email.js`,
`src/leadContext.js`, `src/constants.js`, `src/store/useCRMStore.js`
(`setLeadResearch` / `clearLeadResearch` only), `src/pages/LeadDetail.jsx`,
`TRACE.md`

### Cost

Roughly a cent per lead (Claude only; PSI is free with the existing key).
Estimate — confirm on the first real run.

---

## 4a. What Slice 1 showed in production (18 Sep 2026)

Two real leads, both checked successfully:

| Lead | Read | Findings | Rating |
|---|---|---|---|
| Junkyard Cafe (Popmenu) | blocked; Google's data only | slow (67/100, 6.9s) | medium, low confidence |
| Bella's Bistro (WordPress) | full; 3 links checked | slow (73/100, 8.2s) | medium, high confidence |

Working: verified findings with sources, the PageSpeed fallback on a blocked
site, visibility stated plainly, no invented claims, the model's opinion clearly
separated from the evidence.

**The weak part is `opportunity`.** Both leads came back "medium" off a single
finding, and that is what to expect: on any readable site whose only problem is
speed, the rating has nowhere else to go. It carries little information, which
matters because the plan had Prospects ranking on it.

Two smaller notes:

- The model drifts into "may frustrate customers" despite the prompt saying not
  to guess about customers. Harmless and labelled as opinion; worth one line of
  prompt tightening alongside the next change to this endpoint.
- Platform detection from Google's request list did **not** fire for a known
  Popmenu site. It degrades silently, as designed, but treat `checks.platform`
  as a bonus, never a ranking input.

## 4. Calibration — between slices

Before building Prospects, run Research on existing leads and compare those that
engaged (Warm / Waiting / Closed — skipping any site Grady built) with Dead
ones, alongside the `[Dead]` reasons. If findings look the same on both sides,
web problems don't predict buying in this territory, and Prospects should rank
mostly on simple signals (independent, operating, review volume, new) rather
than on `opportunity`. Small sample — a sanity check, not proof.

---

## 5. Slice 2 — Prospects

### Discovery (`api/discover.js`)

Google Places Text Search (New). Field mask: `id, displayName,
formattedAddress, nationalPhoneNumber, websiteUri, rating, userRatingCount,
businessStatus, primaryType, location`. Those fields bill at the Enterprise
SKU ($35 per 1,000 calls, 1,000 free per month); each results page is a call,
max 60 results per query. A territory sweep is city × keyword queries — tens of
calls. Env `GOOGLE_PLACES_API_KEY`, with a **daily quota cap set in Google
Cloud** as the hard budget.

Deterministic filters: operating only; restaurant-type only; chains out (a
hand-kept name list, plus any name or website domain appearing 3+ times in one
sweep). Dedupe by place ID, then against `leads` by normalized phone (last 10
digits), then by normalized name + city.

### Store — new top-level key (needs the five edits + `exportBackup()`)

```js
prospecting: {
  items: {
    [placeId]: {
      placeId, name, address, phone, website, rating, reviewCount,
      location,                     // for distance to homeBase; 30-day limit
      stage: "found" | "researched" | "accepted" | "dismissed",
      firstSeenAt, research?,       // same shape as lead.research
      leadId?, dismissedReason?,
    },
  },
  lastSweepAt: "<ISO>" | null,
}
```

**Pruning.** Items not accepted or dismissed within 30 days are cut back to a
tombstone `{ placeId, stage, firstSeenAt }`. Accepted and dismissed items become
tombstones immediately (the lead holds the details). Tombstones stop a re-sweep
from resurfacing dismissed places, and let "new since last sweep" work.

### Accept

Small sheet: outreach type, group. Creates a Cold lead with `research`
attached, plus optional keys `source: "prospect"` and `placeId`. Contact
details come from the restaurant's own JSON-LD when present, else from Places.
`strength` stays at the default — that's Grady's judgement, not the model's.

### Page (`src/pages/Prospects.jsx`, route `/prospects`)

Sidebar item under Sources, after Pipeline Advisor. Not a bottom-nav tab; a
desk tool that also works on the phone.

- Sweep controls: "Sweep my territory" preset, plus a custom query
- List order: **deterministic tiers first, not the model's rating** (see §4a —
  it came back "medium" for everything). In order:
  1. No website at all (straight from Places; no check needed)
  2. Website is really a Facebook/Yelp/Toast page, or a free builder subdomain
  3. Parked, down, or a broken menu link
  4. Readable with problems — speed, no mobile viewport, PDF menu
  5. Clean, or already on a paid restaurant platform
  Then **New** within a tier, then review count. `opportunity` is a tiebreaker
  and a label, never the sort key. Optional "nearest to home base".
- Row: name, rating · reviews, city, site status chip, top finding,
  **Research · Accept · Dismiss**
- Bulk "Research unresearched" via `researchMany` — resumable, because each
  item's `stage` is persisted as it lands. **Only for tiers 3–5:** a restaurant
  with no website needs no check, and PageSpeed takes 10–40s per site, so
  checking a whole sweep of 300 would run for the better part of an hour. Check
  the shortlist, not the sweep.
- "Google Maps" attribution on the page (required when showing Places data
  without a Google map)

No new navigation concepts: `/prospects` joins whichever tab stack is active,
and lead links pass `state: { from: "/prospects" }`.

### Files

New: `api/discover.js`, `src/pages/Prospects.jsx`, `src/prospects.js` (pure:
dedupe, chain filter, prune)

Modified: `src/store/useCRMStore.js`, `src/pages/Settings.jsx`, `src/App.jsx`,
`TRACE.md`

---

## 6. The middle-path residual

Places content other than place IDs isn't supposed to be stored, and Places
content isn't supposed to be used with a non-Google map. The middle path covers
restaurants **with** a website: details are re-sourced from their own site.
It doesn't cover restaurants **without** one — there's nothing else to source
from, so their name, phone and address come from Google and their pin lands on
the OpenStreetMap map. Accepted as a deliberate residual, reduced by the 30-day
prune and the attribution. Not legal advice. The alternative is OpenStreetMap
for discovery; its coverage for the territory is unmeasured.

---

## 7. Later — each needs its own go-ahead

- Mobile screenshot read: PSI returns a final mobile screenshot; Claude vision
  could turn it into real mobile findings (labelled, medium confidence)
- Owner name / public email finder — one targeted web search per accepted lead
- Bulk research from Today / Run prep rows
- `source` breakdown in Progress, to measure whether prospects close

## 8. Explicitly not doing

Autonomous agent loop · research modes · budget-tracking system ·
`research_runs` · a separate outreach agent · scheduled prospecting · a learned
lead-scoring model.

## 9. Open flags

- `TRACE.md` §7 still describes `/api/analyze` as `claude-sonnet-4-6` /
  4096; the code is `MODEL` / 6144.
- `src/App.jsx` in project knowledge still has
  `const { addLead, updateLead } = useCRMStore();`, but `TRACE.md` §10.8 lists
  App as converted to `getState()`. Slice 2 edits App.jsx, so this needs
  settling (re-upload, or confirm it's the current file) before then.
- `/api/*` has no auth. Research makes the server fetch URLs; discovery spends
  Places quota. SSRF guards and a Google quota cap cover the worst of it; a
  shared-secret header across all endpoints is a separate, cross-cutting call.
