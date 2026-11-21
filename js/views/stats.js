/* Statistics: Overview / Home & away / Players, for all time or one season.
   Every stat the old page had is still here; all values come from his logged matches.
   Charts follow the dataviz rules: one axis, thin bars, 2px gaps, values in text ink,
   a legend for two series, a tooltip on every bar and a table view for the season chart. */
import { db, esc, fmtDate, scoreTxt, seasonOf, sorted } from '../core.js';
import { overall, record, bySeason, venueSplit, players } from '../calc.js';
import { app } from '../router.js';
import { actions, icon, revealOnView } from '../ui.js';
import { crest } from '../crests.js';

let scope = 'All time', tab = 'overview', tableView = false;
const TABS = [['overview', 'Overview'], ['venue', 'Home v away'], ['players', 'Players']];
export const playerHref = n => '#/player/' + encodeURIComponent(n);
const pl = (n, u) => n === 1 ? u.replace(/s$/, '') : u;

export function statsView(){
  const all = sorted();
  if(!all.length){ app().innerHTML = `<div class="page-head"><div><h1>Statistics</h1></div></div><div class="card mat-panel empty">${icon('stats')}<p class="muted">Stats appear once you've added some matches.</p></div>`; return; }
  const seasons = [...new Set(all.map(m => seasonOf(m.date)))];
  if(scope !== 'All time' && !seasons.includes(scope)) scope = 'All time';
  const ms = scope === 'All time' ? all : all.filter(m => seasonOf(m.date) === scope);
  const ti = TABS.findIndex(t => t[0] === tab);
  app().innerHTML = `
    <div class="page-head stats-head"><div><h1>Statistics</h1><p>My Leeds record${scope === 'All time' ? '' : ' · ' + esc(scope)}</p></div>
      <select class="pill-select mat-panel" data-change="stScope" aria-label="Season">${['All time', ...seasons].map(s => `<option ${s === scope ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="seg tabs3" role="tablist" aria-label="Statistics sections"><span class="seg-ind" style="width:calc((100% - 16px) / 3);transform:translateX(calc(${ti} * (100% + 4px)))"></span>
      ${TABS.map(([k, l]) => `<button type="button" role="tab" data-act="stTab" data-v="${k}" aria-pressed="${k === tab}" aria-selected="${k === tab}">${l}</button>`).join('')}</div>
    <div id="stbody"></div>`;
  drawTab(ms);
}

function drawTab(ms){
  const body = document.getElementById('stbody');
  body.innerHTML = tab === 'venue' ? venueTab(ms) : tab === 'players' ? playersTab(ms) : overviewTab(ms);
  body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
  requestAnimationFrame(() => { body.querySelectorAll('.ring[data-p]').forEach(el => el.style.setProperty('--p', el.dataset.p)); revealOnView(body); });
}

/* ---------- Overview ---------- */
function overviewTab(ms){
  const o = overall(ms), r = o.r, P = r.W + r.D + r.L, pct = P ? Math.round(r.W / P * 100) : 0;
  const first = [...ms].filter(m => m.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const hl = (k, m, extra = '') => m ? `<a href="#/match/${m.id}"><span class="k">${k}</span>${crest(m.opp, 28)}<span class="t">${esc(scoreTxt(m))}${extra}<small>${esc(fmtDate(m.date))}</small></span>${icon('chevron', 'chev')}</a>` : '';
  const seasonsRows = scope === 'All time' ? bySeason(ms) : null;
  const decades = Object.keys(o.decades).sort(), dmax = Math.max(1, ...Object.values(o.decades));
  return `<div class="st-grid">
    <section class="card mat-panel wide reveal" aria-label="Results">
      <div class="hero-stat">
        <div class="ring" data-p="${pct}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="15.5" pathLength="100"/><circle class="val" cx="18" cy="18" r="15.5" pathLength="100"/></svg><div class="lbl"><b>${pct}%</b><span>Win rate</span></div></div>
        <div class="wdl-wrap"><div class="panel-title">${P} game${P === 1 ? '' : 's'} with a result</div>
          <div class="wdl-bar" role="img" aria-label="Won ${r.W}, drawn ${r.D}, lost ${r.L}">${[['W', r.W, 'win', 'Won'], ['D', r.D, 'draw', 'Drawn'], ['L', r.L, 'loss', 'Lost']].filter(x => x[1]).map(([k, v, c, l]) => `<i style="flex:${v};background:var(--${c})" data-tip="${l}: ${v} (${Math.round(v / P * 100)}%)"></i>`).join('')}</div>
          <div class="wdl-key"><span><span class="key-sw" style="background:var(--win)"></span><b>${r.W}</b>Won</span><span><span class="key-sw" style="background:var(--draw)"></span><b>${r.D}</b>Drawn</span><span><span class="key-sw" style="background:var(--loss)"></span><b>${r.L}</b>Lost</span></div>
        </div>
      </div>
    </section>
    <div class="tiles2 wide">
      <div class="tile2 mat-panel"><b>${ms.length}</b><span>Games</span></div>
      <div class="tile2 mat-panel"><b>${o.seasons.size}</b><span>${pl(o.seasons.size, 'Seasons')}</span></div>
      <div class="tile2 mat-panel"><b>${Object.keys(o.grounds).length}</b><span>${pl(Object.keys(o.grounds).length, 'Grounds')}</span></div>
      <div class="tile2 mat-panel"><b>${o.gf}</b><span>Leeds goals</span></div>
      <div class="tile2 mat-panel"><b>${o.ga}</b><span>Conceded</span></div>
      <div class="tile2 mat-panel"><b>${o.rated ? (o.rsum / o.rated).toFixed(1) : '–'}</b><span>Avg. rating</span></div>
    </div>
    <section class="card mat-panel" aria-label="Highlights"><div class="panel-head"><h3>Highlights</h3></div><div class="hl-list">
      ${hl('Biggest win', o.best?.m)}${hl('Heaviest defeat', o.worst?.m)}${hl('Top-rated game', o.topRated, o.topRated ? ` · ${esc(o.topRated.rating)}/10` : '')}${hl('First game logged', first)}
      ${!o.best && !o.worst && !o.topRated && !first ? '<p class="muted small">Nothing yet.</p>' : ''}</div></section>
    ${seasonsRows && seasonsRows.length > 1 ? goalsChart(seasonsRows, 'Goals by season', 'season') : goalsChart(ms.slice().reverse().map(m => ({ season: `${new Date(m.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} v ${m.opp}`, F: +m.ls || 0, A: +m.os || 0, P: 1, id: m.id })), 'Goals by match', 'match')}
    <section class="card mat-panel reveal" aria-label="Games by decade"><div class="panel-head"><h3>Games by decade</h3></div>
      <div class="hbars">${decades.map(d => `<div class="hb tall"><span class="lb">${d}</span><span class="tr"><span class="row" data-tip="${d}: ${o.decades[d]} ${pl(o.decades[d], 'games')}"><span class="trk"><span class="fill s0" style="width:${o.decades[d] / dmax * 100}%"></span></span><span class="v">${o.decades[d]}</span></span></span></div>`).join('')}</div></section>
    <section class="card mat-panel" aria-label="Competitions"><div class="panel-head"><h3>Competitions</h3></div>${rankList(Object.entries(o.comps), 'games')}</section>
  </div>`;
}

function goalsChart(rows, title, kind){
  const max = Math.max(1, ...rows.map(x => Math.max(x.F, x.A)));
  const chart = `<div class="legend"><span><span class="key-sw" style="background:var(--series-1)"></span>Scored</span><span><span class="key-sw" style="background:var(--series-2)"></span>Conceded</span></div>
    <div class="hbars">${rows.map(x => {
      const tipTxt = kind === 'season' ? `${x.season}: ${x.P} ${pl(x.P, 'games')} · scored ${x.F}, conceded ${x.A}` : `${x.season}: ${x.F}–${x.A}`;
      return `<div class="hb"><span class="lb">${kind === 'match' && x.id ? `<a href="#/match/${x.id}">${esc(x.season)}</a>` : esc(x.season)}</span><span class="tr">
        <span class="row" data-tip="${esc(tipTxt)}"><span class="trk"><span class="fill s1" style="width:${x.F / max * 100}%"></span></span><span class="v">${x.F}</span></span>
        <span class="row" data-tip="${esc(tipTxt)}"><span class="trk"><span class="fill s2" style="width:${x.A / max * 100}%"></span></span><span class="v">${x.A}</span></span></span></div>`; }).join('')}</div>`;
  const table = `<table class="tablev"><thead><tr><th>${kind === 'season' ? 'Season' : 'Match'}</th>${kind === 'season' ? '<th>Games</th>' : ''}<th>Scored</th><th>Conceded</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td>${esc(x.season)}</td>${kind === 'season' ? `<td>${x.P}</td>` : ''}<td>${x.F}</td><td>${x.A}</td></tr>`).join('')}</tbody></table>`;
  return `<section class="card mat-panel reveal" aria-label="${title}"><div class="panel-head"><h3>${title}</h3></div>
    ${tableView ? table : chart}<div class="chart-foot"><button class="btn link" data-act="stTable">${tableView ? 'Show as chart' : 'Show as table'}</button></div></section>`;
}

function rankList(entries, unit, href){
  const rows = entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if(!rows.length) return '<p class="muted small">Nothing recorded yet.</p>';
  const item = ([k, v], i) => href
    ? `<a href="${href(k)}"><span class="p">${i + 1}</span><span>${esc(k)}</span><span class="n">${v}${unit ? `<small>${pl(v, unit)}</small>` : ''}</span></a>`
    : `<div><span class="p">${i + 1}</span><span>${esc(k)}</span><span class="n">${v}${unit ? `<small>${pl(v, unit)}</small>` : ''}</span></div>`;
  const id = 'r' + Math.random().toString(36).slice(2, 7);
  return `<div class="rank2">${rows.slice(0, 10).map(item).join('')}</div>${rows.length > 10 ? `<div class="rank2" id="${id}" hidden>${rows.slice(10).map((r, i) => item(r, i + 10)).join('')}</div><button class="btn link show-more" data-act="stMore" data-id="${id}">Show all ${rows.length}</button>` : ''}`;
}

/* ---------- Home & away ---------- */
function venueTab(ms){
  const v = venueSplit(ms), o = overall(ms);
  const metric = (label, a, b, fmt, tipFmt) => {
    const max = Math.max(a ?? 0, b ?? 0) || 1;
    const row = (val, cls, who) => `<span class="row" data-tip="${who}: ${tipFmt(val)}"><span class="fill ${cls}" style="width:${(val ?? 0) / max * 100}%"></span><span class="v">${val == null ? '–' : fmt(val)}</span></span>`;
    return `<div class="metric"><span>${label}</span><div class="hb tall" style="grid-template-columns:1fr"><span class="tr">${row(a, 's1', 'Home')}${row(b, 's2', 'Away')}</span></div></div>`;
  };
  const n = x => String(x), d1 = x => x.toFixed(1), pc = x => x + '%';
  const opps = Object.entries(o.opps).sort((a, b) => b[1].P - a[1].P || a[0].localeCompare(b[0]));
  return `<div class="st-grid">
    <section class="card mat-panel reveal" aria-label="Home versus away"><div class="panel-head"><h3>Home v away</h3><small>${v.N.n ? `+ ${v.N.n} neutral` : ''}</small></div>
      <div class="legend"><span><span class="key-sw" style="background:var(--series-1)"></span>Home (${v.H.n})</span><span><span class="key-sw" style="background:var(--series-2)"></span>Away (${v.A.n})</span></div>
      <div class="cmp">
        ${metric('Games', v.H.n, v.A.n, n, n)}
        ${metric('Win rate', v.H.pct, v.A.pct, pc, pc)}
        ${metric('Goals scored per game', v.H.gpg, v.A.gpg, d1, d1)}
        ${metric('Goals conceded per game', v.H.cpg, v.A.cpg, d1, d1)}
        ${v.H.rating != null || v.A.rating != null ? metric('Average rating', v.H.rating, v.A.rating, d1, x => x == null ? 'no ratings' : d1(x) + '/10') : ''}
      </div></section>
    <section class="card mat-panel" aria-label="Records"><div class="panel-head"><h3>Records</h3></div>
      <div class="rank2">${[['Home', v.H], ['Away', v.A], ['Neutral', v.N]].filter(x => x[1].n).map(([k, x]) => `<div><span class="p"></span><span>${k}</span><span class="n">W${x.W} D${x.D} L${x.L}<small>${x.F}–${x.A}</small></span></div>`).join('')}</div></section>
    <section class="card mat-panel" aria-label="Opponents"><div class="panel-head"><h3>Opponents</h3><small>${opps.length}</small></div>
      <div class="rank2">${opps.slice(0, 12).map(([k, x], i) => `<div><span class="p">${crest(k, 22)}</span><span>${esc(k)}</span><span class="n">${x.P}<small>W${x.W} D${x.D} L${x.L}</small></span></div>`).join('')}</div>
      ${opps.length > 12 ? `<div class="rank2" id="oppmore" hidden>${opps.slice(12).map(([k, x]) => `<div><span class="p">${crest(k, 22)}</span><span>${esc(k)}</span><span class="n">${x.P}<small>W${x.W} D${x.D} L${x.L}</small></span></div>`).join('')}</div><button class="btn link show-more" data-act="stMore" data-id="oppmore">Show all ${opps.length}</button>` : ''}</section>
    <section class="card mat-panel" aria-label="Grounds visited"><div class="panel-head"><h3>Grounds visited</h3><small>${Object.keys(o.grounds).length}</small></div>${rankList(Object.entries(o.grounds), 'visits')}</section>
  </div>`;
}

/* ---------- Players ---------- */
function playersTab(ms){
  const ps = players(ms);
  const top = (key, unit) => rankList(ps.filter(p => p[key] > 0).map(p => [p.name, p[key]]), unit, playerHref);
  return `<div class="st-grid">
    <section class="card mat-panel" aria-label="Top scorers"><div class="panel-head"><h3>Goals I've seen</h3><a class="link-more" href="#/squad">Squad ${icon('chevron')}</a></div>${top('goals', 'goals')}</section>
    <section class="card mat-panel" aria-label="Most appearances"><div class="panel-head"><h3>Players I've seen most</h3></div>${top('apps', 'games')}</section>
    <section class="card mat-panel" aria-label="Assists"><div class="panel-head"><h3>Assists I've seen</h3></div>${top('assists', 'assists')}</section>
    <section class="card mat-panel" aria-label="Captains"><div class="panel-head"><h3>Captains</h3></div>${top('cap', 'games')}</section>
  </div>`;
}

actions.stScope = el => { scope = el.value; statsView(); };
actions.stTab = el => {
  tab = el.dataset.v;
  const seg = el.parentNode, btns = [...seg.querySelectorAll('button')], i = btns.indexOf(el);
  btns.forEach(b => { b.setAttribute('aria-pressed', b === el); b.setAttribute('aria-selected', b === el); });
  seg.querySelector('.seg-ind').style.transform = `translateX(calc(${i} * (100% + 4px)))`;
  const all = sorted(); drawTab(scope === 'All time' ? all : all.filter(m => seasonOf(m.date) === scope));
};
actions.stTable = () => { tableView = !tableView; const all = sorted(); drawTab(scope === 'All time' ? all : all.filter(m => seasonOf(m.date) === scope)); };
actions.stMore = el => { const box = document.getElementById(el.dataset.id); if(box){ box.hidden = false; el.remove(); } };
