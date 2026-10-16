# Trace — Dev & Verification Setup

How to build and verify a change before handing it to Grady. Rewritten in
October 2026, when work moved from project-knowledge copies to the real repo.

**Read `TRACE.md` first.** This doc is only about checking changes. It contains
no architecture.

---

## 1. Where the code is

The repo is on Grady's Mac at `/Users/gradys80s/Developer/crm`. A session
reaches it through a Linux shell on his machine, where the folder is mounted at
`$HOME/mnt/crm`. **Edits happen there, in the real working copy.** There is no
copy of the source anywhere else to work from — project knowledge holds only
docs, and if a source file ever turns up there, ignore it and say so.

Read before you edit: open every file a slice touches from the repo at the
start of the slice, every time. Files change between sessions.

Git rules (who branches, who commits) are in the project instructions. In
short: read-only git plus `git switch -c` for the working branch; Grady runs
everything else.

---

## 2. Why the build doesn't run in the repo

The repo's `node_modules` were installed on macOS. Vite 8 (rolldown) and oxlint
load native binaries, and the Linux shell can't load the macOS ones:
`npm run build` in the repo fails with `MODULE_NOT_FOUND` from
`rolldown/dist/shared/binding-…`, and `npm run lint` the same way from
`oxlint/dist/bindings.js`.

**Never run `npm install` or `npm ci` inside the repo.** It would replace his
`node_modules` with Linux binaries and break `npm run dev` on his Mac.

Instead, verify in a **mirror** outside the repo — `$HOME/trace-build`, which
is invisible to him and dies with the session.

---

## 3. The mirror

First time in a session:

```bash
mkdir -p $HOME/trace-build
rsync -a --delete --exclude node_modules --exclude .git --exclude dist \
  $HOME/mnt/crm/ $HOME/trace-build/
cd $HOME/trace-build && npm ci --no-audit --no-fund
```

`npm ci` installs from his `package-lock.json`, so the mirror builds against
exactly the versions production does. About ten seconds.

**Before every verify, re-sync** — the same `rsync` line. `--delete` matters:
a file deleted in the repo must disappear from the mirror too, or the build
keeps resolving an import that no longer exists. The excludes protect the
mirror's own `node_modules`. Re-run `npm ci` only if `package.json` or the
lockfile changed.

The mirror is read-only as far as the work goes. Never edit a file there and
copy it back; edit in the repo, then re-sync.

---

## 4. The verify loop

In the mirror, after a re-sync:

```bash
npm run build      # syntax, imports, resolution
npm run lint       # oxlint; compare the counts with the baseline below
```

**A good build** ends with `✓ built in …`. The `Some chunks are larger than
500 kB` warning is expected (TRACE.md §10.9) and isn't a failure.

**Lint baseline (October 2026): 0 errors, 53 warnings.** Errors fail the
slice. Warnings: report the count, and any new one in a touched file is the
slice's to explain or fix. Don't clean up pre-existing warnings in passing —
note them instead.

Then, on every touched file, a brace/paren balance check — cheap, and it has
caught real damage from string replacements. Run from the repo root:

```bash
node -e "const fs=require('fs');for(const f of process.argv.slice(1)){
const s=fs.readFileSync(f,'utf8');
const b=(s.match(/{/g)||[]).length-(s.match(/}/g)||[]).length;
const p=(s.match(/\(/g)||[]).length-(s.match(/\)/g)||[]).length;
console.log((b||p?'IMBALANCE ':'ok ')+f,b,p);}" <files>
```

