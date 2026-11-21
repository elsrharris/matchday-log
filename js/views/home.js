/* Home dashboard (first version; finished in the core-screens phase). */
import { db, esc, fmtDate, res, sides, sorted, seasonOf } from '../core.js';
import { record } from '../calc.js';
import { app } from '../router.js';
import { actions, icon } from '../ui.js';

let pick = null;   // season shown ('All time' or e.g. '2026/27')

export function homeView(){
  const all = sorted();
  if(!all.length){
    app().innerHTML = `<div class="page-head"><div><h1>Matchday Log</h1><p>Every Leeds United game I've been to</p></div></div>
      <div class="card mat-panel empty">${icon('ball')}<h2>Welcome</h2><p class="muted">Add the first game you went to – from last weekend or from 1985, it all counts.</p><a class="btn" href="#/new">${icon('plus')} Add a match</a></div>`;
    return;
  }
  const seasons = [...new Set(all.map(m => seasonOf(m.date)))];
  if(!pick || (pick !== 'All time' && !seasons.includes(pick))) pick = seasons[0];
  const ms = pick === 'All time' ? all : all.filter(m => seasonOf(m.date) === pick);
  const r = record(ms), latest = all[0], form = all.slice(0, 5);
  const [a, b] = sides(latest), lr = res(latest);
  app().innerHTML = `
    <div class="page-head"><div><h1>Matchday Log</h1><p>Every Leeds United game I've been to</p></div>
      <select data-change="homeSeason" aria-label="Season" style="width:auto;flex:none">${['All time', ...seasons].map(s => `<option ${s === pick ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="home-grid">
      <div class="span">
        <div class="tiles">
          <div class="tile mat-panel"><b>${r.P}</b><span>Played</span></div>
          <div class="tile mat-panel"><b>${r.W}</b><span>Won</span></div>
          <div class="tile mat-panel"><b>${r.D}</b><span>Drawn</span></div>
          <div class="tile mat-panel"><b>${r.L}</b><span>Lost</span></div>
          <div class="tile mat-panel"><b>${r.pct}%</b><span>Win rate</span></div>
          <div class="tile mat-panel"><b>${r.GD > 0 ? '+' : ''}${r.GD}</b><span>Goal difference</span></div>
        </div>
      </div>
      <a class="card mat-raised hero" href="#/match/${latest.id}" style="text-decoration:none;color:inherit;margin:0">
        <div class="meta">Latest match · ${fmtDate(latest.date)}${latest.comp ? ' · ' + esc(latest.comp) : ''}</div>
        <div class="teams"><div class="tm">${esc(a.name)}</div><div class="sc">${esc(a.s)}–${esc(b.s)}</div><div class="tm">${esc(b.name)}</div></div>
        ${lr ? `<span class="badge ${lr}" style="display:inline-grid;width:auto;padding:0 14px;height:28px;border-radius:14px;font-size:.8rem">${{W:'Won', D:'Drawn', L:'Lost'}[lr]}</span>` : ''}
      </a>
      <div class="card mat-panel" style="margin:0"><h3>Recent form <span class="small muted" style="text-transform:none;letter-spacing:0">last ${form.length}</span></h3>
        <div class="form-dots">${form.map(m => { const x = res(m); return `<a class="badge ${x || ''}" href="#/match/${m.id}" title="${esc(fmtDate(m.date))} v ${esc(m.opp)}">${x || '–'}</a>`; }).join('')}</div>
        <p class="small muted" style="margin:12px 0 0">Most recent first.</p>
      </div>
    </div>`;
}
actions.homeSeason = el => { pick = el.value; homeView(); };
