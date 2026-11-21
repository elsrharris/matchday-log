/* Overall statistics (all existing stats kept; visual redesign comes in a later phase). */
import { db, esc, fmtDate, scoreTxt } from '../core.js';
import { overall } from '../calc.js';
import { app } from '../router.js';
import { icon } from '../ui.js';

export function statsView(){
  const ms = db.matches;
  if(!ms.length){ app().innerHTML = `<div class="page-head"><div><h1>Statistics</h1></div></div><div class="card mat-panel empty">${icon('stats')}<p class="muted">Stats appear once you've added some matches.</p></div>`; return; }
  const { r, gf, ga, rated, rsum, scorers, apps, opps, grounds, decades, comps, seasons, ven, best, worst, topRated } = overall(ms);
  const P = r.W + r.D + r.L;
  const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
  const rank = (rows, unit) => rows.length ? `<table class="rank">${rows.map(([k, v], i) => `<tr><td class="p">${i + 1}</td><td>${esc(k)}</td><td class="n">${v}${unit ? ' ' + (v === 1 ? unit.replace(/s$/, '') : unit) : ''}</td></tr>`).join('')}</table>` : '<p class="muted small">Nothing recorded yet.</p>';
  const dmax = Math.max(...Object.values(decades), 1);
  const link = (m, lbl) => m ? `<a href="#/match/${m.id}">${lbl}</a> <span class="muted small">${fmtDate(m.date)}</span>` : '–';
  const first = [...ms].filter(m => m.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  app().innerHTML = `
    <div class="page-head"><div><h1>Statistics</h1><p>My Leeds record</p></div></div>
    <div class="tiles">
      <div class="tile mat-panel"><b>${ms.length}</b><span>Games</span></div>
      <div class="tile mat-panel"><b>${seasons.size}</b><span>Seasons</span></div>
      <div class="tile mat-panel"><b>${Object.keys(grounds).length}</b><span>Grounds</span></div>
      <div class="tile mat-panel"><b>${gf}</b><span>Leeds goals</span></div>
      <div class="tile mat-panel"><b>${ga}</b><span>Conceded</span></div>
      <div class="tile mat-panel"><b>${P ? Math.round(r.W / P * 100) : 0}%</b><span>Win rate</span></div>
    </div>
    <div class="card mat-panel"><h3>Won ${r.W} · Drawn ${r.D} · Lost ${r.L}</h3>
      <div class="wdl">${P ? `<i style="width:${r.W / P * 100}%;background:var(--win)"></i><i style="width:${r.D / P * 100}%;background:var(--draw)"></i><i style="width:${r.L / P * 100}%;background:var(--loss)"></i>` : ''}</div>
      <p class="small muted" style="margin:6px 0 0">Home ${ven.H || 0} · Away ${ven.A || 0} · Neutral ${ven.N || 0}${rated ? ` · Average rating ${(rsum / rated).toFixed(1)}/10` : ''}</p>
    </div>
    <div class="card mat-panel"><h3>Highlights</h3><dl class="kv">
      <dt>Biggest win</dt><dd>${best ? link(best.m, esc(scoreTxt(best.m))) : '–'}</dd>
      <dt>Heaviest defeat</dt><dd>${worst ? link(worst.m, esc(scoreTxt(worst.m))) : '–'}</dd>
      <dt>Top-rated game</dt><dd>${topRated ? link(topRated, esc(scoreTxt(topRated)) + ' (' + esc(topRated.rating) + '/10)') : '–'}</dd>
      <dt>First game logged</dt><dd>${first ? link(first, esc(scoreTxt(first))) : '–'}</dd>
    </dl></div>
    <div class="stats-cols"><div>
      <div class="card mat-panel"><h3>Goals I've seen – top scorers</h3>${rank(top(scorers), '')}</div>
      <div class="card mat-panel"><h3>Games by decade</h3>${Object.keys(decades).sort().map(d => `<div class="bar"><span class="lb">${d}</span><span class="tr"><i style="width:${decades[d] / dmax * 100}%"></i></span><span class="v">${decades[d]}</span></div>`).join('')}</div>
      <div class="card mat-panel"><h3>Grounds visited</h3>${rank(top(grounds, 999), '')}</div>
    </div><div>
      <div class="card mat-panel"><h3>Players I've seen play most</h3>${rank(top(apps), 'games')}</div>
      <div class="card mat-panel"><h3>Opponents</h3>${Object.keys(opps).length ? `<table class="rank">${Object.entries(opps).sort((a, b) => b[1].P - a[1].P || a[0].localeCompare(b[0])).map(([k, o]) => `<tr><td>${esc(k)}</td><td class="n">${o.P} <span class="muted small" style="font-weight:400">W${o.W} D${o.D} L${o.L}</span></td></tr>`).join('')}</table>` : '<p class="muted small">–</p>'}</div>
      <div class="card mat-panel"><h3>Competitions</h3>${rank(top(comps, 999), '')}</div>
    </div></div>`;
}
