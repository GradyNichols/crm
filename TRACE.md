# Trace — App Documentation

Reference document for working on Trace across conversations. Covers what the
app is, how it's built, its conventions, and its known architectural debt.

---

## 1. Context

**Trace** is a custom CRM built for and by Grady, a solo freelance web designer
in Simi Valley, CA. He sells **$500 custom websites to independent restaurants**
in Simi Valley, Moorpark, Thousand Oaks, and surrounding areas.

His outreach is a mix of **cold calls, in-person walk-ins, cold emails, and Yelp
messages**. He works alone, largely from his phone while in the field. Trace
exists to replace a spreadsheet and to keep him organized enough to scale
outreach without losing leads.

**This matters for design decisions:** Trace is a single-user, mobile-first,
field-use tool. It is not a team CRM. Speed of data entry and speed of
recall during a live call or walk-in are the priorities.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router (`react-router-dom` v7) |
| State | Zustand v5 with `persist` middleware |
| Storage | **localStorage only** — no backend database |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (`@import "tailwindcss"`, no config file) |
| Font | Outfit (Google Fonts, applied globally via `*` selector) |
| Maps | Leaflet + react-leaflet v5 + OpenStreetMap tiles |
| Geocoding | Nominatim (free, 1 req/sec rate limit) |
| Charts | Recharts v3 |
| Lint | oxlint (`npm run lint`, config in `.oxlintrc.json`) |
| Hosting | Vercel |
| Serverless | Vercel functions in `/api` |

Versions are whatever `package.json` says; this table names the majors so a
docs reader doesn't assume an older API. Node is pinned in `.nvmrc`.

**Design language:** dark, minimal, efficient. No animations beyond subtle
transitions. Background `#03060f`, panels `#0d1117`, accent blue `#3b82f6`,
text `#e2e8f4`. Slate palette throughout. Generated/AI content is purple;
generated **emails** are sky/blue, to separate what you say from what you send.
**Verified site findings** are neutral slate with a source link — they're
evidence, not generated text — and only the model's opinion of them is purple.

---

## 3. The Workflow Model

Added in Phase 2. This is the spine the rest of the app hangs off, and the
answer to "which page do I open?"

```
SOURCES ─────────────────► TODAY ──────────► RUN
who you could contact    what you'll do    what you're doing
Today's own Due list     one ordered       activeRun, the Now Bar,
Calendar  (any day)      queue             Pitch Mode / Call Prep
Advisor   (AI picks)     (dailyPlan)
Map       (nearby)
Search    (manual)
```

**Every source renders the same verb — `QueueButton`.** A page that tells you
who to contact but can't put them anywhere is the failure mode this model exists
to prevent: five surfaces used to generate intent and only one consumed it.

The Leads table (`/`) sits deliberately outside the loop. It's the database you
consult, not part of the daily job.

---

## 4. File Structure

```
TRACE.md              — this document
/claude
  dev-setup.md        — how to build and verify a change
  lead-research-plan.md — the research & prospecting plan (built; kept for
                        its decisions and the Google-terms residual, §6)
/api
  _json.js            — shared model-output parsing + truncation repair.
                        Underscore prefix = not a Vercel route.
  _lead.js            — buildLeadBrief(): the one picture of a lead that both
                        Anthropic writing endpoints prompt from
  _model.js           — MODEL: the only place the model is named
  _psi.js             — the PageSpeed Insights call + speed classification,
                        shared by pagespeed.js and research.js
  _inspect.js         — deterministic website checks: analyzeHtml() (pure),
                        verifiedFacts() (pure), inspectSite() (network, with
                        private-address guard)
  analyze.js          — Anthropic API → Pipeline Advisor analysis
  pitch.js            — Anthropic API → pitch scripts, one lead or a batch
  email.js            — Anthropic API → a subject and body for one lead
  research.js         — site check + Anthropic API → verified findings and a
                        rating, one lead or a batch
  discover.js         — Google Places Text Search → restaurant candidates.
                        No AI: a list is something code can get right.
  pagespeed.js        — Google PageSpeed Insights → site speed scores
/public
  logo.png                    — Trace logo (bars stepping up, blue on dark).
                                Referenced by the navbar + sidebar in App.jsx
                                and as the notification icon/badge in
                                useNotifications.js. Verify with a project-wide
                                search for "/logo.png" before removing.
  favicon.ico
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png        — iOS home screen icon (PWA)
  android-chrome-192x192.png  — Android PWA icon
  android-chrome-512x512.png  — Android PWA icon / splash
  site.webmanifest            — PWA manifest (name, icons, theme colors)
/src
  App.jsx             — routes, sidebar, bottom nav, Now Bar mount, shortcuts
  main.jsx            — entry, wraps in BrowserRouter
  index.css           — Tailwind import, Outfit font, Leaflet + select fixes
  constants.js        — STATUSES, OUTREACH_TYPES, COLUMNS, aging helpers,
                        RUN_MODES + stopPathFor(), generated-content staleness
                        helpers, research staleness + leadFindings(),
                        EMAIL_KINDS + inferEmailKind()
  prospects.js        — tiers, chain detection, lead matching, the sweep merge
                        and pruning. Pure; the store and the page both use it.
  leadContext.js      — lead → API payload. buildLeadPayload() for pitches,
                        buildEmailPayload() for emails, buildResearchSubject()
                        for site checks, leadSnapshot() for staleness
  icons.jsx           — shared SVG icon set (JSX, must be .jsx not .js)
  /store
    useCRMStore.js    — the entire app state (see section 5)
  /hooks
    useNotifications.js — daily digest notification logic
    useTabStacks.js   — per-tab navigation memory for the mobile bottom nav
    useGeneratePitch.js — the single path to /api/pitch, single and bulk
    useGenerateEmail.js — the single path to /api/email, single only
    useResearch.js    — the single path to /api/research, single and bulk
  /components
    LeadTable.jsx     — sortable table, pagination, bulk actions, inline status
    LeadModal.jsx     — add/edit lead form
    SummaryBar.jsx    — dashboard stats, status filter, overdue/stale panels
    EmptyState.jsx    — illustrated empty states (typed by `type` prop)
    NowBar.jsx        — the continuity strip; renders the active run inside the
                        sticky header on every page
    FinishStopModal.jsx — shared "close out this stop" sheet used by both
                        Pitch Mode and Call Prep
    QueueButton.jsx   — THE verb. Renders "+ Today" or "+ Run" (never both) on
                        every source. Also exports QueueAllButton for bulk adds.
    GeneratedPitch.jsx — renders a lead's generated pitch; shared by Lead Detail,
                        Pitch Mode and Call Prep
    GeneratedEmail.jsx — renders a lead's generated email, composes the envelope
                        (greeting + sign-off) and owns the send exits
    LeadResearch.jsx  — renders a lead's site research: rating, Claude's read,
                        verified findings with sources, staleness
  /pages
    Today.jsx         — THE daily page. Due (computed source) over Today's plan
                        (curated queue), bulk pitch prep, Start run. Replaced
                        DailyPlan.jsx and Checklist.jsx, which are deleted.
    RunOverview.jsx   — the run's queue, bulk pitch prep, reordering, recap
    LeadDetail.jsx    — full lead view, notes history, call timer, PageSpeed,
                        site research, generated pitch, generated email
    CallPrep.jsx      — focused phone-call HUD, pitch shown above the controls
    PitchMode.jsx     — focused walk-in HUD
    Calendar.jsx      — month grid of follow-ups, day panel, hover preview
    MapPage.jsx       — territory map, route planning, home base
    Progress.jsx      — analytics and charts
    AI.jsx            — Pipeline Advisor
    Reference.jsx     — pitch scripts, objection responses (sections + cards)
    Search.jsx        — search across all lead fields
    Settings.jsx      — outreach identity, groups, custom columns, notifications,
                        backup, danger zone
    Prospects.jsx     — territory sweep, tiered candidate list, accept/dismiss
    Import.jsx        — CSV bulk import with column mapping
    LeadSpree.jsx     — rapid one-field-at-a-time lead entry (modal)
```

---

## 5. Store Shape (`useCRMStore.js`)

This is the backbone. Everything reads from here. All of it is persisted to
localStorage under the key `crm_leads` via `partialize`.

