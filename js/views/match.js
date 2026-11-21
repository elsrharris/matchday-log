/* Match Centre: hero scoreboard, match info, and Timeline / Line-ups / My day.
   On phones those three are tabs; on desktop they sit side by side in two columns. */
import { db, SS, save, esc, fmtDate, minVal, minTxt, num, res, seasonOf, venueTxt } from '../core.js';
import { app, go } from '../router.js';
import { actions, icon, sheet, toast } from '../ui.js';
import { crest } from '../crests.js';
import { fixtureRow } from './home.js';

let tab = 'timeline';
const has = v => v !== '' && v != null;

function statusChip(m){
  if(m.pens) return has(m.pl) && has(m.po) ? `Pens ${m.venue === 'A' ? `${m.po}–${m.pl}` : `${m.pl}–${m.po}`}` : 'After penalties';
  if(m.et) return 'After extra time';
  return 'Full time';
}

function timeline(m){
  const leeds = 'Leeds United', opp = m.opp || 'Opponent';
  const ev = [
    ...(m.goals || []).map(g => ({ min: g.min, t: g.t, kind: 'goal', node: icon('ball'),
      html: `<b>${esc(g.p || (g.type === 'OG' ? 'Own goal' : 'Goal'))}</b>${g.type ? ` <span class="muted small">${g.type === 'OG' ? 'own goal' : esc(g.type.toLowerCase())}</span>` : ''}${g.a ? `<small>Assist: ${esc(g.a)}</small>` : ''}` })),
    ...(m.cards || []).map(c => ({ min: c.min, t: c.t, kind: 'card', node: `<span class="card-ico ${c.c === 'Yellow' ? 'y' : c.c === '2nd yellow' ? 'yr' : 'r'}"></span>`,
      html: `<b>${esc(c.p || 'Card')}</b>${c.c !== 'Yellow' ? `<small>${esc(c.c === '2nd yellow' ? 'Second yellow – sent off' : 'Red card')}</small>` : ''}` })),
    ...(m.subs || []).map(s => ({ min: s.min, t: s.t, kind: 'sub', node: icon('sub', 'sub-ico'),
      html: `<b>${esc(s.on || '?')}</b><small>on for ${esc(s.off || '?')}</small>` }))
  ].sort((x, y) => minVal(x.min) - minVal(y.min));
  if(!ev.length) return '';
  /* half-time / full-time markers; untimed events (older matches) are listed after full time */
  const timed = ev.filter(e => minVal(e.min) < 999), untimed = ev.filter(e => minVal(e.min) >= 999);
  const ht = has(m.htl) && has(m.hto) ? (m.venue === 'A' ? `${m.hto}–${m.htl}` : `${m.htl}–${m.hto}`) : '';
  const ft = has(m.ls) && has(m.os) ? (m.venue === 'A' ? `${m.os}–${m.ls}` : `${m.ls}–${m.os}`) : '';
  const f90 = m.et && has(m.ftl) && has(m.fto) ? (m.venue === 'A' ? `${m.fto}–${m.ftl}` : `${m.ftl}–${m.fto}`) : '';
  const row = e => `<li class="${e.kind} ${e.t === 'O' ? 'opp' : 'lufc'}"><span class="min">${esc(minTxt(e.min))}</span><span class="node">${e.node}</span>
      <span class="what">${crest(e.t === 'O' ? opp : leeds, 20)}<span>${e.html}</span></span></li>`;
  const mark = (txt, score) => `<li class="marker"><span class="min"></span><span class="node"></span><span class="tag">${txt}${score ? ` · ${esc(score)}` : ''}</span></li>`;
  let out = '', htDone = false, etDone = false;
  for(const e of timed){
    const v = minVal(e.min);
    if(!htDone && v >= 46){ out += mark('Half-time', ht); htDone = true; }
    if(m.et && !etDone && v >= 91){ out += mark('90 minutes', f90); etDone = true; }
    out += row(e);
  }
  if(timed.length && !htDone) out += mark('Half-time', ht);
  out += mark(m.pens ? 'Full time · penalties' : m.et ? 'Full time · aet' : 'Full time', ft);
  if(untimed.length) out += mark('Time not recorded') + untimed.map(row).join('');
  return `<ol class="tl">${out}</ol>`;
}

