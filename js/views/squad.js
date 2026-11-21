/* Squad: the Leeds players he has seen, and a profile for each, built only from his logged matches. */
import { db, esc, fmtDate, res, scoreTxt, sorted } from '../core.js';
import { players } from '../calc.js';
import { app, go } from '../router.js';
import { actions, icon } from '../ui.js';
import { crest } from '../crests.js';

let q = '', sort = 'apps';
const SORTS = [['apps', 'Most seen'], ['goals', 'Goals'], ['assists', 'Assists'], ['recent', 'Recent'], ['name', 'A–Z']];
const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const href = n => '#/player/' + encodeURIComponent(n);
const pl = (n, u) => n === 1 ? u.replace(/s$/, '') : u;

export function squadView(){
  const ps = players(db.matches);
  if(!ps.length){
    app().innerHTML = `<div class="page-head"><div><h1>Squad</h1></div></div><div class="card mat-panel empty">${icon('squad')}<p class="muted">Players appear here once you've logged matches with line-ups.</p></div>`;
    return;
  }
  app().innerHTML = `
    <div class="page-head"><div><h1>Squad</h1><p>${ps.length} Leeds players I've seen</p></div></div>
    <div class="sq-tools">
      <div class="searchbox">${icon('search')}<input id="pq" type="search" placeholder="Search players…" value="${esc(q)}" aria-label="Search players"></div>
      <select class="pill-select mat-panel" data-change="sqSort" aria-label="Sort players">${SORTS.map(([k, l]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="pgrid" id="plist"></div>`;
  const draw = () => {
    const t = q.trim().toLowerCase();
    const cmp = { apps: (a, b) => b.apps - a.apps || b.goals - a.goals, goals: (a, b) => b.goals - a.goals || b.apps - a.apps, assists: (a, b) => b.assists - a.assists || b.apps - a.apps,
      recent: (a, b) => b.last.localeCompare(a.last) || b.apps - a.apps, name: (a, b) => a.name.localeCompare(b.name) }[sort];
    const list = ps.filter(p => !t || p.name.toLowerCase().includes(t)).sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name));
    document.getElementById('plist').innerHTML = list.slice(0, 300).map(p => `
      <a class="pcard mat-panel" href="${href(p.name)}"><span class="avatar" aria-hidden="true">${esc(initials(p.name))}</span>
        <span class="mid"><b>${esc(p.name)}</b><small>${p.last ? 'Last seen ' + esc(p.last.slice(0, 4)) : ''}${p.cap ? ` · captain ${p.cap}×` : ''}</small></span>
        <span class="nums"><span><b>${p.apps}</b><span>Games</span></span><span><b>${p.goals}</b><span>Goals</span></span></span></a>`).join('')
      || '<div class="card mat-panel empty"><p class="muted">No players match.</p></div>';
  };
  document.getElementById('pq').oninput = e => { q = e.target.value; draw(); };
  draw();
}
actions.sqSort = el => { sort = el.value; squadView(); };

export function playerView(p){
  const name = decodeURIComponent(p.id || '');
  const ps = players(db.matches), x = ps.find(y => y.name === name);
  if(!x){ go('#/squad', { replace: true }); return; }
  const ms = sorted().filter(m => x.matches.includes(m.id));
  const first = ms[ms.length - 1], last = ms[0];
  const contrib = m => {
    const bits = [];
    const g = (m.goals || []).filter(z => z.t !== 'O' && z.p === name && z.type !== 'OG'); if(g.length) bits.push(`${g.length > 1 ? g.length + ' goals' : 'Goal'}${g.some(z => z.min) ? ' ' + g.map(z => z.min && z.min + "'").filter(Boolean).join(', ') : ''}`);
    const a = (m.goals || []).filter(z => z.t !== 'O' && z.a === name).length; if(a) bits.push(a > 1 ? a + ' assists' : 'Assist');
    if((m.lineup || []).some(z => z.name === name && z.cap)) bits.push('Captain');
    if((m.subs || []).some(z => z.t !== 'O' && z.on === name)) bits.push('Came on');
    (m.cards || []).filter(z => z.t !== 'O' && z.p === name).forEach(z => bits.push(z.c === 'Yellow' ? 'Booked' : 'Sent off'));
    return bits.join(' · ');
  };
  app().innerHTML = `<div class="stage" aria-hidden="true"></div>
    <div class="mc-top"><a class="iconbtn mat-panel" href="#/squad" data-act="back" aria-label="Back to squad">${icon('back')}</a><span></span></div>
    <section class="p-hero mat-raised"><span class="avatar" aria-hidden="true">${esc(initials(name))}</span><h1>${esc(name)}</h1>
      <p>Seen ${x.apps} ${pl(x.apps, 'times')}${first && last ? ` · ${esc(first.date.slice(0, 4))}${last.date.slice(0, 4) !== first.date.slice(0, 4) ? '–' + esc(last.date.slice(0, 4)) : ''}` : ''}</p></section>
    <div class="tiles2 p-tabs" style="margin-bottom:12px">
      <div class="tile2 mat-panel"><b>${x.apps}</b><span>${pl(x.apps, 'Games')}</span></div>
      <div class="tile2 mat-panel"><b>${x.starts}</b><span>${pl(x.starts, 'Starts')}</span></div>
      <div class="tile2 mat-panel"><b>${x.subs}</b><span>Off the bench</span></div>
      <div class="tile2 mat-panel"><b>${x.goals}</b><span>${pl(x.goals, 'Goals')}</span></div>
      <div class="tile2 mat-panel"><b>${x.assists}</b><span>${pl(x.assists, 'Assists')}</span></div>
      <div class="tile2 mat-panel"><b>${x.yellow + x.red}</b><span>${pl(x.yellow + x.red, 'Cards')}${x.red ? ` (${x.red} red)` : ''}</span></div>
    </div>
    ${x.cap ? `<p class="muted small" style="margin:0 4px 12px">Captain in ${x.cap} of the games I saw.</p>` : ''}
    <div class="month"><h2>Games I saw ${esc(name.split(' ').slice(-1)[0])} play</h2></div>
    <div class="list mat-panel">${ms.map(m => { const r = res(m), c = contrib(m); return `<a class="mrow" href="#/match/${m.id}">
      <span class="when"><b>${new Date(m.date + 'T12:00:00').getDate()} ${new Date(m.date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' })}</b>${esc(m.date.slice(0, 4))}</span>${crest(m.opp, 34)}
      <span class="who"><b>${esc(m.opp)}</b><small>${esc(c || [m.comp].filter(Boolean).join(''))}</small></span><span class="xtra">${esc(m.comp || '')}</span><span class="ha">${esc(m.venue || '')}</span>
      <span class="score-pill ${r || ''}">${esc(m.ls)}–${esc(m.os)}</span><span class="rate"></span>${icon('chevron', 'chev')}</a>`; }).join('')}</div>`;
}
