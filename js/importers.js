/* Match data importers: ESPN's public JSON API (2001/02 onwards) and the bundled
   Leeds United Historical Archive data (1979/80–2000/01). Both turn a source match into
   this app's match fields; neither touches the review fields. */
import { BASE, minVal } from './core.js';

/* ---------- match finder (ESPN public data, 2001/02 onwards) ---------- */
export const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', LEEDS_ID = '357', ESPN_FIRST = 2001;
export const espnCache = {};
export async function espnJSON(path){
  if(espnCache[path]) return espnCache[path];
  const r = await fetch(ESPN + path);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return espnCache[path] = await r.json();
}
export async function espnSeason(y){
  const d = await espnJSON(`all/teams/${LEEDS_ID}/schedule?season=${y}`);
  return (d.events || []).filter(e => e.competitions?.[0]?.status?.type?.completed);
}
export function londonParts(iso){
  const p = {}; new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false})
    .formatToParts(new Date(iso)).forEach(x => p[x.type] = x.value);
  return { date: `${p.year}-${p.month}-${p.day}`, ko: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
export function tidyRound(r){
  r = String(r || '').trim(); if(!r) return '';
  const ord = n => n + (['th','st','nd','rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');
  const words = {first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7};
  let x;
  if((x = r.match(/^round\s*(\d+)$/i))) return ord(+x[1]) + ' round';
  if((x = r.match(/^(\d+)(?:st|nd|rd|th)\s+round$/i))) return ord(+x[1]) + ' round';
  if((x = r.match(/^(\w+)\s+round$/i)) && words[x[1].toLowerCase()]) return ord(words[x[1].toLowerCase()]) + ' round';
  if(/^semi-?finals?$/i.test(r)) return 'Semi-final';
  if(/^quarter-?finals?$/i.test(r)) return 'Quarter-final';
  if(/^finals?$/i.test(r)) return 'Final';
  return r;
}
export function espnComp(ev){
  const slug = ev.league?.slug || '', st = ev.seasonType?.name || '';
  const names = {'eng.1':'Premier League','eng.2':'Championship','eng.3':'League One','eng.fa':'FA Cup','eng.league_cup':'League Cup','eng.charity':'Community Shield','club.friendly':'Friendly','uefa.uefa':'UEFA Cup','uefa.europa':'Europa League','uefa.champions':'Champions League','uefa.europa.conf':'Conference League','eng.trophy':'EFL Trophy'};
  let comp = names[slug] || String(ev.league?.name || '').replace(/^English\s+/, ''), round = '';
  if(/^eng\.[1-4]$/.test(slug)){ if(st && !/regular season|league/i.test(st)){ comp = 'Play-off'; round = st.replace(/^promotion\s*/i, ''); } }
  else if(slug !== 'club.friendly') round = st;
  return { comp, round: tidyRound(round) };
}
export function espnSides(ev){
  const cs = ev.competitions[0].competitors;
  const L = cs.find(c => c.team?.id === LEEDS_ID) || cs[0], O = cs.find(c => c !== L);
  const sc = c => { const v = c?.score; return v == null ? '' : String(typeof v === 'object' ? (v.displayValue ?? v.value) : v); };
  const ground = ev.competitions[0].venue?.fullName || '';
  // ESPN doesn't always flag neutral grounds (e.g. play-off finals at Wembley)
  const neutral = ev.competitions[0].neutralSite || /wembley|millennium stadium|principality stadium/i.test(ground) || (L.homeAway === 'home' && ground && !/elland road/i.test(ground));
  return { L, O, ls: sc(L), os: sc(O), venue: neutral ? 'N' : L.homeAway === 'home' ? 'H' : 'A' };
}
/* turn ESPN's schedule entry + match summary into this app's match fields */
export function espnToMatch(ev, sum, prev){
  const c = ev.competitions[0], { L, O, ls, os, venue } = espnSides(ev), { comp, round } = espnComp(ev), when = londonParts(ev.date);
  const gi = sum?.gameInfo || {}, st = c.status?.type?.name || '';
  const out = { espnId: ev.id, espnLg: ev.league?.slug || '', date: when.date, ko: ev.timeValid === false ? '' : when.ko, comp, round,
    opp: O?.team?.displayName || '', venue, ground: gi.venue?.fullName || c.venue?.fullName || '', att: String(gi.attendance || c.attendance || '') .replace(/^0$/, ''),
    ref: gi.officials?.[0]?.fullName || '', ls, os, htl:'', hto:'', ftl:'', fto:'', pl:'', po:'', et:false, pens:false,
    goals:[], subs:[], cards:[], lineup:[], bench:[], oppXI:'', formation:'' };
  const side = id => id === LEEDS_ID ? 'L' : 'O', min = cl => String(cl?.displayValue || '').replace(/'/g, '').trim();
  const booked = new Set();
  for(const k of (sum?.keyEvents || [])){
    const t = k.type?.text || '', ps = (k.participants || []).map(p => p.athlete?.displayName || '');
    if(/shootout/i.test(t)) break;
    if(/extra time/i.test(t)) out.et = true;
    if(!k.team?.id) continue;
    if((k.scoringPlay || /^(goal|own goal|penalty - scored)/i.test(t)) && !/miss|saved/i.test(t)){
      const type = /own/i.test(t) ? 'OG' : /penalty/i.test(t) ? 'Pen' : /header/i.test(t) ? 'Header' : /free.?kick/i.test(t) ? 'Free kick' : /volley/i.test(t) ? 'Volley' : '';
      out.goals.push({ min: min(k.clock), t: side(k.team.id), p: ps[0] || '', type, a: type === 'OG' || type === 'Pen' ? '' : (ps[1] || '') });
    } else if(/substitution/i.test(t)){
      out.subs.push({ min: min(k.clock), t: side(k.team.id), off: ps[1] || '', on: ps[0] || '' });
    } else if(/card/i.test(t)){
      const who = ps[0] || '', red = /red/i.test(t);
      const kind = red ? ((/yellow|second/i.test(t) || booked.has(who)) ? '2nd yellow' : 'Red') : 'Yellow';
      if(!red) booked.add(who);
      out.cards.push({ min: min(k.clock), t: side(k.team.id), p: who, c: kind });
    }
  }
  if(/AET/.test(st)) out.et = true;
  if(/PEN/.test(st) || sum?.shootout?.length){
    out.pens = true;
    const so = sum?.shootout || [], n = id => { const s = so.find(x => String(x.id) === id); return s ? String(s.shots.filter(x => x.didScore).length) : ''; };
    out.pl = n(LEEDS_ID); out.po = n(O?.team?.id);
  }
  // half-time (and 90-minute) scores: from ESPN's period scores, else from the goals if the goal list is complete
  const hc = sum?.header?.competitions?.[0]?.competitors || [], ln = id => hc.find(x => x.team?.id === id)?.linescores?.[0]?.displayValue;
  const complete = out.goals.filter(g => g.t === 'L').length === +ls && out.goals.filter(g => g.t === 'O').length === +os;
  if(ln(LEEDS_ID) != null && ln(O?.team?.id) != null){ out.htl = String(ln(LEEDS_ID)); out.hto = String(ln(O.team.id)); }
  else if(complete){ const h = out.goals.filter(g => minVal(g.min) < 46); out.htl = String(h.filter(g => g.t === 'L').length); out.hto = String(h.filter(g => g.t === 'O').length); }
  if(out.et && complete){ const n = out.goals.filter(g => minVal(g.min) < 91); out.ftl = String(n.filter(g => g.t === 'L').length); out.fto = String(n.filter(g => g.t === 'O').length); }
  // line-ups
  const ros = sum?.rosters || [], RL = ros.find(r => r.team?.id === LEEDS_ID), RO = ros.find(r => r !== RL);
  const caps = new Set((prev?.lineup || []).filter(p => p.cap).map(p => p.name));
  const starters = r => { const s = (r?.roster || []).filter(p => p.starter); return s.every(p => +p.formationPlace > 0) ? s.sort((a, b) => a.formationPlace - b.formationPlace) : s; };
  if(RL){
    out.formation = RL.formation || '';
    out.lineup = starters(RL).map(p => ({ n: p.jersey || '', name: p.athlete?.displayName || '', cap: caps.has(p.athlete?.displayName) }));
    out.bench = RL.roster.filter(p => !p.starter).map(p => ({ n: p.jersey || '', name: p.athlete?.displayName || '' }));
  }
  if(RO){
    const xi = starters(RO).map(p => `${p.jersey ? p.jersey + ' ' : ''}${p.athlete?.displayName || ''}`), sb = RO.roster.filter(p => !p.starter).map(p => p.athlete?.displayName).filter(Boolean);
    out.oppXI = xi.join('\n') + (RO.formation ? `\n(${RO.formation})` : '') + (sb.length ? `\nSubs: ${sb.join(', ')}` : '');
  }
  return out;
}

/* Older seasons (1979/80–2000/01) come from data files in this repo, built from the
   Leeds United Historical Archive (lufchistory.com). From 2001/02 the data comes from ESPN. */
export const HIST_FIRST = 1979;
export async function histSeason(y){
  const k = 'hist:' + y;
  if(espnCache[k]) return espnCache[k];
  const r = await fetch(`${BASE}data/history/${y}.json`);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return espnCache[k] = await r.json();
}
/* one shape for the finder list, whichever source the match came from */
export function fxFromEspn(ev){
  const { O, ls, os, venue } = espnSides(ev), { comp, round } = espnComp(ev);
  return { key: 'e' + ev.id, src: 'espn', ev, date: londonParts(ev.date).date, opp: O?.team?.displayName || '', venue, ls, os, comp, round };
}
export const fxFromHist = h => ({ key: 'h' + h.srcPath, src: 'hist', h, date: h.date, opp: h.opp, venue: h.venue, ls: h.ls, os: h.os, comp: h.comp, round: h.round });
export async function seasonFixtures(y){
  return y >= ESPN_FIRST ? (await espnSeason(y)).map(fxFromEspn) : (await histSeason(y)).map(fxFromHist);
}
export function histToMatch(h, prev){
  const caps = new Set((prev?.lineup || []).filter(p => p.cap).map(p => p.name));
  const keep = x => ({ ...x, cap: x.cap || caps.has(x.name) });
  return { espnId:'', espnLg:'', histId: h.srcPath, date: h.date, ko: '', comp: h.comp, round: h.round || '', opp: h.opp, venue: h.venue, ground: h.ground || '',
    att: h.att || '', ref: h.ref || '', manager: h.manager || '', ls: h.ls, os: h.os, htl: h.htl || '', hto: h.hto || '', ftl: '', fto: '',
    et: !!h.et, pens: !!h.pens, pl: h.pl || '', po: h.po || '', formation: '', oppXI: '',
    goals: (h.goals || []).map(g => ({...g})), subs: (h.subs || []).map(x => ({...x})), cards: (h.cards || []).map(x => ({...x})),
    lineup: (h.lineup || []).map(keep), bench: (h.bench || []).map(keep),
    notes: h.notes && !String(prev?.notes || '').includes(h.notes) ? [prev?.notes, h.notes].filter(Boolean).join('\n') : (prev?.notes || '') };
}


/* Leeds' next fixture (all competitions), cached for 30 minutes in this tab. Returns null if unknown/offline. */
export async function nextFixture(){
  const K = 'mdl-next-fixture';
  try { const c = JSON.parse(sessionStorage.getItem(K) || 'null'); if(c && Date.now() - c.t < 30 * 60e3) return c.f; } catch(e){}
  try {
    const d = await espnJSON(`all/teams/${LEEDS_ID}/schedule?fixture=true`);
    const now = Date.now();
    const ev = (d.events || []).filter(e => new Date(e.date).getTime() > now - 2 * 3600e3 && !e.competitions?.[0]?.status?.type?.completed)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    let f = null;
    if(ev){
      const { O, venue } = espnSides(ev), { comp, round } = espnComp(ev), when = londonParts(ev.date);
      f = { id: ev.id, date: when.date, ko: ev.timeValid === false ? '' : when.ko, opp: O?.team?.displayName || '', venue, comp, round, ground: ev.competitions[0].venue?.fullName || '' };
    }
    try { sessionStorage.setItem(K, JSON.stringify({ t: Date.now(), f })); } catch(e){}
    return f;
  } catch(e){ return null; }
}
