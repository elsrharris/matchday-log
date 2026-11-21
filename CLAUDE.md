# Matchday Log

A website (desktop and phone) for logging every Leeds United match one fan (the repo owner's dad) has attended, going back to 1980. Personal use only. Live at https://elsrharris.github.io/matchday-log/ (GitHub Pages, deployed from `main`, root folder).

## Ground rules

- **No build step, no dependencies.** Native ES modules (`js/`) and plain CSS (`css/`) served as-is by GitHub Pages. No npm, no bundler, no frameworks, no animation library. Libraries only via CDN `import()` (Firebase).
- **The end user is an older fan who mostly uses a desktop computer, and sometimes an iPhone.** Design desktop first, and it must also work well on a phone. Keep the UI plain-English, readable text, big click/tap targets, forgiving. Test at both sizes (Playwright desktop viewport ~1440×900, and `devices['iPhone 13']`).
- A full visual redesign is planned by the repo owner (an experienced web developer) in Figma. Build from their frames when they share them, rather than inventing a new look.
- **Colours:** Leeds blue `#1D428A`, yellow `#FFCD00`, white. **No club crest** (the header uses a yellow "LUFC" roundel instead).
- **Never lose his data.** Anything touching storage or sync needs a test that proves nothing is dropped or resurrected.
- Pushing to `main` deploys straight to the live site. Use a branch for unfinished work.

## How the app works

Liquid-glass redesign (dark by default; Light/System in Settings). Files:

| File | Role |
|---|---|
| `index.html` | Shell + inline script that applies the saved theme (`mdl-theme`) before first paint |
| `css/tokens.css` | Design tokens: colours (dark + `[data-theme="light"]`), glass, chart series, type, spacing, motion (gentle `--spring`) |
| `css/app.css` | Base, glass materials (`.mat-panel`, `.mat-raised`, `.mat-bar`, `.mat-read`; specular rim via masked `::before`; solid fallbacks), phone tab bar + desktop sidebar (≥900px), page transitions, progressive blur under the dock, shared form/controls |
| `css/screens.css` | Per-screen styles: crests, stadium stage photo, Home, Matches, Match Centre, Stats charts, Squad/player, form sections, Settings, toast/tooltip |
| `js/core.js` | Storage, `db` (shared object – mutate, don't reassign), tombstones, `save()`, helpers, `DEMO`/`PREVIEW`/`BASE` |
| `js/sync.js` | Firebase sync (logic unchanged from the single-file version) |
| `js/importers.js` | ESPN + archive importers, `nextFixture()` |
| `js/calc.js` | Stats from logged matches only: `record`, `overall`, `players`, `bySeason`, `venueSplit` |
| `js/crests.js` | Crest lookup (`data/crests.json`), ESPN logo CDN (resized), dark variants with fallback → standard → monogram |
| `js/router.js` | Hash routes, sliding nav highlight, transitions, scroll restoration |
| `js/ui.js` | SVG icons, delegated actions (`data-act` / `data-change` – no inline handlers or globals), tooltip, reveal-on-scroll, toast, and `sheet()` / `notice()` – an accessible `<dialog>` (bottom sheet on phone, centred on desktop). **Never use `alert` / `confirm` / `prompt`.** Destructive sheets focus the safe button; Esc / backdrop cancels |
| `js/theme.js` | Appearance preference |
| `js/views/*.js` | home, matches, match (Match Centre), form (Add/Edit + finder), stats, squad (+ player profile), settings |
| `js/app.js` | Builds the shell, registers views, loads crests, starts demo or sync. `window.MDL` is a debug/test handle |

- **Routing:** `#/` Home, `#/matches`, `#/match/:id`, `#/new`, `#/edit/:id`, `#/stats`, `#/squad`, `#/player/:name`, `#/settings` (`#/data` still works). Direction-aware page transitions use the View Transitions API on desktop with the nav excluded from the snapshot so its highlight glides live; touch devices use a CSS animation instead (VT snapshots flatten glass on iOS). Back/forward restores scroll; on touch it doesn't animate (the browser already did). `rerender()` never redraws an open form.
- **Saving:** `submitMatch` is `actions.saveMatch` in `views/form.js`; `readForm(f, m)` builds the match (fields in `SCALARS`, rows in `ROWDEF`). The form is in collapsible sections with live summaries, venue and rating are radio groups, validation is inline, and a toast confirms. On a blank Add form Save appears only once a match is being added.
- **Charts** follow the dataviz skill: one axis, thin bars, values in a fixed column, legend for two series, tooltips, table view. Series colours are validated tokens (`--series-1/2`).
- **Match object:** scalar strings (`date`, `ko`, `comp`, `round`, `opp`, `venue` H/A/N, `ground`, `att`, `ref`, `manager`, `ls`/`os` Leeds/opp score, `htl`/`hto` half-time, `ftl`/`fto` 90-min score when `et`, `pl`/`po` penalties when `pens`, `formation`, `oppXI`, review fields `rating`, `motm`, `review`, `with`, `seat`, `notes`), source ids `espnId`/`espnLg`/`histId`, row arrays, plus `id`, `created`, `updated` (ISO). Goal/card/sub rows have `t: 'L' | 'O'` for team; an own goal is recorded under the team it counted for, with the player who put it in.
- **Storage:** `localStorage` key `lufc-matchday-log-v1`, shape `{ matches, meta, tomb }`, with an in-memory fallback when storage is blocked. Settings has backup download, restore (merge or replace) and CSV export.
- **App icons:** `assets/icons/` (apple-touch-icon 180, 192/512, maskable 512, favicons) built by `tools/icons/build.py` from ESPN's 500px Leeds crest on a navy glow; linked in `index.html` and `manifest.webmanifest`. iOS caches the icon when the app is added to the home screen, so a new icon needs a remove + re-add.
- **Images:** `assets/img/stadium-{900,1600}.webp` – public-domain Elland Road photo (Wikimedia Commons, MightyEagleGER), graded navy; credited in Settings › About. Crests hotlinked from ESPN (`a.espncdn.com/combiner`).

### Cloud sync (Firebase)

- Firebase project `matchday-log`, web config in `FB_CFG` (public by design). SDK `firebase@12.19.0` loaded from `www.gstatic.com` via `import()` in `cloudInit()`. If it fails to load, the app carries on local-only.
- Sign-in: Google (`signInWithPopup`, called synchronously from the tap so pop-ups aren't blocked) or email/password. Both providers are enabled in the console; `elsrharris.github.io` is an authorized domain.
- Firestore: one doc per match at `users/{uid}/matches/{id}`. Security rules allow a user to read/write only `users/{their uid}/**`. Database location europe-west2.
- **Sync model:** localStorage stays the working copy (works offline at grounds). `save()` → `trackDeletes()` records removed ids in `db.tomb` → `cloudReconcile()`. Deletions are written as tombstone docs `{id, deleted:true, updated}` so an out-of-date device can't resurrect them. Per id, the later `updated` wins in either direction. Reconcile waits for the first non-cache snapshot before comparing. Importing a backup with "replace" stamps every match with a fresh `updated` so the backup wins.
- Header pill `#syncpill` shows Sign in / Syncing / Synced / Offline / problem.

### Match finder (Add / Edit form)

`finderHTML()` / `finderInit()`: pick a season (`All seasons` or 1979/80 → current), filter by opponent or date, tap a game to fill the form. It never touches the review fields; when editing it asks before replacing. Already-logged games show "✓ logged" and tapping one offers to open it.

- **2001/02 onwards — ESPN's unofficial public JSON API**, called straight from the browser (it sends `access-control-allow-origin: *`, no key, no proxy). Leeds team id `357`.
  - Fixtures: `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/357/schedule?season=YYYY` (YYYY = season start year; covers all competitions; data starts 2001).
  - Match detail: `.../soccer/{league.slug}/summary?event={id}` → `keyEvents` (goals, subs as [on, off], cards), `rosters` (starters/bench/formation), `gameInfo` (venue, attendance, officials), `shootout`, header linescores (half-time).
  - Mapping lives in `espnToMatch()`, `espnComp()` (slug → competition name, play-off detection, `tidyRound()`), `espnSides()` (ESPN doesn't always flag neutral grounds, so Wembley/Millennium or a "home" game away from Elland Road counts as neutral). Kick-off/date converted to Europe/London.
  - ESPN's CDN (Akamai) returns 403 to headless test browsers. Don't try to disguise the test browser; replay real responses fetched with plain `curl` via Playwright `ctx.route` instead.
- **1979/80–2000/01 — bundled data** in `data/history/{seasonStartYear}.json` (1,081 matches from 1 Jan 1980), built from the Leeds United Historical Archive, https://lufchistory.com (fan-curated; credited with a link on every match filled from it; the owner chose to publish it in this repo). Loaded on demand by `histSeason()`, mapped by `histToMatch()`.
  - Has: score, competition, H/A/N, attendance, manager, Leeds scorers (minutes and assists for many 1990s games), starting XI, captain, and from the late 1980s bench, substitutions and red cards. FA Cup rounds are derived (Leeds always entered at the 3rd round in this period; a repeat opponent is a replay).
  - Doesn't have: opposition scorers, half-time scores, away grounds, kick-off times, referees, shirt numbers, League Cup rounds, shoot-out scores; extra time is often unflagged. 166 matches have some Leeds scorers unknown — those get a note in `notes`.
  - Rebuild: `tools/history/fetch.py` (polite, ~1 request/second, caches pages in `tools/history/raw/`, git-ignored) then `tools/history/parse.py`. Sanity-check season totals against the record books after any change (e.g. 1991-92 First Division: W22 D16 L4, 74–37, 82 pts).

## Preview of unfinished work

`tools/build-preview.sh <checkout> <dir>` builds a **demo-only** copy (forced demo mode, data read from `../data/`). The liquid-glass redesign was reviewed this way at `/next/` on `main` and went live on 21 Nov 2026 (the `/next/` folder was then removed; the `redesign` branch holds its history). Use the same approach for future big changes: work on a branch, publish a demo-only preview to a sub-folder of `main`, merge when approved. The preview shares an origin with the live app, so it must never be able to read or write real data – keep the forced demo flag.

## Demo mode (design work and screenshots)

Add `?demo` before the hash, e.g. `https://elsrharris.github.io/matchday-log/?demo#/match/demo-tottenham-2026`. Loads `data/demo.json` (14 real matches from ESPN and the archive, with fictional reviews) into memory only: nothing is written to localStorage, Firebase isn't loaded, and sign-in buttons do nothing. `?demo=empty` shows empty states, `?demo=signedin` shows sync switched on, and `#/new/<demo id>` shows the Add form already filled in. Regenerate `data/demo.json` with the app's own `espnToMatch()` / `histToMatch()` so it stays in step with the importers.

## Testing

There is no test suite; test with Playwright scripts in the scratchpad (Chromium is pre-installed, `require('playwright')` works).
- Serve the repo with a tiny Node `http` server (correct MIME types: `.js` must be `text/javascript` for modules) so `data/` and `assets/` load.
- Tests reach app state through `window.MDL` (`db`, `cloud`, `save`, `readForm`).
- Firebase: the gstatic CDN may be blocked from the sandbox; route `https://www.gstatic.com/firebasejs/12.19.0/*` to the same files from `npm i firebase@12.19.0` (`node_modules/firebase/firebase-*.js`). Test sync with two browser contexts signed in to a throwaway email/password account against the real project, and always delete the test docs and account afterwards (make cleanup run even if the test fails).
- Google sign-in can't be automated; ask the user to check it on the live site.

## Cloud environment

Sessions for this repo should use the personal cloud environment **`matchday-log`**, which allows: `site.api.espn.com`, `site.web.api.espn.com`, `sports.core.api.espn.com`, `www.gstatic.com`, `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `lufchistory.com`, `www.lufchistory.com`, `a.espncdn.com` (crests), `commons.wikimedia.org`, `upload.wikimedia.org` (photos; rate-limited). `github.io` is not reachable from it, so the live site can't be checked from the sandbox.

## Open items / ideas

- Confirm on a real iPhone that Google sign-in works from the home-screen app (email/password is the fallback). Note iOS keeps home-screen app storage separate from Safari; sync bridges that.
- Confirm on a real phone that ESPN serves the browser (if blocked, add a small relay such as a Cloudflare Worker).
- Possibly ask the archive (lufchistory.com) for substitutes and missing scorers for older seasons.
- Seasons before 1980 are out of scope (he didn't attend before then).
