/* Match page (carried over; becomes the Match Centre in the core-screens phase). */
import { db, SS, save, esc, fmtDate, minVal, minTxt, penNote, seasonOf, sides } from '../core.js';
import { app, go } from '../router.js';
import { actions, icon } from '../ui.js';

export function matchView(p){
  const m = db.matches.find(x => x.id === p.id);
  if(!m){ go('#/matches', { replace: true }); return; }
  const [a, b] = sides(m);
  const has = a.s !== '' && a.s != null && b.s !== '' && b.s != null;
  const ht = (m.htl !== '' && m.htl != null && m.hto !== '' && m.hto != null) ? (m.venue === 'A' ? `${m.hto}–${m.htl}` : `${m.htl}–${m.hto}`) : '';
  const ft90 = m.et && m.ftl !== '' && m.ftl != null && m.fto !== '' && m.fto != null ? (m.venue === 'A' ? `${m.fto}–${m.ftl}` : `${m.ftl}–${m.fto}`) : '';
  const notes = [ht && 'HT ' + ht, ft90 && '90 mins ' + ft90, m.et && 'After extra time', penNote(m)].filter(Boolean).join(' · ');

  const evs = [
    ...(m.goals || []).map(g => ({min:g.min, t:g.t, html:`${icon('ball')} <div class="who"><b>${esc(g.p || 'Goal')}</b>${g.type ? ` <span class="sub">(${g.type === 'OG' ? 'own goal' : esc(g.type.toLowerCase())})</span>` : ''}${g.a ? `<div class="sub">Assist: ${esc(g.a)}</div>` : ''}</div>`})),
    ...(m.cards || []).map(c => ({min:c.min, t:c.t, html:`${c.c === 'Yellow' ? '🟨' : c.c === '2nd yellow' ? '🟨🟥' : '🟥'} <div class="who">${esc(c.p || 'Card')}</div>`})),
    ...(m.subs || []).map(s => ({min:s.min, t:s.t, html:`🔁 <div class="who"><b>${esc(s.on || '?')}</b><div class="sub">for ${esc(s.off || '?')}</div></div>`}))
  ].sort((x, y) => minVal(x.min) - minVal(y.min));

  const lineup = (m.lineup || []).filter(p => p.name);
  const bench = (m.bench || []).filter(p => p.name);
  const li = p => `<li><span class="n">${esc(p.n || '')}</span>${esc(p.name)}${p.cap ? '<span class="cap">C</span>' : ''}</li>`;
  const info = [['Competition', [m.comp, m.round].filter(Boolean).join(' – ')], ['Ground', m.ground], ['Kick-off', m.ko], ['Attendance', m.att && Number(m.att).toLocaleString('en-GB')], ['Referee', m.ref], ['Leeds manager', m.manager], ['Weather', m.weather]].filter(x => x[1]);

  app().innerHTML = `
    <div class="hero mat-raised">
      <div class="meta">${fmtDate(m.date, true)} · ${esc(seasonOf(m.date))}</div>
      <div class="teams"><div class="tm">${esc(a.name)}</div><div class="sc">${has ? esc(a.s) + '–' + esc(b.s) : 'v'}</div><div class="tm">${esc(b.name)}</div></div>
      ${notes ? `<div class="note">${esc(notes)}</div>` : ''}
    </div>
    <div class="detail-cols"><div>
    ${info.length ? `<div class="card mat-panel"><h3>Match info</h3><dl class="kv">${info.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>` : ''}
    ${evs.length ? `<div class="card mat-panel"><h3>Timeline <span class="small muted" style="text-transform:none;letter-spacing:0">Leeds left · ${esc(m.opp || 'Opp')} right</span></h3>${evs.map(e => `<div class="ev ${e.t === 'O' ? 'r' : 'l'}"><span class="min">${esc(minTxt(e.min))}</span>${e.html}</div>`).join('')}</div>` : ''}
    </div><div>
    ${lineup.length || bench.length ? `<div class="card mat-panel"><h3>Leeds United line-up${m.formation ? ` <span class="small muted">${esc(m.formation)}</span>` : ''}</h3><ul class="xi">${lineup.map(li).join('')}</ul>${bench.length ? `<p class="small muted" style="margin:10px 0 4px">Subs</p><ul class="xi">${bench.map(li).join('')}</ul>` : ''}</div>` : ''}
    ${m.oppXI ? `<div class="card mat-panel"><h3>${esc(m.opp || 'Opponent')} line-up</h3><div class="review small">${esc(m.oppXI)}</div></div>` : ''}
    ${m.rating || m.motm || m.review || m.with || m.seat ? `<div class="card mat-panel"><h3>My review ${m.rating ? `<span class="rating">${esc(m.rating)}/10</span>` : ''}</h3>
      <dl class="kv" style="margin-bottom:${m.review ? '12px' : '0'}">${m.motm ? `<dt>My man of the match</dt><dd>${esc(m.motm)}</dd>` : ''}${m.with ? `<dt>Went with</dt><dd>${esc(m.with)}</dd>` : ''}${m.seat ? `<dt>Stand / seat</dt><dd>${esc(m.seat)}</dd>` : ''}</dl>
      ${m.review ? `<div class="review">${esc(m.review)}</div>` : ''}</div>` : ''}
    ${m.notes ? `<div class="card mat-panel"><h3>Other notes</h3><div class="review">${esc(m.notes)}</div></div>` : ''}
    </div></div>
    ${m.espnId ? `<p class="small muted" style="margin:0 4px 12px">Match facts from ESPN.</p>` : m.histId ? `<p class="small muted" style="margin:0 4px 12px">Match facts from the <a href="https://lufchistory.com${esc(m.histId)}" target="_blank" rel="noopener">Leeds United Historical Archive</a>.</p>` : ''}
    <div class="btns"><a class="btn" href="#/edit/${m.id}">${icon('edit')} Edit</a><button class="btn sec" data-act="dupMatch" data-id="${m.id}">${icon('copy')} Copy as new match</button><button class="btn danger" data-act="delMatch" data-id="${m.id}">${icon('trash')} Delete</button></div>`;
}
actions.delMatch = el => {
  if(!confirm('Delete this match for good?')) return;
  db.matches = db.matches.filter(m => m.id !== el.dataset.id); save(); go('#/matches');
};
actions.dupMatch = el => {
  const m = db.matches.find(x => x.id === el.dataset.id); if(!m) return;
  SS.put('lufc-template', JSON.stringify({ comp:m.comp, lineup:m.lineup, bench:m.bench }));
  go('#/new');
};