### Lead object

```js
{
  id: "lead_<timestamp>_<rand>",
  businessName: "El Maizal",     // required
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  website: "",                    // used by PageSpeed and site research
  type: "Phone Call",             // OUTREACH_TYPES
  strength: 3,                    // 1–5
  status: "Cold",                 // STATUSES
  lastTouchDate: "2026-06-24",    // YYYY-MM-DD
  followUpDate: "2026-06-28",
  groupId: null,                  // → groups[].id
  notesLog: [                     // append-only history
    { id, text, ts }
  ],
  generatedPitch: { … } | absent, // optional — see below
  generatedEmail: { … } | absent, // optional — see below
  research: { … } | absent,       // optional — see below
  [customColumnId]: value         // custom columns stored flat on the lead
}
```

### Generated pitch

Optional key. Leads without one are untouched, so this needed no migration.
Lives on the lead rather than in Reference: Reference holds stable hand-written
material, and a generated pitch goes stale the moment the lead's story moves on.

```js
generatedPitch: {
  opener: "…",       // first thing you say
  hook: "…",         // the specific observation that earns 30 more seconds
  value: "…",        // the offer and why $500
  objections: [{ objection, response }],
  close: "…",
  generatedAt: "<ISO>",
  basedOn: {         // snapshot it was written against — drives staleness
    status, notesCount, lastTouchDate, speedScore,
    researchedAt,    // research.checkedAt at the time, or null. Absent on
                     // anything written before site research existed.
  }
}
```

### Generated email

Same pattern, same staleness machinery, different lifecycle: a pitch is spoken,
an email is sent once and then it's history.

```js
generatedEmail: {
  subject: "…",
  body: "…",         // the MESSAGE ONLY — no greeting, no sign-off (see §6)
  kind: "intro" | "follow_up" | "nudge" | "after_pitch",
  generatedAt: "<ISO>",
  basedOn: { status, notesCount, lastTouchDate, speedScore, researchedAt }
}
```

### Site research

Optional key, written by `/api/research` through `useResearch`. Rides along with
`leads`, so it needed no `partialize`/`merge` entry and is in every backup.
~1–2 KB per lead.

```js
research: {
  checkedAt: "<ISO>",
  website: "…",            // the lead's website AS CHECKED — compared with the
                           // current one to detect a changed site
  checks: {                // raw inspector output, compacted
    url, finalUrl, status, reachable, error, https, certError, blocked,
    thirdParty, freeSubdomain, parked, platform, viewport, copyrightYear,
    telLink, thinContent, linksChecked, psiAttempted, psiConfirmedLoad,
    menu: { url, kind, host, status },   // kind: page|pdf|image|third_party|external
    ordering: { host }, reservations: { host },
    contact: { name, phone, address },   // schema.org JSON-LD, when present
    brokenLinks: [{ url, status }],
  },
  speed: { score, lcp, status, checkedAt } | null,
  findings: [              // every verified problem, picks first
    { check: "menu_pdf", text: "The menu is a PDF download.",
      source: "https://…", lead: true }
  ],
  opportunity: "high" | "medium" | "low" | null,  // Claude's opinion
  confidence: "high" | "medium" | "low",          // capped by visibility
  reason: "…",             // one sentence, Claude's opinion
  likelyChain: false,      // Claude's opinion; unused until Prospects
  assessed: true,          // false when the model call failed, or when the
                           // site couldn't be read at all and was never judged
  visibility: "full" | "limited" | "psi_only" | "blocked",
  visibilityNote: "…",
}
```

### Top-level state

| Key | Shape | Purpose |
|---|---|---|
| `leads` | `Lead[]` | all leads |
| `customColumns` | `{id,label,type,options?}[]` | user-defined columns |
| `groups` | `{id,name}[]` | territory/campaign segments |
| `sortKey` / `sortDir` | string | table sort, persisted |
| `refSections` | `{id,title,cards[]}[]` | Reference page; cards have `isPitchScript` |
| `geocache` | `{ [address]: {lat,lng} \| null }` | `null` = geocoding failed |
| `pageSpeedCache` | `{ [url]: {url,score,lcp,status,checkedAt} }` | PSI results, keyed by the lead's `website.trim()`. Also written when research runs PSI. |
| `homeBase` | `{address,lat,lng,manualCoords}` | route origin |
| `portfolioUrl` | string | shown in Pitch Mode; fed to both writing prompts; **required** to generate an email |
| `senderName` | string | who he is in both writing prompts — signs every generated email, and opens every generated pitch. Seeded to `"Grady"` |
| `emailSignature` | string | optional lines under the name |
| `pipelineAnalysis` | `{result,analyzedAt,leadCount}` | persisted AI analysis |
| `notifSettings` | `{enabled,summary,overdue,stale}` | notification toggles |
| `dailyPlan` | `{leadId,checkedAt}[]` | **Today's plan** — the curated queue, order matters |
| `lastPlanDate` | `"YYYY-MM-DD"` | for midnight reset; **seeded to today** |
| `lastPlanSummary` | `{leadId,checkedAt}[]` | yesterday's completions |
| `prospecting` | `{items, lastSweepAt, sweepCount}` | discovered restaurants, before they are leads (see below) |
| `activeRun` | `Run \| null` | what you're doing right now (see below) |
| `lastRun` | `Run & {endedAt} \| null` | the finished run, until its recap is dismissed |

`dailyPlan` keeps its name in the store even though the page is now called
Today. Renaming a persisted key would need a migration of live data for no
functional gain.

`senderName` is **seeded**, not empty: it arrived after v1.0, and an existing
install rehydrating with `""` would have silently started sending unsigned
emails. `merge` uses `??` rather than `||` so a name cleared on purpose still
sticks.

Per-tab navigation memory is **not** in the store — see §9.

### Prospecting

A holding area, not rows in `leads`. A sweep brings back hundreds of
restaurants; putting them straight into the pipeline would flood Due, the stale
flags, Progress and the Pipeline Advisor — which sends every lead in one prompt.

```js
prospecting: {
  items: {
    [placeId]: {
      placeId, name, address, phone, website,
      siteKind: "none" | "own" | "third_party" | "free_subdomain",
      siteLabel, rating, reviewCount, location, primaryType,
      stage: "found" | "researched" | "accepted" | "dismissed" | "expired",
      firstSeenAt: "<ISO>",
      chain: false,            // list + repeats within one sweep
      existingLeadId: null,    // matched to a lead already in the pipeline
      research: { … },         // same shape as lead.research
    },
  },
  lastSweepAt: "<ISO>" | null,
  sweepCount: 0,
}
```

**Tombstones.** `accepted`, `dismissed` and `expired` items keep only the place
id, the stage and `firstSeenAt`. A dismissed restaurant can't come back next
sweep, an accepted one can't be added twice, and a revived expired one keeps its
original date so it doesn't masquerade as new. Details live on the lead once
accepted.

### Run object

A **Run** is a bounded working session over an ordered queue of leads. It is the
continuity layer: it survives navigation, a refresh, and a force-quit.

```js
{
  id: "run_<timestamp>_<rand>",
  mode: "walkins" | "calls" | "mixed",       // decides which HUD each stop opens
  origin: "plan" | "map" | "checklist" | "adhoc",
  startedAt: "<ISO>",
  queue: [leadId],                            // ordered snapshot taken at start
  cursor: 0,                                  // index of the current stop
  done: { [leadId]: { at, outcome } },        // "Yes"|"Maybe"|"No"|"logged"
  skipped: { [leadId]: true },                // comes back around at pass end
}
```

**Only one run exists at a time.** Starting a second replaces the first.

### Key actions

- `addLead` / `addLeadsBulk` / `updateLead` / `deleteLead`
- `logTouchpoint(leadId, {type, note})` — stamps `lastTouchDate` **and** appends
  to `notesLog`. This is the canonical way to record activity.
- `setLeadPitch(leadId, pitch)` / `clearLeadPitch(leadId)` /
  `setLeadEmail(leadId, email)` / `clearLeadEmail(leadId)` /
  `setLeadResearch(leadId, research)` / `clearLeadResearch(leadId)` — clearing
  deletes the key rather than setting it undefined, so `"generatedPitch" in lead`
  stays a reliable test.
