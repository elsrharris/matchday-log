/* Entry point: builds the shell (phone tab bar, desktop sidebar, top bar), wires routes, starts sync. */
import { db, DEMO, EPHEMERAL, BASE, setDb, save, $ } from './core.js';
import { cloud, cloudInit, cloudStatus } from './sync.js';
import { registerViews, route, placeIndicators } from './router.js';
import { icon } from './ui.js';
import { applyTheme } from './theme.js';
import { loadCrests, crest } from './crests.js';
import { homeView } from './views/home.js';
import { matchesView } from './views/matches.js';
import { matchView } from './views/match.js';
import { newView, editView, readForm } from './views/form.js';
import { statsView } from './views/stats.js';
import { squadView } from './views/squad.js';
import { settingsView } from './views/settings.js';

applyTheme();
/* handle for debugging and the regression tests */
window.MDL = { db, cloud, save, readForm };

const TABS = [['home', '#/', 'Home', 'home'], ['matches', '#/matches', 'Matches', 'matches'], ['new', '#/new', 'Add match', 'plus'], ['stats', '#/stats', 'Stats', 'stats'], ['squad', '#/squad', 'Squad', 'squad']];
const leedsCrest = () => crest('Leeds United', 42, 'brand-crest');
const pill = `<a class="syncpill mat-panel" data-syncpill href="#/settings" hidden><i></i><span></span></a>`;

document.body.insertAdjacentHTML('afterbegin', `
  <div class="atmos" aria-hidden="true"></div>
  <a class="sr-only" href="#app">Skip to content</a>
  <header class="topbar">
    <a class="brand" href="#/">${leedsCrest()}<span><b>Matchday Log</b><small>Leeds United</small></span></a>
    <span class="spacer"></span>${pill}
    <a class="iconbtn mat-panel" href="#/settings" data-sec="settings" aria-label="Settings">${icon('settings')}</a>
  </header>
  <aside class="sidebar mat-bar" aria-label="Main">
    <a class="brand" href="#/">${leedsCrest()}<span><b>Matchday Log</b><small>Leeds United</small></span></a>
    <a class="side-add" href="#/new" data-sec="new">${icon('plus')} Add match</a>
    <nav class="side-nav" data-nav="side"><span class="nav-ind" aria-hidden="true"></span>
      ${TABS.filter(t => t[0] !== 'new').map(([k, h, l, i]) => `<a href="${h}" data-sec="${k}">${icon(i)}<span>${l}</span></a>`).join('')}
      <a href="#/settings" data-sec="settings">${icon('settings')}<span>Settings</span></a>
    </nav>
    <div class="side-foot">${pill}</div>
  </aside>`);
document.body.insertAdjacentHTML('beforeend', `
  <div class="edge-blur" aria-hidden="true"><i></i><i></i><i></i></div>
  <nav class="tabbar mat-bar" aria-label="Main"><div class="rail" data-nav="tab"><span class="nav-ind" aria-hidden="true"></span>
    ${TABS.map(([k, h, l, i]) => k === 'new'
      ? `<a href="${h}" class="add" data-sec="${k}" aria-label="${l}"><span class="addbtn">${icon(i)}</span><span class="lbl">${l}</span></a>`
      : `<a href="${h}" data-sec="${k}">${icon(i)}<span>${l}</span></a>`).join('')}
  </div></nav>`);

registerViews({ home: homeView, matches: matchesView, match: matchView, new: newView, edit: editView, stats: statsView, squad: squadView, settings: settingsView });

async function startDemo(){
  $('#app').innerHTML = '<p class="muted" style="text-align:center;padding:40px">Loading demo…</p>';
  let ms = [];
  if(DEMO !== 'empty'){ try { ms = await (await fetch(BASE + 'data/demo.json')).json(); } catch(e){} }
  setDb({ matches: ms, meta: { lastBackup: new Date().toISOString(), lastSync: new Date().toISOString() }, tomb: {} });
  if(DEMO === 'signedin') Object.assign(cloud, { fb: {}, user: { uid: 'demo', email: 'dad@example.com' }, live: true, pending: false });
  else Object.assign(cloud, { fb: {}, user: null });
  cloudStatus(); route();
}

/* crests are a small local lookup; load it before the first render so crests appear straight away */
await loadCrests();
if(DEMO !== null) startDemo();
else { route(); cloudInit(); }
if(EPHEMERAL && DEMO === null) $('#app').insertAdjacentHTML('afterbegin', `<div class="banner">This browser window isn't letting the page save, so anything you enter will vanish when you close it.</div>`);
document.fonts?.ready?.then(placeIndicators);