function lineups(m){
  const lineup = (m.lineup || []).filter(p => p.name), bench = (m.bench || []).filter(p => p.name);
  if(!lineup.length && !bench.length && !m.oppXI) return '';
  /* goal / card / sub icons next to a player; side 'L' = Leeds, 'O' = opponent. A goal counts for the scorer's
     own side, so an own goal (recorded under the team it counted for) isn't shown against the scorer. */
  const mine = (x, side) => side === 'O' ? x.t === 'O' : x.t !== 'O';
  const marks = (name, side) => {
    let s = '';
    (m.goals || []).filter(g => mine(g, side) && g.p === name && g.type !== 'OG').forEach(() => s += icon('ball'));
    (m.cards || []).filter(c => mine(c, side) && c.p === name).forEach(c => s += `<span class="card-ico ${c.c === 'Yellow' ? 'y' : c.c === '2nd yellow' ? 'yr' : 'r'}" style="width:9px;height:12px"></span>`);
    if((m.subs || []).some(x => mine(x, side) && (x.off === name || x.on === name))) s += icon('sub', 'sub-ico');
    return s ? `<span class="ic">${s}</span>` : '';
  };
  const li = (p, side = 'L') => `<li>${p.n ? `<span class="n">${esc(p.n)}</span>` : ''}<span class="nm">${esc(p.name)}</span>${p.cap ? '<span class="cap">C</span>' : ''}${marks(p.name, side)}</li>`;
  const opp = parseOppXI(m.oppXI);
  return `${lineup.length ? `<div class="subhead"><span>Leeds United</span><span>${esc(m.formation || '')}</span></div><ul class="xi2">${lineup.map(li).join('')}</ul>` : ''}
    ${bench.length ? `<div class="subhead"><span>Substitutes</span></div><ul class="xi2">${bench.map(li).join('')}</ul>` : ''}
    ${opp.xi.length || opp.bench.length ? `<div class="subhead opp-head"><span>${crest(m.opp, 20)} ${esc(m.opp || 'Opponent')}</span><span>${esc(opp.formation)}</span></div>
      ${opp.xi.length ? `<ul class="xi2">${opp.xi.map(p => li(p, 'O')).join('')}</ul>` : ''}
      ${opp.bench.length ? `<div class="subhead"><span>Substitutes</span></div><ul class="xi2">${opp.bench.map(p => li(p, 'O')).join('')}</ul>` : ''}` : ''}
    ${opp.extra ? `<div class="opp-xi">${esc(opp.extra)}</div>` : ''}`;
}

