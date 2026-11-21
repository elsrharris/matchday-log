/* Matches: every logged game, grouped by month, with search and filters. */
import { db, esc, res, sorted, seasonOf, venueTxt } from '../core.js';
import { cloud } from '../sync.js';
import { app } from '../router.js';
import { actions, icon } from '../ui.js';
import { crest } from '../crests.js';

const filt = { q:'', season:'', comp:'', venue:'', result:'' };
const monthKey = d => d ? d.slice(0, 7) : '';
const monthLbl = k => k ? new Date(k + '-15T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'No date';

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
  const venues = [['', 'All'], ['H', 'Home'], ['A', 'Away']];
  const vi = Math.max(0, venues.findIndex(v => v[0] === filt.venue));
  app().innerHTML = `
    <div class="page-head"><div><h1>Matches</h1><p>${all.length} game${all.length > 1 ? 's' : ''} I've been to</p></div></div>
    ${nudge ? `<div class="banner">Matches are only saved on this device. <a href="#/settings">Sign in to back up &amp; sync automatically</a></div>` : ''}
    <div class="searchbox">${icon('search')}<input id="fq" type="search" placeholder="Search opponent, player, ground…" value="${esc(filt.q)}" aria-label="Search matches"></div>
    <div class="toolbar" role="group" aria-label="Filters">
      <div class="seg sm" role="group" aria-label="Home or away"><span class="seg-ind" style="width:calc((100% - 14px) / 3);transform:translateX(calc(${vi} * (100% + 4px)))"></span>
        ${venues.map(([k, l]) => `<button type="button" data-act="mVenue" data-v="${k}" aria-pressed="${filt.venue === k}">${l}</button>`).join('')}</div>
      <div class="res-chips" role="group" aria-label="Result">${['W', 'D', 'L'].map(x => `<button type="button" class="${x}" data-act="mResult" data-v="${x}" aria-pressed="${filt.result === x}" aria-label="${{W:'Wins', D:'Draws', L:'Defeats'}[x]}">${x}</button>`).join('')}</div>
      <select class="pill-select" id="fs" aria-label="Season"><option value="">All seasons</option>${seasons.map(s => `<option ${s === filt.season ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select class="pill-select" id="fc" aria-label="Competition"><option value="">All competitions</option>${comps.map(s => `<option ${s === filt.comp ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
    </div>
    <div id="mlist"></div>`;
  draw(all);
  document.getElementById('fq').oninput = e => { filt.q = e.target.value; draw(all); };
  document.getElementById('fs').onchange = e => { filt.season = e.target.value; draw(all); };
  document.getElementById('fc').onchange = e => { filt.comp = e.target.value; draw(all); };
}

function draw(all){
  const q = filt.q.trim().toLowerCase();
  const ms = all.filter(m =>
    (!filt.season || seasonOf(m.date) === filt.season) && (!filt.comp || m.comp === filt.comp) &&
    (!filt.venue || m.venue === filt.venue) && (!filt.result || res(m) === filt.result) &&
    (!q || JSON.stringify([m.opp, m.ground, m.comp, m.round, m.review, m.motm, m.with, m.lineup, m.bench, m.goals, m.subs]).toLowerCase().includes(q)));
  const groups = new Map();
  ms.forEach(m => { const k = monthKey(m.date); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(m); });
  let html = '';
  for(const [k, g] of groups){
    const w = g.filter(x => res(x) === 'W').length, d = g.filter(x => res(x) === 'D').length, l = g.filter(x => res(x) === 'L').length;
    html += `<div class="month"><h2>${esc(monthLbl(k))}</h2><span>${g.length > 1 ? `W${w} D${d} L${l}` : ''}</span></div><div class="list mat-panel">`;
    for(const m of g){
      const r = res(m), dt = m.date ? new Date(m.date + 'T12:00:00') : null;
      const score = m.ls !== '' && m.os !== '' ? `${esc(m.ls)}–${esc(m.os)}` : 'v';
      const extra = m.pens ? 'pens' : m.et ? 'aet' : '';
      html += `<a class="mrow" href="#/match/${m.id}" aria-label="${esc(`${venueTxt(m.venue)} v ${m.opp}, ${m.ls}–${m.os}, ${m.date}`)}">
        <span class="when">${dt ? `<b>${dt.getDate()} ${dt.toLocaleDateString('en-GB', { month: 'short' })}</b>${dt.toLocaleDateString('en-GB', { weekday: 'short' })} ${String(dt.getFullYear()).slice(2) !== String(new Date().getFullYear()).slice(2) ? "'" + String(dt.getFullYear()).slice(2) : ''}` : ''}</span>
        ${crest(m.opp, 34)}
        <span class="who"><b>${esc(m.opp || 'Opponent')}</b><small><span class="ha-m">${esc(venueTxt(m.venue))} · </span>${esc([m.comp, m.round].filter(Boolean).join(' · '))}${extra ? ' · ' + extra : ''}</small></span>
        <span class="xtra">${esc(m.ground || '')}</span>
        <span class="ha" title="${venueTxt(m.venue)}">${esc(m.venue || '')}</span>
        <span class="score-pill ${r || ''}">${score}</span>
        <span class="rate">${m.rating ? esc(m.rating) + '/10' : ''}</span>
        ${icon('chevron', 'chev')}</a>`;
    }
    html += '</div>';
  }
  document.getElementById('mlist').innerHTML = html || `<div class="card mat-panel empty"><p class="muted">No matches match those filters.</p><button class="btn sec" data-act="mClear">Clear filters</button></div>`;
}

actions.mVenue = el => {
  filt.venue = el.dataset.v;
  const seg = el.parentNode, btns = [...seg.querySelectorAll('button')], i = btns.indexOf(el);
  btns.forEach(b => b.setAttribute('aria-pressed', b === el));
  seg.querySelector('.seg-ind').style.transform = `translateX(calc(${i} * (100% + 4px)))`;
  draw(sorted());
};
actions.mResult = el => {
  filt.result = filt.result === el.dataset.v ? '' : el.dataset.v;
  el.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === filt.result));
  draw(sorted());
};
actions.mClear = () => { Object.assign(filt, { q:'', season:'', comp:'', venue:'', result:'' }); matchesView(); };