- `setPortfolioUrl` / `setSenderName` / `setEmailSignature`
- `addToPlan` / `removeFromPlan` / `checkOffPlan` / `uncheckPlan` /
  `movePlanItem` / `clearDailyPlan` / `dismissPlanSummary`
- `startRun({mode, origin, queue})` — returns the run, or `null` on an empty
  queue. Dedupes ids.
- `completeRunStop(leadId, outcome)` — records the outcome, checks the lead off
  Today's plan if it's on it, and advances the cursor. **The canonical way to
  close a run stop.**
- `skipRunStop(leadId)` / `setRunCursor(i)` / `addToRun(leadId, {next})` /
  `removeFromRun` / `moveRunStop(leadId, dir)` / `endRun` / `dismissRunRecap`
- `togglePitchScript(secId, cardId)` — marks a Reference card for Pitch Mode
- `recordSweep(candidates, at)` / `setProspectResearch(placeId, research)` /
  `dismissProspect(placeId, reason)` / `acceptProspect(placeId, {type, groupId})`
  (returns the new lead id) / `pruneProspecting()`
- `restoreBackup` / `mergeBackup` / `resetAllData`

---

## 6. Domain Rules

**Statuses:** `Cold → Contacted → Warm → Waiting → Dead | Closed`

**Follow-up auto-suggest** (on status change): Warm +3d, Waiting +5d,
Contacted +7d, Cold +14d. Dead/Closed clears the date. Never pushes an
existing date *further out*, only closer.

**Aging thresholds** (days without contact before flagged stale):
Warm 5, Waiting 5, Contacted 7, Cold 14. Dead/Closed never age.

**Overdue** = `followUpDate < today` AND `lastTouchDate !== today` AND status
not Dead/Closed.

**Win/loss capture:** moving a lead to Closed or Dead prompts for a reason,
logged as `[Closed] ...` / `[Dead] ...` in `notesLog` and rendered in
green/red respectively.

**The plan resets at midnight.** The rollover runs once per app load from
`App.jsx`, with a safety-net check on `Today` mount for a session left open
across midnight. Checked items move to `lastPlanSummary` and show as a recap
modal; unchecked items carry over.

### Today rules

**Due excludes anything already in the plan.** A lead you've added has been
triaged — it belongs to the queue below, not the source list above. Without
this the same lead renders twice on one screen.

**Due collapses once there's nothing left to triage** and stays wherever you
last put it after that. Widening the filter (`Show all active`) reopens it,
since that's an explicit request to look at the list. The open/closed state is
component state — deliberately not persisted, because it's derivable.

**One logging UI.** Checking off a planned stop and logging an untriaged due
lead open the same sheet. `Skip` only appears when there's a plan item to check
off. Two different-looking log controls on one page was half of why Checklist
and Daily Plan felt like separate tools.

### Queueing rules

**One verb at a time.** `QueueButton` offers the run when one is in progress and
today's plan otherwise — never both. Mid-run the useful move is "work this
next"; outside a run it's "put this on today's list". Two near-identical buttons
is a decision not worth making in the field.

**Adding always appends.** Neither `+ Today` nor `+ Run` jumps the line.
Reordering is one tap away on `/today` or `/run`, and silently reshuffling a
drive you're halfway through is the worse default.

**Any day can feed today.** Calendar queueing is not restricted to today's cell
— last week's overdue follow-ups and next week's upcoming ones are both
actionable. That gate was the reason Calendar felt read-only.

**Advisor names resolve, or the row says so.** `resolveLead()` in `AI.jsx` does
an exact case-insensitive match, then a single-candidate containment match.
Ambiguous or unmatched recommendations render with a "No matching lead" note and
no button, rather than guessing at the wrong restaurant.

### Generated pitch rules

**One pitch per lead, stored on the lead.** Regenerating overwrites. There's no
history — a superseded pitch has no value once the lead's story moved on.

**Written against a snapshot; staleness is surfaced, never hidden.**
`isPitchStale()` / `pitchStaleReason()` in `constants.js` compare `basedOn` to
the lead now. A status change, new touchpoints, or a site check run (or
cleared) since raise a banner on the pitch itself, because the failure mode is
reading a confident script that argues from facts that have changed.

**One code path for every trigger.** Lead Detail, Pitch Mode, Call Prep, the
Pipeline Advisor and the bulk prep rows all call `useGeneratePitch()`. Only one
generation runs at a time — `pendingId` for a single lead, `bulk` for a batch —
which is what lets a list show a spinner on exactly one row.

**Prep in bulk; rewrite one at a time.** `generateMany()` is the normal path: it
filters to leads with no pitch, chunks them into groups of `MAX_BATCH` (6), and
sends each chunk as one request. Seven stops is two calls rather than seven taps
and seven waits, and the system prompt is amortised across the group instead of
being resent per lead. **Bulk never overwrites an existing pitch** — rewriting is
always an explicit single-lead action, so a batch can't quietly replace something
you were happy with.

**A short batch keeps what landed.** If the model returns fewer pitches than
requested (truncation, or a chunk that errored), the ones that came back are
written and the shortfall is reported. The prep row stays, offering to finish the
rest.

**Generation never happens automatically.** Nothing generates on page load or on
run advance. Pitch Mode and Call Prep each offer it from their empty state — the
"sitting in the car outside" case — and Today and Run Overview offer the batch.

**Where it's read.** Call Prep puts the pitch directly under the lead header,
above the timer and the log controls: on a phone call you can read it off the
screen, which is the one place that's allowed. Pitch Mode shows it above the
Reference scripts — specific beats general. Reference stays exactly what it was:
stable hand-written material, unpolluted by generated per-lead content.

### Generated email rules

**A portfolio URL is a hard precondition.** The email's only job is to get the
owner to look at the work and decide. Without a link there is nothing to write
toward, so both the hook (`canGenerateEmail`) and the endpoint refuse with an
explanation and a route into Settings, rather than producing something vague.

**Four kinds, inferred not asked.** `intro`, `follow_up`, `nudge`,
`after_pitch`. Which one you're writing is the single biggest lever on the
output and it's knowable from the lead's own data, so `inferEmailKind()` picks
one and `emailKindReason()` shows its reasoning ("you pitched them last",
"quiet for 12 days"). The chooser still lists all four — the inference is a
default, not a decision taken away.

