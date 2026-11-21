/* Core: local storage, the match database, deletion tracking and shared helpers.
   localStorage is the working copy; sync.js mirrors it to Firestore when signed in. */

export const KEY = 'lufc-matchday-log-v1';
/* The /next/ preview shares an origin with the live app, so it is always demo-only. */
export const PREVIEW = !!window.MDL_PREVIEW;
export const BASE = PREVIEW ? '../' : '';
/* ?demo loads sample matches into memory only (nothing saved, no Firebase).
   ?demo=empty shows the empty states, ?demo=signedin shows cloud sync switched on. */
export const DEMO = PREVIEW ? (new URLSearchParams(location.search).get('demo') ?? '') : (new URLSearchParams(location.search).get('demo') ?? null);
export let EPHEMERAL = false;

const mem = {};
function mkStore(name){
  let s = null;
  try { s = window[name]; const t = '__t'; s.setItem(t, '1'); s.removeItem(t); } catch(e){ s = null; EPHEMERAL = true; }
  return {
    get: k => { try { return s ? s.getItem(k) : (mem[name + k] ?? null); } catch(e){ return mem[name + k] ?? null; } },
    put: (k, v) => { if(s){ s.setItem(k, v); } else { mem[name + k] = v; } },
    del: k => { try { s ? s.removeItem(k) : delete mem[name + k]; } catch(e){} }
  };
}
export const LS = mkStore('localStorage'), SS = mkStore('sessionStorage');

function load(){
  try { const d = JSON.parse(LS.get(KEY)); if(d && Array.isArray(d.matches)){ d.meta = d.meta || {}; d.tomb = d.tomb || {}; return d; } } catch(e){}
  return { matches: [], meta: {}, tomb: {} };
}
/* `db` is shared by reference; replace its contents with setDb() rather than reassigning. */
export const db = DEMO !== null ? { matches: [], meta: {}, tomb: {} } : load();
export function setDb(d){ db.matches = d.matches; db.meta = d.meta || {}; db.tomb = d.tomb || {}; knownIds = new Set(db.matches.map(m => m.id)); }

/* ids present at the last save, so removed matches can be recorded as deletions (tombstones) and synced */
let knownIds = new Set(db.matches.map(m => m.id));
export function resetKnownIds(ids){ knownIds = new Set(ids); }
function trackDeletes(){
  const now = new Set(db.matches.map(m => m.id)), t = new Date().toISOString();
  knownIds.forEach(id => { if(!now.has(id)) db.tomb[id] = t; });
  now.forEach(id => delete db.tomb[id]);
  knownIds = now;
}
export function saveLocal(){
  if(DEMO !== null) return true;
  try { LS.put(KEY, JSON.stringify(db)); return true; }
  catch(e){ import('./ui.js').then(u => u.notice('Couldn\'t save on this device', 'The browser refused to store the match (' + e.message + ').\n\nPlease download a backup file from Settings so nothing is lost.')); return false; }
}
/* hooks filled in by other modules (avoids circular imports) */
export const hooks = { afterSave: () => {}, rerender: () => {} };
export function save(){
  trackDeletes();
  const ok = saveLocal();
  hooks.afterSave();
  return ok;
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch(e){}

/* ---------- helpers ---------- */
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
export function seasonOf(d){ if(!d) return 'Undated'; const [y, m] = d.split('-').map(Number); const s = m >= 7 ? y : y - 1; return s + '/' + String(s + 1).slice(-2); }
export function minVal(t){ const m = String(t || '').match(/(\d+)(?:\s*\+\s*(\d+))?/); return m ? (+m[1]) + (m[2] ? +m[2] / 100 : 0) : 999; }
export function minTxt(t){ t = String(t || '').trim(); if(!t) return ''; return /'$/.test(t) ? t : t + "'"; }
export function fmtDate(d, long){ if(!d) return 'No date'; const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('en-GB', long ? {weekday:'long', day:'numeric', month:'long', year:'numeric'} : {weekday:'short', day:'numeric', month:'short', year:'numeric'}); }
export function res(m){ const l = num(m.ls), o = num(m.os); if(l == null || o == null) return null; return l > o ? 'W' : l < o ? 'L' : 'D'; }
export function penNote(m){ if(!m.pens || num(m.pl) == null || num(m.po) == null) return ''; return (+m.pl > +m.po ? 'Leeds won ' : 'Leeds lost ') + m.pl + '–' + m.po + ' on penalties'; }
export const venueTxt = v => ({H:'Home', A:'Away', N:'Neutral'})[v] || '';
export function sides(m){
  const L = {name:'Leeds United', s:m.ls, leeds:true}, O = {name:m.opp || 'Opponent', s:m.os, leeds:false};
  return m.venue === 'A' ? [O, L] : [L, O];
}
export function scoreTxt(m){ const [a, b] = sides(m); const has = a.s !== '' && a.s != null && b.s !== '' && b.s != null; return `${a.name} ${has ? a.s + '–' + b.s : 'v'} ${b.name}`; }
export const sorted = () => [...db.matches].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ko || '').localeCompare(a.ko || ''));
export const seasonStart = d => { const [y, mo] = d.split('-').map(Number); return mo >= 7 ? y : y - 1; };
export const curSeason = () => seasonStart(new Date().toISOString().slice(0, 10));
export const seasonLbl = y => y + '/' + String(y + 1).slice(-2);
