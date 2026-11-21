/* Statistics derived from his logged matches only (nothing invented). */
import { num, res, seasonOf } from './core.js';

export function record(ms){
  const r = { P: 0, W: 0, D: 0, L: 0, F: 0, A: 0 };
  for(const m of ms){ const x = res(m); if(x){ r.P++; r[x]++; } r.F += num(m.ls) || 0; r.A += num(m.os) || 0; }
  r.GD = r.F - r.A; r.pct = r.P ? Math.round(r.W / r.P * 100) : 0;
  return r;
}

export function overall(ms){
  const r = {W:0, D:0, L:0}; let gf = 0, ga = 0, rated = 0, rsum = 0;
  const scorers = {}, apps = {}, opps = {}, grounds = {}, decades = {}, comps = {}, seasons = new Set(), ven = {H:0, A:0, N:0};
  let best = null, worst = null, topRated = null;
  for(const m of ms){
    const x = res(m); if(x) r[x]++;
    gf += num(m.ls) || 0; ga += num(m.os) || 0;
    seasons.add(seasonOf(m.date)); ven[m.venue] = (ven[m.venue] || 0) + 1;
    if(m.rating){ rated++; rsum += +m.rating; if(!topRated || +m.rating > +topRated.rating) topRated = m; }
    (m.goals || []).forEach(g => { if(g.t !== 'O' && g.type !== 'OG' && g.p) scorers[g.p] = (scorers[g.p] || 0) + 1; });
    const seen = new Set(); (m.lineup || []).forEach(p => p.name && seen.add(p.name)); (m.subs || []).forEach(s => s.t !== 'O' && s.on && seen.add(s.on));
    seen.forEach(n => apps[n] = (apps[n] || 0) + 1);
    if(m.opp){ const o = opps[m.opp] = opps[m.opp] || {P:0, W:0, D:0, L:0}; o.P++; if(x) o[x]++; }
    if(m.ground) grounds[m.ground] = (grounds[m.ground] || 0) + 1;
    if(m.comp) comps[m.comp] = (comps[m.comp] || 0) + 1;
    if(m.date){ const d = Math.floor(+m.date.slice(0, 4) / 10) * 10 + 's'; decades[d] = (decades[d] || 0) + 1; }
    if(x){ const diff = num(m.ls) - num(m.os);
      if(diff > 0 && (!best || diff > best.d || (diff === best.d && +m.ls > +best.m.ls))) best = {m, d:diff};
      if(diff < 0 && (!worst || diff < worst.d)) worst = {m, d:diff}; }
  }
  return { r, gf, ga, rated, rsum, scorers, apps, opps, grounds, decades, comps, seasons, ven, best, worst, topRated };
}

/* per-player record of what he has seen them do (Leeds players only) */
export function players(ms){
  const P = {};
  const get = n => P[n] = P[n] || { name: n, apps: 0, starts: 0, subs: 0, goals: 0, assists: 0, yellow: 0, red: 0, cap: 0, last: '', matches: [] };
  for(const m of ms){
    const played = new Set();
    (m.lineup || []).forEach(p => { if(!p.name) return; const x = get(p.name); x.starts++; played.add(p.name); if(p.cap) x.cap++; });
    (m.subs || []).forEach(s => { if(s.t !== 'O' && s.on && !played.has(s.on)){ get(s.on).subs++; played.add(s.on); } });
    (m.goals || []).forEach(g => { if(g.t !== 'O' && g.type !== 'OG' && g.p){ get(g.p).goals++; played.add(g.p); } if(g.t !== 'O' && g.a){ get(g.a).assists++; } });
    (m.cards || []).forEach(c => { if(c.t !== 'O' && c.p){ const x = get(c.p); c.c === 'Yellow' ? x.yellow++ : x.red++; } });
    played.forEach(n => { const x = get(n); x.apps++; x.matches.push(m.id); if((m.date || '') > x.last) x.last = m.date || ''; });
  }
  return Object.values(P).filter(p => p.apps || p.goals || p.assists);
}

/* per-season rows (oldest first) for charts */
export function bySeason(ms){
  const S = {};
  for(const m of ms){ const s = seasonOf(m.date); (S[s] = S[s] || []).push(m); }
  return Object.keys(S).sort().map(s => ({ season: s, ...record(S[s]) }));
}
/* home / away / neutral split with per-game rates */
export function venueSplit(ms){
  const out = {};
  for(const v of ['H', 'A', 'N']){
    const g = ms.filter(m => m.venue === v), r = record(g), rated = g.filter(m => m.rating);
    out[v] = { ...r, n: g.length, gpg: r.P ? r.F / r.P : 0, cpg: r.P ? r.A / r.P : 0, rating: rated.length ? rated.reduce((a, m) => a + +m.rating, 0) / rated.length : null };
  }
  return out;
}
