/* Hash router (works with direct URLs, refresh and back/forward) + coordinated page transitions.
   Uses the View Transitions API where available; the navigation is excluded from the snapshot
   (see app.css) so its highlight glides live while the page content cross-fades. */
import { $, $$, hooks } from './core.js';
import { reducedMotion } from './ui.js';

const ORDER = { home:0, matches:1, new:2, stats:3, squad:4, settings:5 };
export const app = () => $('#app');
let views = {};
export function registerViews(v){ views = v; }

export let curPath = location.hash.slice(1) || '/';
let shown = null, first = true;
/* Back/forward returns to where you were on that page. We manage scroll ourselves so it can be
   restored after the view re-renders (the browser can't, because the page is rebuilt). */
try { history.scrollRestoration = 'manual'; } catch(e){}
const touch = matchMedia('(pointer: coarse)');
const saveScroll = () => { try { history.replaceState({ ...(history.state || {}), y: scrollY }, ''); } catch(e){} };
addEventListener('pagehide', saveScroll);

export function parse(path){
  const [view = '', id = '', ...rest] = path.split('/').filter(Boolean);
  const v = view === 'data' ? 'settings' : view;
  const section = v === '' ? 'home' : (v === 'match' || v === 'edit') ? 'matches' : v;
  return { view: v || 'home', id, rest, section, depth: (v === 'match' || v === 'edit') ? 1 : 0 };
}

export function go(h, opts = {}){
  const p = String(h).replace(/^#/, '') || '/';
  if(p === curPath && !opts.force) return;
  curPath = p;
  if(!opts.replace) saveScroll();
  try { if(location.hash !== '#' + p) history[opts.replace ? 'replaceState' : 'pushState']({ y: 0 }, '', location.pathname + location.search + '#' + p); } catch(e){}
  route();
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="#/"]');
  if(!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault(); go(a.getAttribute('href'));
});
/* Back/forward. On phones the browser has already animated the swipe, so we just swap the page in
   place (no second animation) and put the scroll back where it was. */
function fromLocation(e){
  const h = location.hash.slice(1) || '/';
  if(h === curPath) return;
  curPath = h;
  route(false, { pop: true, y: (e && e.state && e.state.y) || (history.state && history.state.y) || 0 });
}
window.addEventListener('popstate', fromLocation);
window.addEventListener('hashchange', fromLocation);

function direction(next){
  if(!shown) return 'none';
  if(next.section === shown.section) return next.depth > shown.depth ? 'fwd' : next.depth < shown.depth ? 'back' : 'none';
  return (ORDER[next.section] ?? 9) > (ORDER[shown.section] ?? 9) ? 'fwd' : 'back';
}

/* move the glass highlight under the active item (tab bar: horizontally, sidebar: vertically) */
export function placeIndicators(){
  $$('[data-nav]').forEach(nav => {
    const ind = nav.querySelector('.nav-ind'), a = nav.querySelector('a[aria-current="page"]:not(.add)');
    if(!ind) return;
    if(!a || !a.offsetWidth){ ind.classList.add('hide'); return; }
    ind.classList.remove('hide');
    if(nav.dataset.nav === 'tab'){
      const w = Math.min(a.offsetWidth - 6, 86);
      ind.style.width = w + 'px';
      ind.style.transform = `translateX(${a.offsetLeft + (a.offsetWidth - w) / 2}px)`;
    } else {
      ind.style.height = a.offsetHeight + 'px';
      ind.style.transform = `translateY(${a.offsetTop}px)`;
    }
  });
}
addEventListener('resize', () => placeIndicators());

function setNav(section){
  $$('[data-sec]').forEach(a => a.dataset.sec === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  placeIndicators();
}

export function route(keepScroll, nav = {}){
  const next = parse(curPath);
  const dir = direction(next);
  document.documentElement.dataset.dir = dir;
  const render = () => {
    setNav(next.section);
    (views[next.view] || views.home)(next);
    if(!keepScroll) try { window.scrollTo(0, nav.y || 0); } catch(e){}
    shown = next;
  };
  const animate = !first && !keepScroll && !reducedMotion() && !(nav.pop && touch.matches);
  first = false;
  /* View Transitions snapshot elements, which flattens glass (backdrop blur) and clipping on iOS Safari for a
     moment; on touch devices use the CSS fallback instead, which animates the live page. */
  if(animate && document.startViewTransition && !touch.matches){
    /* a quick second tap skips the running transition (its update still runs); that's expected, not an error */
    const t = document.startViewTransition(render);
    [t.ready, t.finished, t.updateCallbackDone].forEach(pr => pr && pr.catch(() => {}));
  } else {
    render();
    if(animate){ const a = app(); a.classList.remove('enter'); void a.offsetWidth; a.classList.add('enter'); }
  }
}
/* re-draw after a change arrives from another device – but never while a match form is open */
export function rerender(){ const v = parse(curPath).view; if(v === 'new' || v === 'edit') return; route(true); }
hooks.rerender = rerender;
