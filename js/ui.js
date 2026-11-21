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
