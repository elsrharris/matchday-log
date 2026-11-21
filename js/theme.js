/* Appearance: 'dark' (default) | 'light' | 'system'. The first paint is handled by the inline
   script in index.html so there is never a flash of the wrong theme; this keeps it in step later. */
const KEY = 'mdl-theme';
const media = matchMedia('(prefers-color-scheme: light)');
export function getPref(){ try { return localStorage.getItem(KEY) || 'dark'; } catch(e){ return 'dark'; } }
export function resolved(pref = getPref()){ return pref === 'system' ? (media.matches ? 'light' : 'dark') : pref; }
export function applyTheme(){
  const t = resolved();
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = t === 'light' ? '#F3F6FA' : '#080F1D';
}
export function setPref(p){ try { localStorage.setItem(KEY, p); } catch(e){} applyTheme(); }
media.addEventListener('change', () => { if(getPref() === 'system') applyTheme(); });