function myDay(m){
  const any = m.rating || m.motm || m.review || m.with || m.seat || m.notes;
  if(!any) return `<p class="muted" style="margin:0 0 12px">No review yet. How was the day?</p><a class="btn sec" href="#/edit/${m.id}">${icon('edit')} Add your review</a>`;
  const kv = [['My man of the match', m.motm], ['Went with', m.with], ['Stand / seat', m.seat]].filter(x => x[1]);
  return `${m.rating ? `<div class="rate-big"><b>${esc(m.rating)}</b><span>out of 10</span></div>` : ''}
    ${kv.length ? `<dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
    ${m.review ? `<blockquote>${esc(m.review)}</blockquote>` : ''}
    ${m.notes ? `<div class="subhead"><span>Other notes</span></div><div class="review muted">${esc(m.notes)}</div>` : ''}`;
}


/* The opponent line-up is free text: one player per line ("31 Antonin Kinsky" or just a name), an optional
   "(3-5-2)" formation line and an optional "Subs: A, B, C" line (the format the ESPN import writes).
   Anything that doesn't fit is shown as plain text underneath. */
function parseOppXI(text){
  const out = { xi: [], bench: [], formation: '', extra: '' }, extra = [];
  for(const raw of String(text || '').split(/\r?\n/)){
    const line = raw.trim(); if(!line) continue;
    let x;
    if((x = line.match(/^\(\s*(\d[\d\s-]*\d)\s*\)$/))) out.formation = x[1].replace(/\s+/g, '');
    else if((x = line.match(/^subs?\s*:\s*(.*)$/i))) out.bench.push(...x[1].split(',').map(n => n.trim()).filter(Boolean).map(name => ({ n: (name.match(/^(\d+)\s+/) || [])[1] || '', name: name.replace(/^\d+\s+/, '') })));
    else if((x = line.match(/^(\d{1,2})[.)]?\s+(.+)$/))) out.xi.push({ n: x[1], name: x[2].trim() });
    else if(line.split(/\s+/).length <= 5 && !/[.!?:;]/.test(line)) out.xi.push({ n: '', name: line });
    else extra.push(line);
  }
  out.extra = extra.join('\n');
  return out;
}

export function matchView(p){
  const m = db.matches.find(x => x.id === p.id);
  if(!m){ go('#/matches', { replace: true }); return; }
  const home = m.venue !== 'A';
  const [n1, n2] = home ? ['Leeds United', m.opp || 'Opponent'] : [m.opp || 'Opponent', 'Leeds United'];
  const [s1, s2] = home ? [m.ls, m.os] : [m.os, m.ls];
  const ht = has(m.htl) && has(m.hto) ? (home ? `${m.htl}–${m.hto}` : `${m.hto}–${m.htl}`) : '';
  const r = res(m);
  const info = [['pin', 'Ground', m.ground], ['clock', 'Kick-off', m.ko], ['people', 'Attendance', m.att && Number(m.att).toLocaleString('en-GB')],
    ['trophy', 'Competition', [m.comp, m.round].filter(Boolean).join(' · ')], ['whistle', 'Referee', m.ref], ['squad', 'Manager', m.manager], ['cloud', 'Weather', m.weather]].filter(x => x[2]);
  const tl = timeline(m), lu = lineups(m), panels = [['timeline', 'Timeline', tl], ['lineups', 'Line-ups', lu], ['myday', 'My day', myDay(m)]].filter(x => x[2]);
  if(!panels.some(x => x[0] === tab)) tab = panels[0][0];
  const ti = panels.findIndex(x => x[0] === tab);
  const panel = (k, title, body) => `<section class="card mat-panel mc-panel ${k === 'myday' ? 'myday' : ''}" data-panel="${k}" ${k === tab ? '' : 'hidden'} role="tabpanel" aria-label="${title}"><div class="panel-head"><h3>${title}</h3>${k === 'timeline' ? `<small>${esc(n1 === 'Leeds United' ? 'Leeds' : n1)} v ${esc(n2 === 'Leeds United' ? 'Leeds' : n2)}</small>` : ''}</div>${body}</section>`;
  const byKey = Object.fromEntries(panels.map(([k, t, b]) => [k, panel(k, t, b)]));

  app().innerHTML = `<div class="stage" aria-hidden="true"></div>
    <div class="mc-top"><a class="iconbtn mat-panel" href="#/matches" data-act="back" aria-label="Back to matches">${icon('back')}</a>
      <a class="iconbtn mat-panel" href="#/edit/${m.id}" aria-label="Edit this match">${icon('edit')}</a></div>
    <section class="mc-hero mat-raised" aria-label="Score">
      <div class="sub">${esc(fmtDate(m.date, true))}</div>
      ${fixtureRow(n1, n2, `<div class="fx-score">${has(s1) && has(s2) ? `${esc(s1)}–${esc(s2)}` : 'v'}</div><span class="chip ft">${statusChip(m)}</span>`)}
      ${ht ? `<div class="ht">HT ${esc(ht)}</div>` : ''}
      <div class="sub">${esc([m.comp, m.round].filter(Boolean).join(' · '))}${m.comp ? ' · ' : ''}${esc(seasonOf(m.date))}${r ? ` · <span style="color:var(--${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'text-2'});font-weight:700">${{W:'Won', D:'Drawn', L:'Lost'}[r]}</span>` : ''}</div>
    </section>
    <div class="mc-grid">
      <div class="mc-col">
        ${info.length ? `<section class="card mat-panel" style="margin:0" aria-label="Match information"><div class="info-list">${info.map(([i, k, v]) => `<div>${icon(i)}<span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div></section>` : ''}
        ${panels.length > 1 ? `<div class="tabs" role="tablist">${panels.map(([k, t]) => `<button role="tab" data-act="mcTab" data-v="${k}" aria-selected="${k === tab}">${t}</button>`).join('')}<span class="tab-ind"></span></div>` : ''}
        <div class="mc-panels">${byKey.timeline || ''}${byKey.lineups && !byKey.timeline ? byKey.lineups : ''}</div>
      </div>
      <div class="mc-col mc-panels">${byKey.myday}${byKey.timeline && byKey.lineups ? byKey.lineups : ''}</div>
    </div>
    ${m.espnId ? `<p class="credit">Match facts from ESPN.</p>` : m.histId ? `<p class="credit">Match facts from the <a href="https://lufchistory.com${esc(m.histId)}" target="_blank" rel="noopener">Leeds United Historical Archive</a>.</p>` : ''}
    <div class="actions"><a class="btn" href="#/edit/${m.id}">${icon('edit')} Edit</a><button class="btn sec" data-act="dupMatch" data-id="${m.id}">${icon('copy')} Copy as new match</button><button class="btn danger" data-act="delMatch" data-id="${m.id}">${icon('trash')} Delete</button></div>`;
  placeTab(ti);
}

function placeTab(i){
  const tabs = document.querySelector('.tabs'); if(!tabs) return;
  const b = tabs.querySelectorAll('button')[i], ind = tabs.querySelector('.tab-ind');
  if(!b || !ind) return;
  const w = Math.min(b.offsetWidth * .5, 72);
  ind.style.width = w + 'px';
  ind.style.transform = `translateX(${b.offsetLeft + (b.offsetWidth - w) / 2}px)`;
}
actions.mcTab = el => {
  tab = el.dataset.v;
  const btns = [...el.parentNode.querySelectorAll('button')];
  btns.forEach(b => b.setAttribute('aria-selected', b === el));
  document.querySelectorAll('.mc-panel').forEach(p => { const on = p.dataset.panel === tab; p.hidden = !on; if(on){ p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); } });
  placeTab(btns.indexOf(el));
};
/* back button: use history when we came from inside the app, so the list keeps its scroll position */
actions.back = () => { if(history.length > 1 && history.state) history.back(); else go('#/matches'); };
actions.delMatch = async el => {
  const m = db.matches.find(x => x.id === el.dataset.id); if(!m) return;
  const ok = await sheet({ title: 'Delete this match?', message: `${fmtDate(m.date)} v ${m.opp || 'opponent'} will be removed for good${'' }, including your review.`,
    actions: [{ label: 'Delete match', value: true, style: 'danger' }, { label: 'Cancel', value: false, style: 'secondary' }] });
  if(!ok) return;
  db.matches = db.matches.filter(x => x.id !== m.id); save(); go('#/matches'); toast('Match deleted');
};
actions.dupMatch = el => {
  const m = db.matches.find(x => x.id === el.dataset.id); if(!m) return;
  SS.put('lufc-template', JSON.stringify({ comp:m.comp, lineup:m.lineup, bench:m.bench }));
  go('#/new');
};
addEventListener('resize', () => { const t = document.querySelector('.tabs [aria-selected="true"]'); if(t) placeTab([...t.parentNode.querySelectorAll('button')].indexOf(t)); });
