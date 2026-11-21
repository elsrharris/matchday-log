/* Shared UI: icon set, delegated actions (no inline handlers / globals), small helpers. */

const P = {
  home: '<path d="M3.5 10.6 12 3.5l8.5 7.1V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6H9.2v5.6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  matches: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4M7.5 13.5h3M7.5 16.8h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  stats: '<path d="M5 20.5v-8M12 20.5v-15M19 20.5v-11"/>',
  squad: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.8-3.5 3.3-5.4 6.2-5.4s5.4 1.9 6.2 5.4"/><circle cx="17.2" cy="9.2" r="2.5"/><path d="M16.4 14.7c2.5.2 4.1 1.9 4.8 4.8"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.7 7.7 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  chevron: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  back: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5z"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7.6 3.2 2.3-1.2 3.8h-4l-1.2-3.8zM12 7.6V3.6M15.2 9.9l3.9-1.3M14 13.7l2.4 3.3M10 13.7l-2.4 3.3M8.8 9.9 4.9 8.6"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  people: '<circle cx="12" cy="8" r="3.3"/><path d="M5.5 20c.7-3.4 3.3-5.3 6.5-5.3s5.8 1.9 6.5 5.3"/>',
  whistle: '<circle cx="9" cy="14" r="5"/><path d="M13 10.5 20.5 6v4.5L14 13M9 14h.01"/>',
  trophy: '<path d="M8 4h8v4.5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12.5V17M8.5 20h7M10 17h4"/>',
  sub: '<path d="M7 20V7M3.5 10.5 7 7l3.5 3.5M17 4v13M13.5 13.5 17 17l3.5-3.5"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
};
export const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

/* delegated actions: data-act="name" on clickable elements, data-change="name" on inputs */
export const actions = {};
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-act]');
  if(el && actions[el.dataset.act]){ e.preventDefault(); actions[el.dataset.act](el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest && e.target.closest('[data-change]');
  if(el && actions[el.dataset.change]) actions[el.dataset.change](el, e);
});

/* club crests (ESPN logo CDN). Missing or unknown → initials disc. */
export const LEEDS_CREST = 'https://a.espncdn.com/i/teamlogos/soccer/500/357.png';
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* animate charts once when they scroll into view (adds .in; CSS does the motion) */
export function revealOnView(root = document){
  const els = [...root.querySelectorAll('.reveal:not(.in)')];
  if(!('IntersectionObserver' in window)){ els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .15 });
  els.forEach(e => io.observe(e));
}

/* chart tooltip: hover with a mouse, tap on touch. Elements carry their text in data-tip. */
let tipEl = null;
function tip(){ if(!tipEl){ tipEl = document.createElement('div'); tipEl.className = 'tip mat-raised'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); } return tipEl; }
function showTip(el, x, y){
  const t = tip(); t.textContent = el.dataset.tip; t.classList.add('on');
  const r = t.getBoundingClientRect(), pad = 10;
  t.style.left = Math.min(innerWidth - r.width - pad, Math.max(pad, x - r.width / 2)) + 'px';
  t.style.top = Math.max(pad, y - r.height - 14) + 'px';
}
export function hideTip(){ if(tipEl) tipEl.classList.remove('on'); }
document.addEventListener('pointermove', e => {
  if(e.pointerType !== 'mouse') return;
  const el = e.target.closest && e.target.closest('[data-tip]');
  el ? showTip(el, e.clientX, e.clientY) : hideTip();
});
document.addEventListener('pointerdown', e => {
  if(e.pointerType === 'mouse') return;
  const el = e.target.closest && e.target.closest('[data-tip]');
  if(el){ const r = el.getBoundingClientRect(); showTip(el, e.clientX || r.left + r.width / 2, r.top); } else hideTip();
});
addEventListener('scroll', hideTip, { passive: true });
addEventListener('hashchange', hideTip);

/* small confirmation toast ("Match saved"); announced to screen readers */
let toastEl = null, toastT = 0;
export function toast(msg){
  if(!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'toast mat-raised'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
  toastEl.innerHTML = `${icon('check')}<span></span>`; toastEl.querySelector('span').textContent = msg;
  toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400);
}

/* ---------- glass sheet (replaces alert / confirm / prompt) ----------
   A bottom sheet on phones, a centred dialog on desktop. Built on <dialog>.showModal(), so focus is
   trapped, the page behind is inert, and Esc / tapping the backdrop cancels. Resolves with the chosen
   action's value (or null when dismissed); with `input`, resolves with { value, text }.
     sheet({ title, message, actions: [{ label, value, style: 'primary'|'secondary'|'danger' }], input, icon }) */
export function sheet({ title = '', message = '', actions = [{ label: 'OK', value: true, style: 'primary' }], input = null, tone = '' } = {}){
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'sheet mat-raised' + (tone ? ' ' + tone : '');
    const id = 'sh' + Math.random().toString(36).slice(2, 7);
    d.setAttribute('aria-labelledby', id + 't');
    if(message) d.setAttribute('aria-describedby', id + 'm');
    d.innerHTML = `<div class="sheet-grab" aria-hidden="true"></div>
      ${title ? `<h2 id="${id}t">${escHtml(title)}</h2>` : ''}
      ${message ? `<div class="sheet-msg" id="${id}m">${String(message).split('\n\n').map(p => `<p>${escHtml(p)}</p>`).join('')}</div>` : ''}
      ${input ? `<label class="f">${escHtml(input.label || '')}<input class="sheet-in" ${input.type ? `type="${input.type}"` : ''} autocomplete="off" autocapitalize="characters" placeholder="${escHtml(input.placeholder || '')}"></label>` : ''}
      <div class="sheet-acts">${actions.map((a, i) => `<button type="button" class="btn ${a.style === 'danger' ? 'danger-solid' : a.style === 'secondary' ? 'sec' : ''}" data-i="${i}">${escHtml(a.label)}</button>`).join('')}</div>`;
    document.body.appendChild(d);
    let done = false;
    const finish = value => {
      if(done) return; done = true;
      const text = input ? d.querySelector('.sheet-in').value : undefined;
      d.classList.remove('on');
      const close = () => { try { d.close(); } catch(e){} d.remove(); resolve(input ? { value, text } : value); };
      reducedMotion() ? close() : setTimeout(close, 220);
    };
    d.addEventListener('click', e => {
      const b = e.target.closest('button[data-i]');
      if(b){ const a = actions[+b.dataset.i]; if(a.needs && d.querySelector('.sheet-in').value.trim() !== a.needs){ d.querySelector('.sheet-in').setAttribute('aria-invalid', 'true'); d.querySelector('.sheet-in').focus(); return; } finish(a.value); return; }
      if(e.target === d) finish(null);              // backdrop
    });
    d.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
    d.showModal();
    requestAnimationFrame(() => d.classList.add('on'));
    /* focus: the text box if there is one, otherwise the safe choice (the non-destructive button) */
    const safe = input ? d.querySelector('.sheet-in') : (d.querySelector('.btn.sec') || d.querySelector('.btn'));
    safe && safe.focus();
  });
}
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* simple message with one button */
export const notice = (title, message) => sheet({ title, message, actions: [{ label: 'OK', value: true, style: 'primary' }] });