**The model writes the message; the app owns the envelope.** The stored `body`
is the message only. The greeting (`Hi <first name>,`, or plain `Hi,` when
there's no owner name) and the sign-off (`senderName` then `emailSignature`) are
composed in `GeneratedEmail.jsx` at render and copy time. Three consequences,
all of them the point:

- Editing your signature in Settings updates every email you have already
  generated, because nothing is baked into the draft.
- The model's 120-word budget is spent entirely on the message.
- The greeting can't be duplicated or personalised wrongly — it's assembled from
  `ownerName`, not guessed at by the model.

The system prompt tells the model not to write either, and `stripEnvelope()` in
`api/email.js` removes one anyway if it does. Trusting the prompt alone would
have produced "Hi Rosa," twice.

**Social proof is counted, never claimed.** `buildSocialProof()` derives the
number of Closed leads and the areas they're in from the pipeline itself, and
the prompt allows it exactly one clause. **Clients are never named** — naming
someone in a cold email without asking them is a decision to take deliberately,
not a default. No closed deals means no claim at all.

**Every context input needs a rule.** More context does not automatically mean
better output; an input with no instruction attached gets ignored or crowbarred
in. Each of the email-only inputs is paired with one in `SYSTEM`: the track
record gets one clause, the pitch angle must be *the same argument in writing*,
the custom fields aim the email but are never quoted back, and today's date is
used only if the season genuinely changes what to say. Verified site findings
(shared with the pitch) get their own rule too: the first one is the opening,
and no other website problem may be claimed.

**One email per lead, single generation only.** No bulk path, deliberately: you
read an email before you send it, so eight at once is a queue of drafts you still
have to open one by one. Pitches are the opposite — you prep a run and glance at
each as you arrive.

**Sending is invisible to the app, so "Log as sent" closes the loop.** Copy and
`mailto:` are the two exits; neither tells Trace anything. Without the explicit
log the email lives outside the touchpoint history and the lead reads as
untouched on every other screen.

**Not in Reference.** Same rule as pitches. Reference is stable hand-written
material; generated per-lead content has a different lifecycle.

### Site research rules

**Code observes, the model judges.** `api/_inspect.js` fetches the site and
`verifiedFacts()` turns what it saw into a fixed list of problems, each with a
key (`menu_pdf`, `no_viewport`, `broken_links`, …) and code-written wording.
The model gets that list and nothing else — no browsing — and answers with
**keys**, a rating, a confidence and one sentence of opinion. Stored findings
are always the code's text and source for the keys picked; an unknown key is
dropped. The model can rank evidence but can't write any.

**Every verified problem is kept.** The model's picks (max 3) are marked
`lead: true` and shown under "Worth raising"; the rest sit under "Also found".
If the model call fails, the findings are still saved — ranked by
`PROBLEM_PRIORITY`, `assessed: false`, "Not rated" in the UI.

**PageSpeed is the second opinion, and the fallback.** Restaurant platforms
behind bot protection (Popmenu, and plenty of others) serve Google and refuse
us. So PSI runs even when our own read was refused or failed — Google renders
the page from its own addresses — and `mergePsiSignals()` fills what we
couldn't see: the mobile viewport audit, and the platform, fingerprinted from
Lighthouse's network-request list. Every one of those signals is optional; an
audit Google didn't return leaves it `null`, and a null signal makes no claim.

**A site that refuses us is not a site that is down.** If our fetch failed but
PSI loaded the page, the `unreachable` finding is dropped — claiming "the site
didn't load" would be a false statement about their business. Visibility
becomes `psi_only` (confidence capped at low) and the only findings available
are the two Google reports: slow, and no mobile viewport. When neither we nor
Google could load it, `unreachable` stands and says so ("and Google PageSpeed
couldn't load it either").

**The model's answer is matched tolerantly, but never guessed at.** Asked about
one restaurant, a model often replies with the assessment alone instead of
keyed by the id it was given. `pickEntry()` accepts that — plus a differently
cased id, the business name, or an array — and only falls back to an unkeyed
object when there was a single subject, where it can't belong to anyone else.
In a batch, no match means no rating; attaching one lead's judgement to another
would be worse than none. Requiring the exact key is what reported a perfectly
good assessment as "Not rated".

**Read the model's answer leniently; reject only what's actually unusable.**
`/api/research` accepts "Low", "low opportunity" and "strong" as levels
(`level()`), the common alternate field names (`coerceEntry()`), pick keys in
any case, every text block in the response rather than the first, and a
JSON-prefilled reply. Strict matching on the exact lowercase word is what
turned three good assessments in a row into "couldn't be read". The leniency is
about *spelling*, never substance: an invented finding key is still dropped, and
a level that means nothing still produces no rating.

**A missing rating always says why.** If the model call failed, the error text
reaches the UI; if it answered something unusable, the response says so. Both
beat a silent blank, which is indistinguishable from a bug.

**Nothing verified means nothing rated.** A subject whose visibility is
`blocked` is never sent to the model — the request is skipped entirely if every
subject is blocked — and comes back `opportunity: null`, `assessed: false`.
Lead Detail shows "Couldn't check this site" with the reason and a link to open
it, not a rating. Asking the model anyway is what produced a confident "medium
opportunity" on a site nobody had read, which is the exact failure this feature
exists to prevent.

**The check never claims what it couldn't see.**
- A 403/429 or a Cloudflare interstitial is `blocked`. With PSI it degrades to
  `psi_only`; without it, no findings at all and confidence capped at low.
- A page with almost no server-rendered text (`thinContent`) is `limited`:
  "no menu link" and "no tap-to-call link" are suppressed, confidence capped at
  medium.
- Only 404, 410 and 5xx count as broken links. A 403 from bot protection isn't
  broken, and a link that couldn't be reached isn't reported.
- A copyright year written by JavaScript has no digits in the HTML → no finding.
- A site that didn't load says "when checked" — it may be temporary.
- The wording states what was seen, not what it costs them. The pitch makes the
  argument; research only supplies the fact.

**Not really their site counts as a finding.** A website field pointing at
Facebook, Instagram, Yelp, Toast, DoorDash, Linktree and the like — or a domain
that redirects there — is `third_party_site`, and the check stops without
fetching the platform. A builder's free address (`wixsite.com`,
`godaddysites.com`, …) is `no_custom_domain`.

**Only lead findings about the current site reach the prompts.**
`leadFindings()` returns the `lead: true` findings, and only when
`research.website` matches the lead's `website` (`sameSite()` ignores scheme,
`www.` and a trailing slash). `buildLeadPayload()` sends them as `siteFindings`,
so both the pitch and the email get them; `_lead.js` renders the section only
when it's non-empty.

**Research goes stale by age or by address.** `researchStaleReason()` flags it
after 30 days (`RESEARCH_MAX_AGE_DAYS`), when the lead's website changed, or
when the website was removed. The banner sits on the research itself.

**One code path; never automatic.** Lead Detail calls `useResearch()`, which
also has `researchMany()` (chunks of 6, same contract as pitch prep) for the
coming Prospects page. Nothing checks a site on page load — a check fetches
someone else's website and costs a model call.

**PageSpeed is reused, not repeated.** A cached PSI result under 7 days old is
sent along and the server skips PSI. When the server does run PSI, the hook
writes it into `pageSpeedCache` under the lead's own key, so the Site Speed
panel and the pitch see it.

**Leads without a website make no call.** The section says so and points at
Edit.

**Where it's read.** Lead Detail only, between Site Speed and Pitch — research
feeds the pitch, so the page reads in that order. **The HUDs are unchanged:**
findings reach Call Prep and Pitch Mode through the pitch's hook, so the field
tap sequence didn't move.

**Not in Reference.** Same rule as pitches and emails.

### Prospecting rules

**Tiers, not the model's rating.** Slice 1 showed `opportunity` coming back
"medium" for every readable site whose only problem was speed, so it can't
order a list of three hundred restaurants. `tierOf()` ranks on what code knows:

1. No website at all — straight from Places, no check needed
2. Not their own site — a Facebook/Yelp/Toast page, or a builder's free address
3. Down or broken — didn't load, parked, broken menu or links
4. Has problems — loads, but the check found something
5. Not checked yet — including a site that blocked the check and gave up nothing
6. Clean, or already on a paid restaurant platform

New arrivals sort first within a tier, then review count. The rating still shows
on the card; it is never the sort key.

