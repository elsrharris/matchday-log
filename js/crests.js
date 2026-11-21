/* Club crests from ESPN's logo CDN, matched by club name (data/crests.json, built by tools/crests/build.py).
   Clubs ESPN doesn't know (defunct / non-league) get a monogram disc. Images are resized by ESPN's
   image service so a crest is a few KB. */
import { BASE, esc } from './core.js';

const DROP = new Set(['fc','afc','cf','cs','sc','ss','as','ac','sv','sk','fk','cd','rc','ud','sl','bk','if','the','and']);
let map = {};
export async function loadCrests(){ try { map = await (await fetch(BASE + 'data/crests.json')).json(); } catch(e){ map = {}; } }

const norm = n => String(n || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !DROP.has(w)).join(' ');
export const crestId = name => /^leeds( united)?$/i.test(String(name || '').trim()) ? '357' : map[norm(name)] || null;
export const crestUrl = (id, px = 96) => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${id}.png&h=${px}&w=${px}`;
const initials = n => String(n || '?').replace(/\b(FC|AFC|United|City|Town|Athletic|Rovers|Wanderers|Albion)\b/gi, m => m[0]).split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();

/* size in CSS px; the image is fetched at 2× for sharp rendering. In dark mode ESPN's dark-background version
   is tried first (navy crests like Spurs' vanish on dark glass), then the standard one, then a monogram. */
export function crest(name, size = 40, cls = ''){
  const id = crestId(name), mono = initials(name);
  if(!id) return `<span class="crest mono ${cls}" style="--cs:${size}px" aria-hidden="true">${esc(mono)}</span>`;
  const px = Math.min(500, size * 2), dark = document.documentElement.dataset.theme !== 'light';
  const std = crestUrl(id, px), src = dark ? std.replace('/500/', '/500-dark/') : std;
  return `<img class="crest ${cls}" style="--cs:${size}px" src="${src}" ${dark ? `data-alt="${std}"` : ''} data-mono="${esc(mono)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
}
/* image errors don't bubble, so listen in the capture phase */
document.addEventListener('error', e => {
  const img = e.target;
  if(!(img instanceof HTMLImageElement) || !img.classList.contains('crest')) return;
  if(img.dataset.alt){ const a = img.dataset.alt; delete img.dataset.alt; img.src = a; return; }
  const s = document.createElement('span');
  s.className = img.className + ' mono'; s.style.cssText = img.style.cssText; s.textContent = img.dataset.mono || '?'; s.setAttribute('aria-hidden', 'true');
  img.replaceWith(s);
}, true);
