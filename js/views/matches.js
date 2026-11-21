/* Match list (carried over; redesigned in the core-screens phase). */
import { db, esc, fmtDate, res, scoreTxt, seasonOf, sorted, $ } from '../core.js';
import { cloud } from '../sync.js';
import { app } from '../router.js';
import { icon } from '../ui.js';

const filt = { q:'', season:'', comp:'', venue:'' };

export function matchesView(){
  const all = sorted();
  if(!all.length){
    app().innerHTML = `<div class="page-head"><div><h1>Matches</h1></div></div>
      <div class="card mat-panel empty">${icon('ball')}<h2>No matches yet</h2><p class="muted">Add the first game you went to – from last weekend or from 1985, it all counts.</p><a class="btn" href="#/new">${icon('plus')} Add a match</a></div>`;
    return;
  }
  const seasons = [...new Set(all.map(m => seasonOf(m.date)))];
  const comps = [...new Set(all.map(m => m.comp).filter(Boolean))].sort();
  const last = db.meta.lastBackup ? new Date(db.meta.lastBackup) : null;
  const nudge = cloud.user === null && (!last || (Date.now() - last) > 30 * 864e5);
  app().innerHTML = `
    <div class="page-head"><div><h1>Matches</h1><p>${all.length} game${all.length > 1 ? 's' : ''} logged</p></div></div>
    ${nudge ? `<div class="banner">Matches are only saved on this device. <a href="#/settings">Sign in to back up &amp; sync automatically</a></div>` : ''}
    <div class="filters">
      <input id="fq" type="search" placeholder="Search opponent, player, ground…" value="${esc(filt.q)}" aria-label="Search matches">
      <select id="fs" aria-label="Season"><option value="">All seasons</option>${seasons.map(s => `<option ${s === filt.season ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select id="fc" aria-label="Competition"><option value="">All competitions</option>${comps.map(s => `<option ${s === filt.comp ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select id="fv" aria-label="Home or away"><option value="">Home &amp; away</option><option value="H" ${filt.venue === 'H' ? 'selected' : ''}>Home</option><option value="A" ${filt.venue === 'A' ? 'selected' : ''}>Away</option><option value="N" ${filt.venue === 'N' ? 'selected' : ''}>Neutral</option></select>
    </div>
    <div id="mlist"></div>`;
  const draw = () => {
    const q = filt.q.toLowerCase();
    const ms = all.filter(m =>
      (!filt.season || seasonOf(m.date) === filt.season) && (!filt.comp || m.comp === filt.comp) && (!filt.venue || m.venue === filt.venue) &&
      (!q || JSON.stringify([m.opp, m.ground, m.comp, m.round, m.review, m.motm, m.with, m.lineup, m.bench, m.goals, m.subs]).toLowerCase().includes(q)));
    const bySeason = {};
    ms.forEach(m => { const s = seasonOf(m.date); (bySeason[s] = bySeason[s] || []).push(m); });
    let html = '';
    for(const [s, g] of Object.entries(bySeason)){
      const w = g.filter(x => res(x) === 'W').length, d = g.filter(x => res(x) === 'D').length, l = g.filter(x => res(x) === 'L').length;
      html += `<div class="season">${s}<span>${g.length} game${g.length > 1 ? 's' : ''} · W${w} D${d} L${l}</span></div><div class="list mat-panel">`;
      for(const m of g){
        const r = res(m);
        html += `<a class="m" href="#/match/${m.id}"><div class="badge ${r || ''}">${r || '–'}</div><div class="mid"><div class="t">${esc(scoreTxt(m))}</div><div class="s">${fmtDate(m.date)} · ${esc([m.comp, m.ground || ''].filter(Boolean).join(' · '))}${m.pens ? ' · pens' : m.et ? ' · aet' : ''}</div></div>${m.rating ? `<div class="rt">${esc(m.rating)}/10</div>` : ''}</a>`;
      }
      html += `</div>`;
    }
    $('#mlist').innerHTML = html || `<p class="muted" style="text-align:center">No matches match those filters.</p>`;
  };
  $('#fq').oninput = e => { filt.q = e.target.value; draw(); };
  $('#fs').onchange = e => { filt.season = e.target.value; draw(); };
  $('#fc').onchange = e => { filt.comp = e.target.value; draw(); };
  $('#fv').onchange = e => { filt.venue = e.target.value; draw(); };
  draw();
}
