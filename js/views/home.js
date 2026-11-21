/* Home: season overview, latest match, next fixture, recent form. All figures come from his logged matches. */
import { db, esc, fmtDate, res, sorted, seasonOf, curSeason, seasonLbl, venueTxt } from '../core.js';
import { record } from '../calc.js';
import { nextFixture } from '../importers.js';
import { app } from '../router.js';
import { actions, icon } from '../ui.js';
import { crest } from '../crests.js';

let pick = null;   // season shown: 'All time' or e.g. '2026/27'
const RES = { W: 'Won', D: 'Drawn', L: 'Lost' };
const resultLine = m => [m.et && 'After extra time', m.pens && m.pl !== '' && m.po !== '' && `${+m.pl > +m.po ? 'Won' : 'Lost'} ${m.pl}–${m.po} on penalties`].filter(Boolean).join(' · ');

/* a match "card": crests either side of the score, Leeds on its real side (home/away) */
export function fixtureRow(name1, name2, mid){
  return `<div class="fx-row"><div class="fx-team">${crest(name1, 56)}<b>${esc(name1)}</b></div><div class="fx-mid">${mid}</div><div class="fx-team">${crest(name2, 56)}<b>${esc(name2)}</b></div></div>`;
}

export function homeView(){
  const all = sorted();
  const stage = '<div class="stage" aria-hidden="true"></div>';
  if(!all.length){
    app().innerHTML = `${stage}<div class="home-head"><div><div class="eyebrow">Leeds United</div><h1>Matchday Log</h1></div></div>
      <div class="card mat-panel empty">${icon('ball')}<h2>Welcome</h2><p class="muted">Add the first game you went to – from last weekend or from 1985, it all counts.</p><a class="btn" href="#/new">${icon('plus')} Add a match</a></div>
      <div id="nextfx"></div>`;
    loadNext();
    return;
  }
  const seasons = [...new Set(all.map(m => seasonOf(m.date)))];
  if(!pick || (pick !== 'All time' && !seasons.includes(pick))) pick = seasons.includes(seasonLbl(curSeason())) ? seasonLbl(curSeason()) : seasons[0];
  const ms = pick === 'All time' ? all : all.filter(m => seasonOf(m.date) === pick);
  const r = record(ms), latest = all[0], form = all.slice(0, 5);
  const home = latest.venue !== 'A', lr = res(latest);
  const [n1, n2] = home ? ['Leeds United', latest.opp || 'Opponent'] : [latest.opp || 'Opponent', 'Leeds United'];
  const [s1, s2] = home ? [latest.ls, latest.os] : [latest.os, latest.ls];
  const extra = resultLine(latest);
  app().innerHTML = `${stage}
    <div class="home-head">
      <div><div class="eyebrow">Leeds United</div><h1>Matchday Log</h1></div>
      <select class="pill-select mat-panel" data-change="homeSeason" aria-label="Season shown">${['All time', ...seasons].map(s => `<option value="${s}" ${s === pick ? 'selected' : ''}>${s === 'All time' ? 'All time' : s + ' season'}</option>`).join('')}</select>
    </div>
    <div class="dash">
      <section class="overview mat-panel c-12" aria-label="${esc(pick)} overview">
        <div class="ov-nums">
          <div><b>${r.P}</b><span>Played</span></div><div><b>${r.W}</b><span>Won</span></div><div><b>${r.D}</b><span>Drawn</span></div><div><b>${r.L}</b><span>Lost</span></div>
        </div>
        <div class="ov-more">
          <div class="ring" style="--size:104px" data-p="${r.pct}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="15.5" pathLength="100"/><circle class="val" cx="18" cy="18" r="15.5" pathLength="100"/></svg>
            <div class="lbl"><b>${r.pct}%</b><span>Win rate</span></div></div>
          <dl><div><dt>Scored</dt><dd>${r.F}</dd></div><div><dt>Conceded</dt><dd>${r.A}</dd></div><div><dt>Goal diff.</dt><dd class="${r.GD > 0 ? 'pos' : r.GD < 0 ? 'neg' : ''}">${r.GD > 0 ? '+' : ''}${r.GD}</dd></div></dl>
        </div>
      </section>
      <a class="fixture mat-raised c-7" href="#/match/${latest.id}" aria-label="Latest match: ${esc(fmtDate(latest.date, true))}">
        <div class="panel-head"><h3>Latest match</h3><small>${esc(fmtDate(latest.date))}</small></div>
        ${fixtureRow(n1, n2, `<div class="fx-score">${esc(s1)}–${esc(s2)}</div>${lr ? `<span class="chip ${lr}">${RES[lr]}</span>` : ''}`)}
        <div class="fx-meta">${esc([latest.comp, latest.round].filter(Boolean).join(' · '))}${latest.ground ? ' · ' + esc(latest.ground) : ''}${extra ? `<br>${esc(extra)}` : ''}</div>
      </a>
      <div class="c-5" id="nextfx"><div class="fixture mat-panel"><div class="panel-head"><h3>Next fixture</h3></div><div class="skeleton" style="height:120px"></div></div></div>
      <section class="card mat-panel c-12" style="margin:0" aria-label="Recent form">
        <div class="panel-head"><h3>Recent form</h3><a class="link-more" href="#/matches">All matches ${icon('chevron')}</a></div>
        <div class="form-row">${form.map(m => { const x = res(m); return `<a class="form-dot ${x || ''}" href="#/match/${m.id}" aria-label="${esc(fmtDate(m.date))} v ${esc(m.opp)}: ${RES[x] || 'no result'}" title="${esc(fmtDate(m.date))} v ${esc(m.opp)}">${x || '–'}</a>`; }).join('')}</div>
        <p class="small muted" style="margin:10px 0 0">Your last ${form.length} matches, most recent first.</p>
      </section>
    </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.ring[data-p]').forEach(el => el.style.setProperty('--p', el.dataset.p))));
  loadNext();
}

async function loadNext(){
  const f = await nextFixture(), box = document.getElementById('nextfx');
  if(!box) return;
  if(!f){ const latest = document.querySelector('.dash .fixture.c-7'); if(latest) latest.classList.replace('c-7', 'c-12'); box.remove(); return; }
  const leedsHome = f.venue !== 'A';
  const [n1, n2] = leedsHome ? ['Leeds United', f.opp] : [f.opp, 'Leeds United'];
  const day = new Date(f.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  box.innerHTML = `<div class="fixture mat-panel" style="height:100%">
    <div class="panel-head"><h3>Next fixture</h3><small>${esc(day)}</small></div>
    ${fixtureRow(n1, n2, `<div class="fx-vs">${f.ko ? esc(f.ko) : 'vs'}</div><span class="chip ft" style="background:var(--field);color:var(--text)">${esc(venueTxt(f.venue))}</span>`)}
    <div class="fx-meta">${esc([f.comp, f.round].filter(Boolean).join(' · '))}${f.ground ? ' · ' + esc(f.ground) : ''}</div></div>`;
}
actions.homeSeason = el => { pick = el.value; homeView(); };