(`src/constants.js` reads +2 on brackets because of two escaped `\[` in
regexes; that's expected.)

A duplicate top-level declaration check:

```bash
for f in <files>; do grep -oE '^(export )?(async )?(function|const|let|class) [A-Za-z_$][A-Za-z0-9_$]*' $f \
  | awk '{print $NF}' | sort | uniq -d; done
```

And in the **repo**:

```bash
git status --short
git diff --stat
```

The only changed files may be the ones the slice listed. New files show as
`??` in `git status` and don't appear in `git diff --stat` until added — check
both.

Report what was actually run and what it printed. A check that wasn't run is
not passing; say so and put it in Your turn.

---

## 5. Behaviour tests (harnesses)

`vite build` catches syntax and import errors, not logic errors, and several
real bugs here were behavioural — see TRACE.md §8. When a slice changes
behaviour, test it against the actual store and components in jsdom.

Harnesses are **throwaway scaffolding**. They live in the mirror, never in the
repo, and they're written fresh for what the slice needs. The knowledge they
encode is preserved as gotchas in TRACE.md §8. The repo has no test suite.

The tools aren't in the repo's dependencies, so install them **in the mirror
only**:

```bash
cd $HOME/trace-build && npm i --no-save esbuild jsdom
```

`--no-save` keeps the mirror's `package.json` matching the repo's. A later
`npm ci` removes them; reinstall if needed.

### Why jsdom and not SSR

`react-dom/server` is unusable with this store. Zustand v5 passes
`getInitialState` as `getServerSnapshot`, so a server render always sees the
*initial* state and never any imperative mutation you set up in the test. Use
`jsdom` + `react-dom/client` + `act()` (exported from `react`).

### Build command

Harnesses are `.jsx`, bundled to `.mjs` and run with plain `node`. **Bundle
everything except jsdom**, and make a DOM setup module the first import:

```bash
npx esbuild _domN.jsx --bundle --platform=node --format=esm \
  --outfile=_domN.mjs --jsx=automatic --log-level=error \
  --external:jsdom --define:process.env.NODE_ENV='"development"'
```

Why: bundler externals are hoisted above everything else, so an external React
or store evaluates before any setup code runs. With only jsdom external, the
bundled setup module (first import) creates `window`, `document` and
`localStorage` before React and the store evaluate — and the store's `persist`
middleware finds a real `localStorage`, so persistence can be asserted directly.
`_setup_dom.js`:

```js
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",
  { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
```

End every harness with `process.exit()` — jsdom keeps the event loop alive and
the run otherwise hangs until the shell times out.

If a harness imports anything that pulls in Leaflet or Recharts, alias them to a
stub (`--alias:leaflet=./_leaflet_stub.js` etc.); Leaflet touches `window` at
import time. Check the stub against the react-leaflet version in
`package.json` — it was written for an older major.

```js
const noop = () => null;
export const MapContainer = noop, TileLayer = noop, Marker = noop, Popup = noop,
  Polyline = noop, useMap = () => ({ setView: () => {}, fitBounds: () => {} });
export default { divIcon: (o) => o };
```

The `/api` files are plain ESM with explicit `.js` extensions, so API tests
import them directly with `node` — no bundling.

`src/leadContext.js` imports `"./constants"` **extensionless**. Vite resolves
that; node does not. To test it outside a bundle, bundle it first:

```bash
npx esbuild src/leadContext.js --bundle --platform=node --format=esm \
  --outfile=_ctx.mjs --log-level=error
```

### Harness gotchas

- **React synthetic `change` won't fire under jsdom** for controlled inputs.
  Test the component that owns the handler directly rather than fighting it.
- **Test state bleeds.** The store is a module singleton, so assertions later in
  a file run against whatever earlier ones did. Two separate failures here were
  harness bugs, not app bugs — check that before "fixing" the app.
- **Re-rendering `MemoryRouter` with new `initialEntries` doesn't navigate.**
  They're read on mount only. Give it `key={id}` to remount per lead, or the
  second render silently shows the first lead.
- **Find buttons by label carefully.** If two buttons share a label, a
  `find()` by text clicks the first one. That's how a research response got fed
  to the PageSpeed handler during the research slice — which is also why the
  labels now differ.
- **A fake localStorage outside jsdom doesn't satisfy zustand's storage check**,
  so nothing persists there and you'll see
  `Unable to update item 'crm_leads'` warnings. Assert persistence in a jsdom
  harness instead.
- **The site inspector refuses private addresses**, including a local test
  server. `inspectSite(url, { allowPrivate: true })` exists for the test suite
  only. Assert the refusal too: the same URL without the option must come back
  unreachable. DNS failures can be tested offline with a `.invalid` host.
- **Never call a time helper twice for the fixture and the expectation.** A
  check built a prospect with `firstSeenAt: iso(40)` and then asserted against
  a second `iso(40)`. Two `Date.now()` calls, occasionally a millisecond apart,
  so it failed about one run in four. Hoist the value into a const and use it
  in both places. An intermittent red in a throwaway harness reads exactly like
  a real regression in the change you just made.
- **Run a harness more than once before believing it.** A single green run can
  hide a one-in-four flake, and a single red one can be that flake rather than
  the edit. `for i in $(seq 1 10); do node _domN.mjs | tail -1; done | sort |
  uniq -c` settles it in a few seconds.

---

## 6. Serverless endpoints

`/api/*` doesn't run under `vite build`, and there's no `ANTHROPIC_API_KEY`,
`PAGESPEED_API_KEY` or `GOOGLE_PLACES_API_KEY` in the session. That's why the
endpoints export their pure parts (`buildLeadBrief`, `normalizePitch`,
`normalizeEmail`, `stripEnvelope`, `buildBatchBrief`, `analyzeHtml`,
`verifiedFacts`, `normalizeResearch`, `buildResearchBrief`, `normalizePlace`,
…) — the prompt input and the response shaping are the parts worth testing,
and they're testable without a key. The site inspector's network half is
testable too, against a local server (§5).

**Model output quality is not verifiable from here.** After any prompt or model
change, the real check is Grady generating one on the preview deployment and
reading it. That goes in Your turn.

---

## 7. What only Grady can check

Put these in Your turn as manual tests with a clear pass/fail:

- Anything served by `/api` — on the branch's Vercel preview deployment.
- PWA behaviour, the Now Bar and the HUDs on a small phone, iOS date inputs and
  `<select>` styling.
- Persistence across a refresh and a force-quit with his real data.
- `npm run dev` on his Mac, if a change touches config or dependencies.