**Only tiers 3–5 are ever checked.** `needsCheck()` excludes tiers 1 and 2 (a
check can't improve on "they have no site of their own"), chains, and anything
already a lead. PageSpeed takes 10–40s per site, so checking a whole sweep would
run for the better part of an hour. The row button and the bulk button use the
same predicate so they can't disagree.

**Nothing is discovered automatically.** A sweep costs Google money and happens
on a button press. Six checks at a time, matching `/api/research`'s batch.

**Chains are filtered, not deleted.** A franchisee can't commission a website.
`looksLikeChain()` uses a name list plus two repeat rules — the same name or the
same website domain appearing three or more times in one sweep — and the count
stays visible so the filter can be turned off.

**Matching an existing lead: phone first, then name and city.** Phone is the one
field that can't coincide (`phoneKey()` compares the last ten digits). Name
alone would collide across towns, so it needs the city to agree, and a name made
entirely of words like "The Grill" normalizes to nothing and never matches.

**Accept is the only way a prospect becomes a lead**, and it asks the two things
only he knows: how he'll approach them, and which group. Status starts Cold,
strength 3 — the tool doesn't get to grade his pipeline. The lead carries
`source: "prospect"` and `placeId`, so Progress can later measure whether these
close.

**Google's terms.** Place IDs may be stored indefinitely; other Places content
may not be cached, and it must not be shown with a non-Google map. Untouched
prospects are pruned to a tombstone after 30 days, and the page carries the
required "Business listings from Google Maps" line. Accepted leads still keep
Places-sourced details, which is the deliberate residual noted in
`claude/lead-research-plan.md` §6.

### Run rules

**Cursor advance:** the next stop is the first one in `queue` that is neither
done nor skipped, searching forward from the current index and then wrapping to
the front — so a skipped stop comes back around at the end of the pass. When
nothing is open, the run ends automatically and moves to `lastRun`.

**Skipping never touches the lead.** No status change, no touchpoint. It only
moves the cursor.

**Jumping to a stop clears its skip flag** — you're working it now.

**Finishing a stop mirrors into Today's plan** but not the reverse: checking a
lead off in Today does not advance a run.

**Mode decides the HUD** via `stopPathFor(mode, lead)` in `constants.js`:
walk-ins → `/pitch/:id`, calls → `/call/:id`, mixed → the lead's own `type`
(`Walk-in` → pitch, everything else → call).

**Origins:** Today starts a run of any mode; a map route always starts a
`walkins` run. The `"checklist"` origin value is retained for runs stored before
the merge.

---

## 7. Serverless Endpoints

All live in `/api`, deployed automatically by Vercel. **They do not run under
`npm run dev`** — use `vercel dev` or test on the deployed URL.

`_json.js` holds `parseModelJSON()` (straight parse → extract a JSON blob from
prose/markdown → repair truncation → `escapeStrayQuotes()`) and is shared by
every Anthropic endpoint. The last stage escapes double quotes that appear
inside a string *value*: asked to build a hook on a verified finding, and one of
the findings is `browsers label it "Not secure"`, the model replies with
`"hook": "…label it "Not secure" before…"`, which is not JSON and which the
truncation repair cannot fix — nothing is truncated, the string tracking is just
desynced from the first stray quote on. A quote inside a string counts as the
real closing quote only when the next non-whitespace character is `,`, `:`, `}`,
`]` or end of input. It runs last, after the other three stages have failed, so
it can only turn a `null` into a parse.
`_lead.js` holds `buildLeadBrief()`, the single picture of a lead that both
writing endpoints prompt from. `_model.js` holds `MODEL` — the only place the
model is named. `_psi.js` holds the PageSpeed call. `_inspect.js` holds the site
checks. Files under `/api` prefixed with `_` are not treated as routes.

**Current model: `claude-sonnet-5`** on all four Anthropic endpoints (analyze,
pitch, email, research). Swapped from `claude-sonnet-4-6` in September 2026:
$2/$10 per MTok instead of $3/$15, against a ~30% larger tokenizer, so roughly
15% cheaper per unit of actual text on a newer model. `max_tokens` on
`/api/analyze` went 4096 → 6144 in the same change (see §8).

`buildLeadBrief()` renders email-only sections (group, custom fields, pitch
angle, track record, today's date, sender first name) **only when those keys are
present**, and the pitch payload never carries them — which is how one brief
builder serves two endpoints without the pitch prompt quietly changing. The
verified-findings section works the same way but is fed by both payloads.

### `POST /api/analyze`
Body `{ pipeline: string }`. Sends formatted lead data to Claude (`MODEL`,
`max_tokens: 6144`), returns:
```js
{ urgent: [{lead, reason}], stale: [{lead, reason}],
  insights: [string], nextSteps: [string], truncated?: true }
```
**Note:** `lead` is a business-name *string*, not an id — see the resolution
rule in §6.
Env: `ANTHROPIC_API_KEY`.

### `POST /api/pitch`
Takes **either** shape:

- `{ lead: {...} }` → returns one pitch: `opener`, `hook`, `value`,
  `objections[]`, `close`, every field guaranteed to exist.
- `{ leads: [{id, ...}, ...] }` → returns
  `{ pitches: { [leadId]: pitch }, requested, returned, truncated? }`.
  Capped at `MAX_BATCH` (6) per request; a larger batch is a 400. Entries that
  come back unusable are dropped rather than failing the whole call, which is why
  the response reports `requested` alongside `returned`.

The lead payload is what `buildLeadPayload()` builds: identity, status, strength,
outreach type, days since touch, the last 12 touchpoints, the cached PageSpeed
result, the verified site findings (`siteFindings`, `siteCheckedAt`), the
portfolio URL and `senderName`. `max_tokens` scales with batch size. The rules
tell the model to open with his actual first name, build the hook on the first
verified finding when there is one, fall back to bad site speed when there
isn't, and never claim any other website problem.

`buildLeadBrief()`, `buildBatchBrief()` and `normalizePitch()` are exported so
the prompt input and the response shaping can be unit-tested without an API key —
the whole value of this endpoint is that it's grounded in real lead data, so what
goes into the prompt is the part worth testing.
Env: `ANTHROPIC_API_KEY`.

### `POST /api/email`
Body `{ lead: {...}, kind }` where `kind` is one of `EMAIL_KIND_BRIEFS`'s four
keys. Returns `{ subject, body, kind, truncated? }`.

- **400 with no `lead.portfolioUrl`** — a hard requirement, not a degraded
  output (§6).
- The payload is what `buildEmailPayload()` builds: everything in the pitch
  payload, plus `today`, `groupName`, `customFields[]`,
  `pitchAngle` (the existing `generatedPitch.hook`) and
  `socialProof: {closed, areas} | null`.
- `body` comes back as the **message only**. `stripEnvelope()` removes a
  greeting or sign-off the model wrote anyway; if stripping leaves nothing, the
  response is a 500 rather than an empty draft.

`normalizeEmail()` and `stripEnvelope()` are exported for the same reason as the
pitch helpers.
Env: `ANTHROPIC_API_KEY`.

### `POST /api/research`
Takes **either** `{ subject }` or `{ subjects: [...] }` (max `MAX_BATCH` = 6).
A subject is what `buildResearchSubject()` builds:
`{ id, businessName, address, website, pageSpeed? }`. 400 when there's no
website.

Per subject, in parallel: `inspectSite()` (homepage, redirects followed by hand,
up to 8 link checks, 25s budget) → PSI with `signals: true` unless a recent
result was supplied or the URL isn't their site (60s timeout) →
`mergePsiSignals()` → `verifiedFacts()`. Then **one** model call for the
subjects that have something to judge; subjects whose visibility is `blocked`
are left out, and the call is skipped entirely when none qualify.
`maxDuration: 180`.

- Single returns the research object (§5) plus `speedFetched?`,
  `assessError?`, `truncated?`. `assessError` carries the API error, or an
  explanation when the model's answer couldn't be matched.
- Batch returns `{ results: { [id]: research }, requested, assessed,
  assessError?, truncated? }`.
- If the model call fails, the response is still a 200 with unrated findings
  and `assessError` set.

`inspectSite()` refuses anything that resolves to a private, loopback,
link-local or carrier-NAT address, non-default ports and `localhost`, checked on
every redirect hop. Its `allowPrivate` option exists only for the local test
suite.

`analyzeHtml()`, `verifiedFacts()`, `mergePsiSignals()`, `platformFromHosts()`,
`normalizeResearch()`, `buildResearchBrief()`, `compactChecks()`,
`shapeResult()`, `pickEntry()` and `looksLikeEntry()` are exported for tests, as
is `extractSignals()` in `_psi.js`.
Env: `ANTHROPIC_API_KEY`, `PAGESPEED_API_KEY`.

### `POST /api/discover`
Body `{ queries: ["restaurants in Simi Valley, CA", …] }`, capped at
`MAX_QUERIES` (8). Each query pages up to `MAX_PAGES` (3) — Places returns at
most 60 results per query — and every page is one billable call.

Returns `{ candidates, stats, errors? }`. Candidates are `normalizePlace()`
output, including `siteKind` from `classifyWebsite()` in `_inspect.js`, so the
same host lists decide "not their own site" for a prospect and for a lead.
Filters: operating only (`isOperating` treats an absent status as open), food
types only (`isRestaurant`), deduped by place id. One failing query doesn't lose
the rest; all of them failing is a 502 carrying Google's message.

**Cost.** The field mask asks for website, phone, rating and review count, which
bills at the Places Enterprise SKU ($35 per 1,000 calls, 1,000 free per month as
of September 2026). One results page is one billable call, so a sweep costs
`queries × pages` — 9 for the three default areas with one keyword, 24 at the
`MAX_QUERIES`/`MAX_PAGES` ceiling.

The caps in this file are the first guard. The real one is set on the key in
Google Cloud, where Places API (New) exposes both a per-minute and a per-day
quota per method — the live settings are `SearchTextRequest` at 60/minute and
50/day, with every other method zeroed, since this code calls only
`places:searchText`. An earlier version of this paragraph called the Cloud guard
"a daily quota" without having confirmed one existed; it does, and it's the cap
that bounds spend. The per-minute quota only bounds the bleed rate.
Env: `GOOGLE_PLACES_API_KEY`.

`normalizePlace()`, `isRestaurant()`, `isOperating()`, `buildSearchBody()` and
`FIELD_MASK` are exported for tests.

### `POST /api/pagespeed`
Body `{ url: string }`. Returns `{url, score, lcp, status, checkedAt}` where
`status` is `bad` / `warn` / `good` (bad = score <50 or LCP >4s). The call itself
lives in `_psi.js`; the response is unchanged from before the move. Research
calls the same helper with `signals: true`, which adds the SEO category and a
`signals` key; this route passes neither, so nothing here changed.
Env: `PAGESPEED_API_KEY` (Google Cloud API key, format `AIza...`).

---

## 8. Conventions & Gotchas

These were all learned the hard way. Don't re-discover them.

**Zustand actions must use `getState()`, not selectors.** The `persist`
middleware strips functions during hydration, so
`useCRMStore((s) => s.someAction)` can return `undefined` after a refresh.
Use `useCRMStore.getState().someAction`. State values are fine as selectors.

**Never put `?? []` inside a selector.** `useCRMStore((s) => s.x ?? [])`
creates a new array reference every render → infinite loop. Write
`useCRMStore((s) => s.x) ?? []` instead.

**Never compute `today` at module scope.** In an installed PWA left open
overnight, a module-level `const today = ...` keeps grading against yesterday.
Compute it inside the component or a helper.

**Derive from `location`; don't mirror it into state.** A `useState` that tracks
something about the current route updates in a *different* render than the
router's own location change. An effect that reads both then sees new state
beside the old path — or the reverse — and "corrects" the wrong one. This ate an
hour on the tab-stack work: the active tab was stored, so tabbing back to a lead
filed that lead under the tab you'd just left. `useTabStacks` now keeps a ref for
the owning tab and computes the active tab during render, which makes the race
impossible rather than unlikely.

**A fixed full-screen page needs `min-h-0` on its scroll child.** A
`fixed inset-0 … overflow-hidden` parent whose child is `flex-1 overflow-y-auto`
only scrolls if every wrapper between them is a flex column *and* carries
`min-h-0`. Miss it and the child grows past the viewport and the parent silently
clips it — that's what cut off the bottom of Call Prep. Both HUDs are built this
way now: `shrink-0` header, `flex-1 min-h-0 overflow-y-auto` body, `shrink-0`
footer for the primary CTA.

**Read the cursor back from the store, don't predict it.** After
`completeRunStop`, read `useCRMStore.getState().activeRun` to find the next
stop. The store owns advance/wrap/end; duplicating that logic in a page is how
the two drift.

**The Now Bar lives inside `<header>`.** It's rendered after the header's inner
row, so it inherits the sticky positioning and never has to negotiate with the
bottom nav, the FAB (`bottom-36`), or pagination clearance (`pb-20`). Don't move
it into the page body. It hides itself on `/pitch/:id`, `/call/:id` and `/run`
— those screens *are* the run.

**Don't hand-roll the queue affordance.** Import `QueueButton` rather than
writing another add-to-plan button. The verb has to look and behave identically
everywhere or it stops reading as one action; it also owns the run-vs-plan
decision, which is easy to get subtly wrong per page.

**Batch AI work in one request, not a loop of them.** `/api/pitch` and
`/api/research` take arrays precisely so prepping a run is two calls rather than
seven. A client-side loop over a single-item endpoint costs a round trip and a
full system prompt per item, and makes partial failure much messier to report.

**Anything AI-written carries the snapshot it was written from.**
`pipelineAnalysis` stores `leadCount`; `generatedPitch` and `generatedEmail`
store `basedOn`. All surface a staleness note when the data has moved on.
Generated content that can't tell you how old its assumptions are is worse than
no generated content — it reads exactly as confident either way.
`isGeneratedStale(lead, key)` is the generic implementation; `isPitchStale` and
`isEmailStale` are thin aliases. Add a third generated key and reuse it. When a
new input starts feeding the prompts (as `researchedAt` did), add it to
`leadSnapshot()` and compare it with `?? null` on both sides, so content written
before the field existed doesn't all turn stale at once.

**Code observes, the model judges.** When a model is asked about the outside
world, it gets facts that code verified and answers in keys that code can check.
Anything it says in its own words is stored and shown as opinion. See §6 Site
research rules — this is the pattern Prospects will copy.

**No assistant prefill — this model rejects it.** Seeding the reply with an
opening brace to force JSON returns
`invalid_request_error: This model does not support assistant message prefill.
The conversation must end with a user message.` It was added to make JSON
parsing safer and instead broke every check outright, which is the worse
failure: a chatty answer can be parsed, a rejected request cannot. Request
bodies come from `buildAssessRequest()` precisely so a test can assert the
conversation ends with a user message without needing an API key.

**Read every text block, and never key a parse failure off one message.**
`callAnthropic()` in `pitch.js` used to return `data.content?.[0]?.text`, which
is `""` the moment a reply leads with any non-text block — and an empty string
fails parsing with no hint the model answered at all. Join every `type: "text"`
block instead. The same bug wore three faces on the way to being found: stray
quotes inside a value, a single request answered in the batch shape, and an
empty text block all produced the identical string "Could not parse AI
response." with a 500. When a message can mean three things it diagnoses none of
them, so the unusable-answer errors quote the model's first 160 characters, the
way `/api/research` already did.

**Anything the model can't look up, it will make up.** Asked to write an opener
without being told his name, the model invented one — a generated pitch for a
real lead opened `Hi, is this the owner of Vapollo? I'm Dave`. Nothing errored;
the script was just wrong in a way only he could catch, and he'd have read it
out loud on a cold call. `senderName` lived in the store and in
`buildEmailPayload()` but never reached `buildLeadPayload()`, so the pitch
prompt had no name in it at all. Every fact the output depends on has to be in
the brief or explicitly ruled out — the rules now say to use his name exactly as
given, and to write an opener that needs no name when none is given rather than
inventing one.

**A single request can come back in the batch shape.** The single and batch
system prompts share `PITCH_SHAPE`, and the model sometimes reaches for the
`{ "pitches": { … } }` wrapper even when given one lead. `unwrapSingle()` in
`pitch.js` takes the entry matching the lead id, or the lone entry when there is
exactly one. With two or more entries and no id match it returns `null` rather
than guessing — the same rule `pickEntry()` follows in `research.js`.

**Be strict about what a model may claim, lenient about how it says it.** Two
different jobs that are easy to confuse. Substance — which findings exist,
whether a site was readable — is checked hard and dropped when wrong. Format —
casing, field names, wrappers, prose around JSON — is normalised, because
rejecting it throws away a correct answer and shows a failure that isn't one.
`level()`, `coerceEntry()`, `pickEntry()` and `readModelJSON()` in
`api/research.js` are the pattern. When a response really is unusable, the
endpoint quotes its first 160 characters, so the next fix isn't guesswork —
three rounds went by on this feature with "couldn't be read" and no sample.

**Endpoint behaviour can't be verified from a session without an API key, so
don't add API features on spec.** The model output itself needs Grady to run
it, but the *request* is checkable here: keep it in a pure builder and assert
its shape. An unverifiable guess (the prefill above) cost a full deploy cycle.

**The app owns the envelope, the model owns the message.** Anything fixed,
structural, or user-configurable around generated text — a greeting, a sign-off,
a signature, a footer — is composed at render time, not asked of the model.
Baking it into the stored text means the user can't edit it afterwards, it eats
the word budget, and it will eventually be duplicated by the composing layer.
Where the model might write one anyway, strip it server-side; a prompt rule is a
request, not a guarantee.

**One brief builder, additive keys.** `buildLeadBrief()` serves two endpoints by
rendering optional sections only when their keys exist. Extend it by adding a
key to one payload builder, never by branching on which endpoint is calling.

**Server-side fetches of lead URLs go through `inspectSite()`.** It's the only
place that checks the resolved address before every hop. Don't `fetch()` a
URL from lead data anywhere else in `/api`.

**Don't give two buttons the same label on one screen.** Lead Detail's Site
Speed panel says "Re-check"; Research says "Check again". Identical labels are
ambiguous to read and to test.

**Responsive sidebar groups own their dividers.** Today and Leads are hidden
from the mobile sidebar because they're bottom-nav tabs; the `<NavDivider />`
that follows them lives *inside* the same `hidden sm:block` wrapper, or mobile
gets a rule with nothing above it.

**Hover is a desktop bonus, never the only way in.** The Calendar day preview is
`hidden sm:block` and `pointer-events-none` on top of a tappable cell. Anything
reachable only by hover doesn't exist on the phone this app is used from.

**JSX requires `.jsx` extension.** `icons.jsx`, not `icons.js`.

**Git is case-insensitive on macOS.** A file renamed only by case won't push.
Rename via an intermediate filename, or use a distinct name (this is why the
map page is `MapPage.jsx`, not `Map.jsx`).

**`grid-cols-7` doesn't generate** in this Tailwind setup — Calendar uses
inline `style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}`.

**Safari `<select>` styling** is normalized globally in `index.css` with
`appearance: none` plus a background-image chevron. Don't re-patch per component.

**iOS date inputs overflow** their container. Needs an `overflow-hidden`
wrapper plus inline `style={{ width: "100%", minWidth: 0 }}`.

**Leaflet z-index** is capped in `index.css` so the sidebar overlay
(`z-40`/`z-50`) renders above the map.

**Env vars require a redeploy.** Setting them in Vercel doesn't apply
retroactively. Also watch for trailing whitespace in pasted keys.

**Function durations assume fluid compute.** `/api/research` declares
`maxDuration: 180`. That's inside Hobby's limit with fluid compute on (the
default for current projects); without it, Hobby caps functions far lower and
the deploy or the request will fail.

**Mobile bottom nav needs clearance.** The FAB sits at `bottom-36`, pagination
gets `pb-20`, and the nav has a safe-area spacer for the iPhone home bar.

**Name the model once.** `api/_model.js` exports `MODEL`; all four Anthropic
endpoints import it. A swap that lands in some but not all leaves the app
running two models with different tokenizers and different `max_tokens` needs,
and shows up weeks later as an occasional truncated response. The API test
suite asserts that no endpoint hardcodes a model id.

**A newer model is not a smaller prompt.** Claude 4.7 and later use a tokenizer
that produces ~30% more tokens for the same text, so a price cut per token is
not the same as a cost cut per pitch — and any `max_tokens` ceiling tuned tight
against an older model gets ~30% closer to binding. Check every ceiling when
swapping. A ceiling is not a charge; headroom is free.

**Anything new that persists needs five edits, not one.** A top-level store key
has to appear in the initializer, `partialize`, `merge`, `restoreBackup` and
`resetAllData` — plus `exportBackup()` in `Settings.jsx`, which builds the JSON
by hand. Miss `partialize` and it works until you refresh; miss `merge` and it
works until someone with an older install upgrades. (An optional key *on a
lead* — `generatedPitch`, `research` — needs none of this; it rides along with
`leads`.)

---

## 9. Navigation Model

Routes: `/`, `/today`, `/run`, `/lead/:id`, `/call/:id`, `/pitch/:id`,
`/calendar`, `/map`, `/progress`, `/ai`, `/reference`, `/search`, `/settings`,
`/import`, `/prospects`

`/prospects` is a sidebar page, not a bottom-nav tab: a sweep is a desk job done
occasionally, while Today and Leads are daily. It joins whichever tab stack is
active, and lead links from it pass `state: { from: "/prospects" }`.

**Redirects:** `/plan` and `/checklist` both `<Navigate replace>` to `/today`.
Kept indefinitely — muscle memory, bookmarks, and the installed PWA's start URL
all point at the old paths.

**Origin tracking:** back buttons never use `navigate(-1)`. Search, Calendar,
Map, Today and the Pipeline Advisor pass `state: { from: "/..." }` when opening
a lead. LeadDetail reads it into `backTo` (default `/`). Call Prep and Pitch
Mode forward that state back so the chain survives nesting — **except inside a
run**, where their back button goes to `/run` instead, because the run is what
you came from.

**Settings deep links:** `?action=new-group`, `?action=new-column`,
`?action=pitch-mode` scroll to `#groups-section`, `#columns-section`,
`#pitch-section` and then clear the param. The Outreach section keeps the id
`pitch-section` even though it's no longer only about Pitch Mode — Lead Detail
and Pitch Mode both link to it.

### Per-tab navigation (`useTabStacks.js`)

Each bottom-nav tab remembers where you were inside it.

- **Ownership.** A tab root (`/today`, `/`, `/search`) claims the active tab.
  Every other path belongs to whichever tab was already active — so a sidebar
  page like Calendar, opened from the Today tab, is part of Today's stack and
  tapping Today later brings you back to it.
- **Recording.** One effect on `location` captures every navigation in the app.
  No call site knows this exists.
- **Excluded.** `/run`, `/pitch/:id` and `/call/:id` are never recorded. Tapping
  Today from Pitch Mode gives you Today; the Now Bar is the way back into a run.
- **Second tap** on the active tab pops to its root and clears its memory.
- **The lit tab follows the stack, not the URL.** Standing on a lead inside the
  Today stack lights Today. Without that there's no signal that tapping the tab
  again does anything, and pop-to-root stays invisible. The cost: a sidebar page
  also lights its owning tab.
- **One location per tab, not a stack.** React Router has a single history, and
  on an installed iOS PWA the swipe-back gesture drives it directly. A synthetic
  stack desynchronises from the gesture and then "back" behaves differently
  depending on how you arrived — a worse bug than the one being fixed. Browser
  back is unchanged.
- **In-memory, never persisted.** Cold-starting tomorrow lands on a tab root,
  not yesterday's lead. A remembered lead that has since been deleted falls back
  to the root rather than restoring a "Lead not found" screen.

**Keyboard shortcuts** (desktop, disabled while typing/modal open):
`N` new lead · `S` lead spree · `/` search · `T` today (`C` kept as an alias
for the old Checklist reflex) · `M` map · `R` reference · `P` progress

**Chrome:**
- **Desktop** — sidebar (hamburger) is primary nav, grouped as: Current Run
  (only while running) → Today, Leads → Calendar, Map, Pipeline Advisor →
  Progress, Reference → Settings. Search is a **header control**, not a sidebar
  item.
- **Mobile** — bottom nav is **Today / Leads / Search**, each with its own
  remembered location. Those three are hidden from the mobile sidebar; Settings
  appears there instead, having given up its tab. The keyboard-shortcut hint
  block is desktop-only.
- The **Now Bar** sits under the header on every page except the run's own
  screens.

---

## 10. Known Architectural Debt

Read this before adding features — these are the real problems.

### 10.1 ~~The app is page-oriented, not journey-oriented~~ — addressed
Solved by the Run layer (§5, §6) and the Today merge (§3). Residual, worth
watching:
- `dailyPlan` and `activeRun.queue` are two lists that can drift. Sync is
  deliberately one-directional.
- The map's `route` is still local component state until you press **Start route
  run**. It's re-seeded from an active `origin: "map"` run, but an unstarted
  route still evaporates on navigation.
- One run at a time. Starting a second replaces the first with no prompt at the
  store level — the UI is what guards this.

### 10.2 ~~Not every source has the verb~~ — addressed
Every surface in §3 now renders `QueueButton`. Residual:
- Advisor resolution is name-based and best-effort. Renaming a lead between
  running an analysis and acting on it silently drops the button.
- The Calendar hover preview is desktop-only by design.

### 10.3 ~~Bottom nav has no per-tab navigation~~ — addressed
`useTabStacks.js`, documented in §9. Residual:
- One remembered location per tab, not a walkable stack.
- The lit tab follows the stack, so a sidebar page lights its owning tab.
- Memory is per-mount; a full reload starts every tab at its root.

### 10.4 ~~Reference is doing two jobs~~ — addressed
Generated per-lead pitches and emails live on the lead (`generatedPitch`,
`generatedEmail`), never in Reference. Reference is back to one job: stable
hand-written material. Residual:
- Pitch Mode now renders two script sections stacked. On a small phone that's a
  lot of vertical scroll; worth looking at in the polish pass.
- A generated pitch is a single overwrite-on-regenerate slot. No history, no
  A/B, no per-outreach-type variants. Deliberate for now.
- Bulk prep skips leads that already have a pitch, **including stale ones**. A
  run full of stale pitches has to be rewritten lead by lead. If that turns out
  to be common, "rewrite the stale ones" is the obvious follow-up. Running site
  research on leads that already have pitches will make this more common.

### 10.5 Generated emails are Lead Detail only
The email generator is reachable from one place. Cold Email leads inside a mixed
run still route to Call Prep via `stopPathFor()` — a run of email leads is a run
of phone screens. Fixing it properly means a third HUD or an email-aware stop
path; neither is worth building until email outreach is a bigger share of the
week.

Also unresolved:
- Social proof counts every `Closed` lead ever. There's no recency window, so a
  deal from a year ago carries the same weight as last month's.
- `cityFromAddress()` reads the second-to-last comma segment. Addresses entered
  without a city segment contribute to the count but not to the areas.

### 10.6 Pagination resets on any change
Sorting, filtering, or lead-count changes reset to page 1. Correct in most
cases, occasionally annoying.

### 10.7 No cross-device sync
localStorage only. Backup/restore is manual via JSON export. `activeRun` is
persisted but device-local, so a run started on the phone is invisible on the
laptop. Generated pitches, emails and site research ride along with `leads`, so
they *are* included in a backup export — as are `senderName` and
`emailSignature`.

### 10.8 Action-as-selector holdouts
§8 says actions must come off `getState()`. Today, LeadDetail, CallPrep,
PitchMode, MapPage, Search, RunOverview, Calendar, AI, QueueButton and Settings
have been converted.

**`App.jsx` and `Settings.jsx` have not.** App still reads
`const { addLead, updateLead } = useCRMStore();` — a whole-store selector, so
the app shell also re-renders on every store change, and the two actions are
exposed to the hydration problem. Settings selects `addCustomColumn` and
`deleteCustomColumn` the same way. An earlier version of this doc listed both as
converted; the source says otherwise, in both cases found by opening the file
rather than trusting the list. Reference, Progress, Import, LeadTable and
LeadModal have not been audited — worth a sweep when one is next opened.

### 10.9 Bundle size
The production bundle is a single ~1,096 kB chunk (≈302 kB gzipped), measured
in October 2026 on the current dependencies; it was ~545 kB (≈155 kB gzipped)
when this section was first written. Vite warns on every build. Fine over a
home connection, less fine on a parking-lot 4G cold load. Leaflet and Recharts
were the bulk at the earlier measurement and are each used by exactly one
route — route-level `React.lazy` would cut the initial payload substantially.
Re-measure what's in the chunk before splitting; the doubling hasn't been
attributed. Not urgent; a good polish-pass item.

### 10.10 The API has no auth
Every `/api` route is public. Anyone who finds the URLs can spend Anthropic and
PageSpeed quota, and `/api/research` makes the server fetch a URL it's given.
The fetch is fenced (public addresses only, default ports, every redirect hop
checked, 1.5 MB and time caps), but a shared-secret header across all endpoints
is the real fix. Cross-cutting, so it wants its own decision.

### 10.11 What site research can't see
- **No rendered view.** The check reads HTML; it doesn't run JavaScript or look
  at the page. Mobile evidence is the viewport tag plus PageSpeed. Sites built
  client-side come back `limited`. PSI's final mobile screenshot is the obvious
  next source (see §11).
- **Bot-protected sites** give only what PageSpeed can see: speed, the viewport
  audit, and the platform from Lighthouse's request list. No menu, links, phone
  or copyright evidence. Expect this often — it's normal for restaurant
  platforms, and it is not a signal about the restaurant.
- **The PSI fallback is written from the API docs, not from a verified
  response.** `audits.viewport` and `audits["network-requests"]` are read
  defensively; if Google's shape differs, those signals stay null and nothing is
  claimed. Worth confirming against one real run.
- **DNS answers aren't pinned.** The private-address check and the fetch do
  separate lookups. Acceptable for a single-user tool whose URLs come from its
  own lead list.
- **No bulk trigger in the UI yet.** `researchMany()` exists for Prospects;
  nothing on Today or Run Overview calls it.

### 10.12 Prospecting residuals
- **`opportunity` is decoration.** It shows on a card and orders nothing. If a
  later signal proves it discriminates, `sortProspects()` is where it would go.
- **Chain detection is a list plus repeats.** A single-location regional chain
  in a first sweep gets through; the count is visible and the filter is
  reversible, so the cost is a row he skips.
- **Tier 5 is a bucket of unknowns.** A sweep is mostly unchecked sites, and
  checking them is the slow part. There's no "check everything overnight" —
  deliberately, since it would be an hour of PageSpeed for a few findings.
- **Accepted leads keep Places-sourced details**, which is the Google terms
  residual accepted in the plan doc.
- **Duplicate detection is one-directional.** A candidate matched to a lead is
  flagged and hidden; a lead added by hand later, that matches a live prospect,
  isn't re-checked until the next sweep.

### 10.13 `buildQueries()` truncates by area, silently
`buildQueries()` in `src/prospects.js` builds the full areas × keywords product
with areas as the outer loop, then `.slice(0, max)` with `max = 8`. Three areas
and four keywords is twelve combinations; the slice keeps the first eight, which
is areas[0] and areas[1] in full and **nothing at all from areas[2]**.

The sweep panel in `src/pages/Prospects.jsx` shows `queries.length`, which is
the post-slice count — "8 searches" reads identically whether eight were
requested or twelve were. So a third city can be dropped from a sweep with no
indication in the UI.

Harmless at the current default (three areas, one keyword, three queries). It
bites on the third keyword. The fix is to interleave the combinations
round-robin so truncation costs every area equally, and to surface the dropped
count when the product exceeds `max`. Contained to those two files.

### 10.14 Territory geography is hardcoded in two places
`DEFAULT_AREAS` in `src/pages/Prospects.jsx` and `defaultCenter =
[34.2694, -118.7815]` in `src/pages/MapPage.jsx`. Neither blocks working a new
city — the sweep panel's free-text area box accepts any string and Places Text
Search is global, and `FitBounds` re-centers the map on plotted leads
immediately — but both would need to become settings before the territory is
genuinely portable. The three API system prompts also name Simi Valley; that
describes the operator rather than the target, so it stays correct while
prospecting elsewhere.

---

## 11. Planned Work

**The Phase 2 roadmap is complete**, plus the follow-on features: generated
pitch scripts, the email generator, and site research ("Research this lead").

### Lead research & prospecting

Plan: `claude/lead-research-plan.md`. Slice 1 (site research on Lead Detail) is
built. Before Slice 2, the plan calls for a **calibration pass**: run research
on leads that engaged (Warm / Waiting / Closed, skipping sites Grady built) and
on Dead ones, and compare. The result decides how Prospects ranks.

**Slice 2 — Prospects** is built: `api/discover.js`, `src/prospects.js`, the
`prospecting` store key and `/prospects`. Ranking is by tier, not by the model's
rating — see §6 for why.

Later, each on its own go-ahead: Claude reading PSI's mobile screenshot, an
owner-name/email finder, bulk research from Today/Run prep rows, a `source`
breakdown in Progress.

### Polish pass

Phase 2 changed structure fast and left rough edges behind. Worth treating as
its own slice, with real device time rather than folding into feature work:

- Density and spacing on Today, which now carries two sections plus a prep row.
- The Now Bar's height on a small phone.
- Pitch Mode's two stacked script sections (10.4).
- Call Prep is getting long: lead header, speed banner, last note, pitch, timer,
  log, status, finish. It all scrolls now, but the ordering deserves a look on a
  real handset mid-call.
- Lead Detail now stacks Site Speed, Research, Pitch and Email; same question.
  Site Speed and Research could reasonably merge.
- Empty states across pages whose meaning changed.
- The residuals in §10.1–10.5, and bundle splitting (§10.9).
- A pass over copy for consistency — the app has accumulated three or four
  different voices for the same kinds of message.
