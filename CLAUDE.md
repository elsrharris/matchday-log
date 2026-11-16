# Matchday Log

A mobile-first website for logging every Leeds United match one fan (the repo owner's dad) has attended, going back to 1980. Personal use only. Live at https://elsrharris.github.io/matchday-log/ (GitHub Pages, deployed from `main`, root folder).

## Ground rules

- **One file, no build step.** Everything is in `index.html` (vanilla JS, inline CSS). No npm, no bundler, no frameworks. Libraries only via CDN `import()`.
- **The user is not technical-facing; the end user is an older fan on an iPhone.** Keep the UI plain-English, big tap targets, forgiving. Test at phone width (Playwright `devices['iPhone 13']`).
- **Colours:** Leeds blue `#1D428A`, yellow `#FFCD00`, white. **No club crest** (the header uses a yellow "LUFC" roundel instead).
- **Never lose his data.** Anything touching storage or sync needs a test that proves nothing is dropped or resurrected.
- Pushing to `main` deploys straight to the live site. Use a branch for unfinished work.

## How the app works (`index.html`)

- **Routing:** hash routes (`#/`, `#/match/:id`, `#/new`, `#/edit/:id`, `#/stats`, `#/data`) handled by `go()` / `route()`, using pushState plus click interception so it also works in sandboxed previews. `route(true)` re-renders without scrolling; `rerender()` skips the form views so a sync never wipes a half-filled form.
- **Saving:** the Save button calls `submitMatch()` in JS (not a form submit). `readForm(f, m)` turns the form into a match object. Plain fields are listed in `SCALARS`; repeating rows (goals, subs, cards, lineup, bench) are defined in `ROWDEF`.
- **Match object:** scalar strings (`date`, `ko`, `comp`, `round`, `opp`, `venue` H/A/N, `ground`, `att`, `ref`, `manager`, `ls`/`os` Leeds/opp score, `htl`/`hto` half-time, `ftl`/`fto` 90-min score when `et`, `pl`/`po` penalties when `pens`, `formation`, `oppXI`, review fields `rating`, `motm`, `review`, `with`, `seat`, `notes`), source ids `espnId`/`espnLg`/`histId`, row arrays, plus `id`, `created`, `updated` (ISO). Goal/card/sub rows have `t: 'L' | 'O'` for team; an own goal is recorded under the team it counted for, with the player who put it in.
- **Storage:** `localStorage` key `lufc-matchday-log-v1`, shape `{ matches, meta, tomb }`, with an in-memory fallback when storage is blocked (shows a "preview mode" banner). Backup tab (`#/data`, labelled "Sync") also has JSON export/import (merge or replace) and CSV export.

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

## Testing

There is no test suite; test with Playwright scripts in the scratchpad (Chromium is pre-installed, `require('playwright')` works).
- Serve the repo with a tiny Node `http` server so `data/history/*.json` loads.
- Firebase: the gstatic CDN may be blocked from the sandbox; route `https://www.gstatic.com/firebasejs/12.19.0/*` to the same files from `npm i firebase@12.19.0` (`node_modules/firebase/firebase-*.js`). Test sync with two browser contexts signed in to a throwaway email/password account against the real project, and always delete the test docs and account afterwards (make cleanup run even if the test fails).
- Google sign-in can't be automated; ask the user to check it on the live site.

## Cloud environment

Sessions for this repo should use the personal cloud environment **`matchday-log`**, which allows: `site.api.espn.com`, `site.web.api.espn.com`, `sports.core.api.espn.com`, `www.gstatic.com`, `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `lufchistory.com`, `www.lufchistory.com`. `github.io` is not reachable from it, so the live site can't be checked from the sandbox.

## Open items / ideas

- Confirm on a real iPhone that Google sign-in works from the home-screen app (email/password is the fallback). Note iOS keeps home-screen app storage separate from Safari; sync bridges that.
- Confirm on a real phone that ESPN serves the browser (if blocked, add a small relay such as a Cloudflare Worker).
- Possibly ask the archive (lufchistory.com) for substitutes and missing scorers for older seasons.
- Seasons before 1980 are out of scope (he didn't attend before then).
