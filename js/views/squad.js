/* Squad: the Leeds players he has seen, from his logged matches (first version). */
import { db, esc } from '../core.js';
import { players } from '../calc.js';
import { app } from '../router.js';
import { icon } from '../ui.js';

let q = '';
const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

export function squadView(){
  const ps = players(db.matches).sort((a, b) => b.apps - a.apps || b.goals - a.goals || a.name.localeCompare(b.name));
  if(!ps.length){
    app().innerHTML = `<div class="page-head"><div><h1>Squad</h1></div></div><div class="card mat-panel empty">${icon('squad')}<p class="muted">Players appear here once you've logged matches with line-ups.</p></div>`;
    return;
  }
  app().innerHTML = `
    <div class="page-head"><div><h1>Squad</h1><p>${ps.length} Leeds players I've seen</p></div></div>
    <div class="filters" style="grid-template-columns:1fr"><input id="pq" type="search" placeholder="Search players…" value="${esc(q)}" aria-label="Search players"></div>
    <div class="plist mat-panel" id="plist"></div>`;
  const draw = () => {
    const t = q.toLowerCase(), list = ps.filter(p => !t || p.name.toLowerCase().includes(t));
    document.getElementById('plist').innerHTML = list.slice(0, 300).map(p => `
      <div class="pl"><span class="av" aria-hidden="true">${esc(initials(p.name))}</span>
        <div class="mid"><b>${esc(p.name)}</b><small>Last seen ${esc((p.last || '').slice(0, 4))}${p.cap ? ` · captain ${p.cap}×` : ''}</small></div>
        <div class="nums"><div><b>${p.apps}</b><span>Games</span></div><div><b>${p.goals}</b><span>Goals</span></div><div><b>${p.assists}</b><span>Assists</span></div></div></div>`).join('')
      || '<p class="muted" style="padding:16px">No players match.</p>';
  };
  document.getElementById('pq').oninput = e => { q = e.target.value; draw(); };
  draw();
}
