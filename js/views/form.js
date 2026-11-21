/* Add / Edit match form, with the match finder. Field names and saved shape are unchanged. */
import { db, DEMO, SS, save, $, $$, esc, uid, fmtDate, venueTxt, minVal, scoreTxt, sorted, seasonStart, curSeason, seasonLbl } from '../core.js';
import { HIST_FIRST, seasonFixtures, histToMatch, espnJSON, espnToMatch } from '../importers.js';
import { go, app } from '../router.js';
import { actions, icon, toast, sheet } from '../ui.js';

export const ROWDEF = {
  lineup: [['n','#','num'],['name','Player','txt'],['cap','C','chk']],
  bench:  [['n','#','num'],['name','Player','txt']],
  goals:  [['min','Min','min'],['t','','team'],['p','Scorer','txt'],['type','','sel',['','Pen','OG','Header','Free kick','Volley']],['a','Assist (optional)','txt']],
  subs:   [['min','Min','min'],['t','','team'],['off','Off','txt'],['on','On','txt']],
  cards:  [['min','Min','min'],['t','','team'],['p','Player','txt'],['c','','sel',['Yellow','2nd yellow','Red']]]
};
export const SCALARS = ['espnId','espnLg','histId','manager','formation','date','ko','comp','round','opp','venue','ground','att','ref','weather','ls','os','htl','hto','ftl','fto','pl','po','oppXI','rating','motm','review','with','seat','notes'];

function fieldHTML([k, label, type, opts], r){
  const v = r[k] ?? '';
  if(type === 'chk') return `<label class="chk"><input type="checkbox" data-f="${k}" ${v ? 'checked' : ''}>${label}</label>`;
  if(type === 'team') return `<select data-f="${k}" class="w-team" aria-label="Team"><option value="L">Leeds</option><option value="O" ${v === 'O' ? 'selected' : ''}>Opp</option></select>`;
  if(type === 'sel') return `<select data-f="${k}" class="w-sel">${opts.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${o === '' ? 'Normal' : o === 'OG' ? 'Own goal' : o}</option>`).join('')}</select>`;
  return `<input data-f="${k}" data-txt="1" class="${type === 'txt' ? 'w-txt' : 'w-num'}" placeholder="${label}" aria-label="${label}" value="${esc(v)}" ${type === 'num' ? 'inputmode="numeric"' : ''} ${type === 'txt' ? 'list="players" autocapitalize="words" autocomplete="off"' : ''}>`;
}
const rowHTML = (kind, r = {}) => `<div class="row">${ROWDEF[kind].map(f => fieldHTML(f, r)).join('')}<button type="button" class="x" data-act="rmRow" aria-label="Remove">✕</button></div>`;
const rowsBlock = (kind, rows, addLabel) => `<div id="rows-${kind}">${(rows || []).map(r => rowHTML(kind, r)).join('')}</div><button type="button" class="add" data-act="addRow" data-kind="${kind}">+ ${addLabel}</button>`;
function collectRows(kind){
  return $$('#rows-' + kind + ' .row').map(row => {
    const o = {}; let has = false;
    row.querySelectorAll('[data-f]').forEach(el => {
      o[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
      if(el.dataset.txt && el.value.trim()) has = true;
    });
    return has ? o : null;
  }).filter(Boolean);
}
export function readForm(f, m){
  const fd = new FormData(f);
  const out = { id: m.id, created: m.created || new Date().toISOString(), updated: new Date().toISOString() };
  SCALARS.forEach(k => out[k] = String(fd.get(k) ?? '').trim());
  out.et = f.et.checked; out.pens = f.pens.checked;
  Object.keys(ROWDEF).forEach(k => out[k] = collectRows(k));
  return out;
}

function datalists(){
  const players = new Set(), comps = new Set(['Premier League','Championship','League One','First Division','Second Division','FA Cup','League Cup','Play-off','UEFA Cup','Champions League','European Cup','Cup Winners\' Cup','Full Members\' Cup','Charity Shield','Community Shield','Europa League','Friendly','Pre-season friendly']), opps = new Set(), grounds = new Set(['Elland Road']);
  for(const m of db.matches){
    (m.lineup || []).concat(m.bench || []).forEach(p => p.name && players.add(p.name));
    (m.subs || []).forEach(s => { if(s.t !== 'O'){ s.on && players.add(s.on); s.off && players.add(s.off); } });
    (m.goals || []).forEach(g => g.t !== 'O' && g.type !== 'OG' && g.p && players.add(g.p));
    m.comp && comps.add(m.comp); m.opp && opps.add(m.opp); m.ground && grounds.add(m.ground);
  }
  const dl = (id, set) => `<datalist id="${id}">${[...set].sort().map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;
  return dl('players', players) + dl('comps', comps) + dl('opps', opps) + dl('grounds', grounds);
}

let state = null;   // { m, isNew } for the form on screen

export function formView(m, isNew = !m, flash = ''){
  if(!m){
    let tpl = {}; try { tpl = JSON.parse(SS.get('lufc-template')) || {}; } catch(e){}
    SS.del('lufc-template');
    m = { id: uid(), venue:'H', comp: tpl.comp || '', lineup: tpl.lineup || Array.from({length:11}, () => ({})), bench: tpl.bench || [], goals:[], subs:[], cards:[] };
  }
  state = { m, isNew };
  const v = k => esc(m[k] ?? '');
  const prev = sorted().filter(x => (x.lineup || []).some(p => p.name)).slice(0, 40);
  /* sections: a blank Add form opens the first two; once filled from the finder (or when editing)
     everything is folded to a one-line summary and "My review" is open, since that's what's left to do */
  /* three modes: 'blank' Add (finder + a closed "Enter manually" card holding sections 1–7),
     'quick' Add after picking a match in the finder (only My review shows; the imported details are still in the
     form, hidden, so they save – and can be changed later via Edit), and 'edit' (all sections). */
  const mode = !isNew ? 'edit' : flash ? 'quick' : 'blank';
  const open = k => mode === 'blank' ? (k === 'fixture' || k === 'score') : k === 'review';
  const wrap = {
    blank: [`<details class="manual mat-panel" id="manual"><summary><span class="sico">${icon('edit')}</span><span class="stxt"><b>Enter manually</b><small>Can't find the match? Fill in the details yourself.</small></span>${icon('chevron', 'chev')}</summary><div class="manual-body">`, '', '</div></details>'],
    quick: ['<div class="fs-hidden" hidden>', '</div>', ''],
    edit: ['', '', '']
  }[mode];
  const sec = (k, n, title, body) => `<details class="fsec card mat-panel" data-fs="${k}" ${open(k) ? 'open' : ''}>
      <summary>${mode === 'quick' ? '' : `<span class="num">${n}</span>`}<span class="ttl">${title}</span><span class="sum" data-sum="${k}"></span>${icon('chevron', 'chev')}</summary>
      <div class="fbody">${body}</div></details>`;
  app().innerHTML = `
  <form id="mf" autocomplete="off" novalidate>
    <div class="page-head"><div><h1>${isNew ? 'Add a match' : 'Edit match'}</h1>${isNew ? '' : `<p>${esc(scoreTxt(m))}</p>`}</div></div>
    ${flash ? `<div class="flash" role="status">${flash}</div>` : ''}
    ${finderHTML(m, isNew, !!flash)}
    <input type="hidden" name="espnId" value="${v('espnId')}"><input type="hidden" name="espnLg" value="${v('espnLg')}"><input type="hidden" name="histId" value="${v('histId')}">

    ${wrap[0]}
    ${sec('fixture', 1, 'Match details', `
      <div class="grid">
        <label class="f">Date<input type="date" name="date" value="${v('date')}" required></label>
        <label class="f">Kick-off<input type="time" name="ko" value="${v('ko')}"></label>
        <label class="f full">Opponent<input name="opp" list="opps" value="${v('opp')}" placeholder="e.g. Manchester United" autocapitalize="words" required></label>
        <div class="f full"><span class="flabel">Home / away</span>
          <div class="seg3" role="radiogroup" aria-label="Home or away">${['H','A','N'].map(x => `<label><input type="radio" name="venue" value="${x}" ${(["H","A","N"].includes(m.venue) ? m.venue : "H") === x ? 'checked' : ''}><span>${venueTxt(x)}</span></label>`).join('')}</div></div>
        <label class="f">Ground<input name="ground" list="grounds" value="${v('ground')}" placeholder="Elland Road"></label>
        <label class="f">Competition<input name="comp" list="comps" value="${v('comp')}" placeholder="e.g. First Division"></label>
        <label class="f">Round / stage<input name="round" value="${v('round')}" placeholder="e.g. 3rd round replay"></label>
        <label class="f">Attendance<input name="att" inputmode="numeric" value="${v('att')}"></label>
        <label class="f">Referee<input name="ref" value="${v('ref')}" autocapitalize="words"></label>
        <label class="f">Leeds manager<input name="manager" value="${v('manager')}" autocapitalize="words"></label>
        <label class="f full">Weather<input name="weather" value="${v('weather')}" placeholder="optional"></label>
      </div>`)}

    ${sec('score', 2, 'Score', `
      <div class="score-in big">
        <label class="f">Leeds<input name="ls" inputmode="numeric" value="${v('ls')}" aria-label="Leeds goals"></label><span class="dash">–</span>
        <label class="f"><span id="oppLbl">${esc(m.opp || 'Opponent')}</span><input name="os" inputmode="numeric" value="${v('os')}" aria-label="Opponent goals"></label>
      </div>
      <div class="score-in">
        <label class="f">Half-time Leeds<input name="htl" inputmode="numeric" value="${v('htl')}"></label><span class="dash">–</span>
        <label class="f">Half-time opp<input name="hto" inputmode="numeric" value="${v('hto')}"></label>
      </div>
      <label class="toggle"><input type="checkbox" name="et" ${m.et ? 'checked' : ''} data-change="toggleBox" data-box="etbox"> Went to extra time</label>
      <div id="etbox" ${m.et ? '' : 'hidden'}>
        <p class="small muted" style="margin:0 0 6px">The main score above is the final score after extra time. Enter the 90-minute score here:</p>
        <div class="score-in"><label class="f">Leeds after 90<input name="ftl" inputmode="numeric" value="${v('ftl')}"></label><span class="dash">–</span><label class="f">Opp after 90<input name="fto" inputmode="numeric" value="${v('fto')}"></label></div>
      </div>
      <label class="toggle"><input type="checkbox" name="pens" ${m.pens ? 'checked' : ''} data-change="toggleBox" data-box="penbox"> Penalty shoot-out</label>
      <div id="penbox" ${m.pens ? '' : 'hidden'}>
        <div class="score-in"><label class="f">Leeds pens<input name="pl" inputmode="numeric" value="${v('pl')}"></label><span class="dash">–</span><label class="f">Opp pens<input name="po" inputmode="numeric" value="${v('po')}"></label></div>
      </div>
      <button type="button" class="btn sec small" data-act="calcScore">Work out score from the goals</button>`)}

    ${sec('goals', 3, 'Goals &amp; assists', `
      <p class="small muted" style="margin:0 0 4px">Minute can include stoppage time, e.g. 45+2 or 90+4. For own goals, pick the team the goal counted for and type the player who put it in.</p>
      ${rowsBlock('goals', m.goals, 'Add goal')}`)}

    ${sec('lineup', 4, 'Line-ups', `
      <div class="lu-head"><label class="f" style="max-width:160px;margin:0">Formation<input name="formation" value="${v('formation')}" placeholder="e.g. 4-4-2"></label>
        ${prev.length ? `<label class="f" style="margin:0">Copy Leeds line-up from<select data-change="copyLineup"><option value="">Choose a match…</option>${prev.map(x => `<option value="${x.id}">${esc(fmtDate(x.date))} v ${esc(x.opp || '')}</option>`).join('')}</select></label>` : ''}</div>
      <div class="subhead"><span>Leeds starting XI</span><span>tick C for captain</span></div>
      ${rowsBlock('lineup', m.lineup, 'Add player')}
      <div class="subhead"><span>Leeds substitutes</span></div>
      ${rowsBlock('bench', m.bench, 'Add sub')}
      <div class="subhead"><span>Opponent line-up</span><span>optional</span></div>
      <textarea name="oppXI" style="min-height:80px" placeholder="Type or paste their team, one per line">${v('oppXI')}</textarea>`)}

    ${sec('subs', 5, 'Substitutions', rowsBlock('subs', m.subs, 'Add substitution'))}
    ${sec('cards', 6, 'Cards', rowsBlock('cards', m.cards, 'Add card'))}
    ${wrap[1]}

    ${sec('review', 7, 'My review', `
      <div class="f"><span class="flabel">Match rating</span>
        <div class="rating-pick" role="radiogroup" aria-label="Match rating out of 10">
          <label><input type="radio" name="rating" value="" ${!m.rating ? 'checked' : ''}><span aria-label="No rating">–</span></label>
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `<label><input type="radio" name="rating" value="${n}" ${String(m.rating) === String(n) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="grid">
        <label class="f">My man of the match<input name="motm" list="players" value="${v('motm')}" autocapitalize="words"></label>
        <label class="f">Went with<input name="with" value="${v('with')}" autocapitalize="words"></label>
        <label class="f full">Stand / seat<input name="seat" value="${v('seat')}" placeholder="e.g. Kop, row K"></label>
      </div>
      <label class="f">Review<textarea name="review" placeholder="How was the game? The atmosphere? The journey?">${v('review')}</textarea></label>
      <label class="f">Other notes<textarea name="notes" style="min-height:70px" placeholder="Programme, ticket price, pub beforehand…">${v('notes')}</textarea></label>`)}
    ${wrap[2]}

    <div class="savebar${isNew && !flash ? ' pending' : ''}"><button type="button" class="btn" data-act="saveMatch">Save match</button>${isNew ? '' : `<a class="btn sec" href="#/match/${m.id}" style="flex:none">Cancel</a>`}</div>
    ${datalists()}
  </form>`;

  const f = $('#mf');
  f.opp.oninput = () => { $('#oppLbl').textContent = f.opp.value || 'Opponent'; clearInvalid(f.opp); };
  f.date.addEventListener('input', () => clearInvalid(f.date));
  f.addEventListener('change', e => {
    if(e.target.name !== 'venue') return;
    if(f.venue.value === 'H' && !f.ground.value) f.ground.value = 'Elland Road';
    if(f.venue.value !== 'H' && f.ground.value === 'Elland Road') f.ground.value = '';
  });
  /* keep each section's one-line summary up to date */
  const sums = () => updateSums(f);
  f.addEventListener('input', sums); f.addEventListener('change', sums);
  f.addEventListener('click', e => { if(e.target.closest('[data-act="addRow"],[data-act="rmRow"],[data-act="calcScore"]')) setTimeout(sums); });
  if(isNew && !m.opp && !f.ground.value && f.venue.value === 'H') f.ground.value = 'Elland Road';
  f.onsubmit = e => { e.preventDefault(); actions.saveMatch(); };
  finderInit(f, m, isNew);
  updateSums(f);
  /* on a blank Add form, Save only appears once a match is being added: picked in the finder
     (the form re-renders filled in) or as soon as something is typed or chosen in the form itself */
  const bar = f.querySelector('.savebar.pending');
  if(bar){
    const reveal = e => { if(e.target.closest('.finder')) return; bar.classList.remove('pending'); f.removeEventListener('input', reveal); f.removeEventListener('change', reveal); };
    f.addEventListener('input', reveal); f.addEventListener('change', reveal);
    f.addEventListener('click', e => { if(e.target.closest('[data-act="addRow"],[data-act="calcScore"]')) bar.classList.remove('pending'); });
  }
}

actions.saveMatch = () => {
  const f = $('#mf'); if(!f || !state) return;
  const missing = [!f.date.value && f.date, !f.opp.value.trim() && f.opp].filter(Boolean);
  if(missing.length){
    missing.forEach(el => markInvalid(el, el === f.date ? 'Add the date of the match' : 'Add who Leeds played'));
    const hid = missing[0].closest('.fs-hidden'); if(hid) hid.hidden = false;
    for(let d = missing[0].closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    missing[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => missing[0].focus({ preventScroll: true }), 300);
    return;
  }
  const out = readForm(f, state.m);
  const i = db.matches.findIndex(x => x.id === state.m.id);
  if(i >= 0) db.matches[i] = out; else db.matches.push(out);
  if(save()){ go('#/match/' + state.m.id); toast(state.isNew ? 'Match saved' : 'Changes saved'); }
};
actions.rmRow = el => el.closest('.row').remove();
actions.addRow = el => { const box = $('#rows-' + el.dataset.kind); box.insertAdjacentHTML('beforeend', rowHTML(el.dataset.kind)); const inp = box.lastElementChild.querySelector('input'); inp && inp.focus(); };
actions.toggleBox = el => { $('#' + el.dataset.box).hidden = !el.checked; };
actions.calcScore = () => {
  const g = collectRows('goals'), f = $('#mf');
  f.ls.value = g.filter(x => x.t !== 'O').length;
  f.os.value = g.filter(x => x.t === 'O').length;
  const ht = g.filter(x => minVal(x.min) < 46);
  if(g.length){ f.htl.value = ht.filter(x => x.t !== 'O').length; f.hto.value = ht.filter(x => x.t === 'O').length; }
  if(f.et.checked){ const n = g.filter(x => minVal(x.min) < 91); f.ftl.value = n.filter(x => x.t !== 'O').length; f.fto.value = n.filter(x => x.t === 'O').length; }
};
actions.copyLineup = el => {
  const src = db.matches.find(x => x.id === el.value); el.value = ''; if(!src) return;
  $('#rows-lineup').innerHTML = (src.lineup || []).map(r => rowHTML('lineup', r)).join('');
  $('#rows-bench').innerHTML = (src.bench || []).map(r => rowHTML('bench', r)).join('');
};


/* ---------- section summaries + inline validation ---------- */
function updateSums(f){
  const fd = new FormData(f), g = k => String(fd.get(k) ?? '').trim();
  const n = k => collectRows(k).length, pl = (c, w) => c ? `${c} ${w}${c === 1 ? '' : 's'}` : '';
  const date = g('date') ? new Date(g('date') + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const sum = {
    fixture: [date, g('opp') && `${g('opp')} (${g('venue') || '?'})`].filter(Boolean).join(' · '),
    score: g('ls') !== '' && g('os') !== '' ? `${g('ls')}–${g('os')}${g('htl') !== '' && g('hto') !== '' ? ` · HT ${g('htl')}–${g('hto')}` : ''}${f.pens.checked ? ' · pens' : f.et.checked ? ' · aet' : ''}` : '',
    goals: pl(n('goals'), 'goal'),
    lineup: [n('lineup') && `${n('lineup')} starting`, n('bench') && `${n('bench')} subs`].filter(Boolean).join(' · '),
    subs: pl(n('subs'), 'change'),
    cards: pl(n('cards'), 'card'),
    review: [g('rating') && `${g('rating')}/10`, g('review') && 'review written'].filter(Boolean).join(' · ')
  };
  for(const [k, txt] of Object.entries(sum)){ const el = f.querySelector(`[data-sum="${k}"]`); if(el) el.textContent = txt; }
}
function markInvalid(el, msg){
  el.setAttribute('aria-invalid', 'true');
  const lab = el.closest('label'); if(!lab || lab.querySelector('.ferr')) return;
  lab.insertAdjacentHTML('beforeend', `<span class="ferr" role="alert">${esc(msg)}</span>`);
}
function clearInvalid(el){ el.removeAttribute('aria-invalid'); const e = el.closest('label')?.querySelector('.ferr'); if(e) e.remove(); }

/* ---------- finder ---------- */
function finderHTML(m, isNew, filled){
  const cs = curSeason(), start = m.date && m.date >= '1979-07-01' ? seasonStart(m.date) : DEMO !== null ? 1991 : cs;
  const opts = `<option value="all">All seasons</option>` + Array.from({length: cs - HIST_FIRST + 1}, (_, i) => cs - i).map(y => `<option value="${y}" ${y === start ? 'selected' : ''}>${seasonLbl(y)}</option>`).join('');
  const body = `<p class="small muted" style="margin:0 0 8px">Pick the season and tap the game – everything known about it fills in for you, then add your own review. From 2001/02 that includes both line-ups, subs and cards; for older games it's usually the score, Leeds scorers, attendance and the Leeds starting XI.</p>
      <div class="grid"><select id="fseason" aria-label="Season">${opts}</select><input id="fsearch" type="search" placeholder="Opponent or date" autocomplete="off"></div>
      <div id="fres" class="fres"></div>`;
  if(isNew && !filled) return `<div class="card mat-panel finder"><h3>${icon('search')} Find the match<span></span></h3>${body}</div>`;
  return `<div class="card mat-panel finder"><details class="fd"><summary>${isNew ? 'Pick a different match' : 'Fill in from online match data'}</summary><div style="margin-top:10px">${!isNew ? '<p class="small" style="margin:0 0 6px"><b>Replaces</b> the fixture, score, goals, line-ups, subs and cards. Your review and notes are kept.</p>' : ''}${body}</div></details></div>`;
}

function finderInit(f, m, isNew){
  const sel = $('#fseason'), q = $('#fsearch'), box = $('#fres');
  if(!sel) return;
  let fxs = [], token = 0;
  const lc = s => String(s || '').toLowerCase();
  const loggedIds = new Set(db.matches.flatMap(x => [x.espnId && 'e' + x.espnId, x.histId && 'h' + x.histId]).filter(Boolean));
  const loggedKey = new Set(db.matches.map(x => x.date + '|' + lc(x.opp)));
  const isLogged = fx => loggedIds.has(fx.key) || loggedKey.has(fx.date + '|' + lc(fx.opp));
  const draw = () => {
    const t = lc(q.value.trim());
    const list = fxs.filter(fx => !t || fx._s.includes(t));
    box.innerHTML = list.length ? list.slice(0, 150).map(fx => {
      const r = fx.ls === '' || fx.os === '' ? '' : +fx.ls > +fx.os ? 'W' : +fx.ls < +fx.os ? 'L' : 'D';
      return `<button type="button" class="fx" data-k="${esc(fx.key)}"><span class="badge ${r}">${r || '–'}</span><span class="mid"><b>${esc(fx.opp || '?')} <span class="muted" style="font-weight:400">(${fx.venue || '?'})</span></b><small>${fmtDate(fx.date)} · ${esc([fx.comp, fx.round].filter(Boolean).join(' – '))}</small></span>${isLogged(fx) ? '<span class="done">✓ logged</span>' : ''}<span class="sc">${esc(fx.ls)}–${esc(fx.os)}</span></button>`;
    }).join('') : `<p class="small muted" style="padding:8px 2px">${fxs.length ? 'No games match that search.' : 'No games found for that season.'}</p>`;
  };
  const load = async () => {
    const my = ++token, v = sel.value;
    box.innerHTML = `<p class="sr-only" role="status">Loading ${v === 'all' ? 'every season' : seasonLbl(+v)}…</p>${v === 'all' ? '<p class="small muted" style="padding:8px 2px 0">Loading every season – this takes a few seconds…</p>' : ''}` +
      Array.from({ length: 5 }, () => `<div class="fx-skel" aria-hidden="true"><span class="skeleton" style="width:30px;height:30px;border-radius:9px"></span><span style="flex:1;display:grid;gap:6px"><span class="skeleton" style="height:14px;width:55%"></span><span class="skeleton" style="height:11px;width:75%"></span></span><span class="skeleton" style="width:34px;height:16px"></span></div>`).join('');
    try {
      const ys = v === 'all' ? Array.from({length: curSeason() - HIST_FIRST + 1}, (_, i) => HIST_FIRST + i) : [+v];
      const lists = []; let fails = 0;
      for(let i = 0; i < ys.length; i += 6) lists.push(...await Promise.all(ys.slice(i, i + 6).map(y => seasonFixtures(y).catch(() => { fails++; return []; }))));
      if(fails === ys.length) throw new Error('unreachable');
      if(my !== token) return;
      const seen = new Set();
      fxs = lists.flat().filter(fx => !seen.has(fx.key) && seen.add(fx.key)).sort((a, b) => b.date.localeCompare(a.date));
      fxs.forEach(fx => { const [y, mo, dd] = fx.date.split('-');
        fx._s = lc([fx.opp, fx.comp, fx.round, fmtDate(fx.date), `${dd}/${mo}/${y}`, `${+dd}/${+mo}/${y.slice(2)}`, `${dd}/${mo}/${y.slice(2)}`].join(' ')); });
      draw();
    } catch(e){
      if(my === token) box.innerHTML = `<p class="small muted" style="padding:8px 2px">Couldn't reach the match data (no signal?). You can still fill the match in by hand below.</p>`;
    }
  };
  sel.onchange = load; q.oninput = draw;
  const det = sel.closest('details');
  if(det) det.addEventListener('toggle', () => { if(det.open && !fxs.length) load(); }, { once: true }); else load();
  box.onclick = async e => {
    const b = e.target.closest('.fx'); if(!b) return;
    const fx = fxs.find(x => x.key === b.dataset.k); if(!fx) return;
    const dup = db.matches.find(x => x.id !== m.id && (('e' + x.espnId) === fx.key || ('h' + x.histId) === fx.key || (x.date === fx.date && lc(x.opp) === lc(fx.opp))));
    if(dup){
      const c = await sheet({ title: 'Already logged', message: `You've already logged this match: ${fmtDate(fx.date)} v ${dup.opp}.`,
        actions: [{ label: 'Open that match', value: 'open', style: 'primary' }, { label: 'Add it again anyway', value: 'add', style: 'secondary' }] });
      if(c === 'open'){ go('#/match/' + dup.id); return; }
      if(c !== 'add') return;
    }
    const cur = readForm(f, m);
    const hasData = (cur.goals || []).length || (cur.lineup || []).some(p => p.name) || cur.ls !== '';
    if(!isNew && hasData && !(await sheet({ title: 'Replace the match details?', message: 'The fixture, score, goals, line-ups, subs and cards will be replaced with the online data.\n\nYour review, rating and notes are kept.',
      actions: [{ label: 'Replace details', value: true, style: 'primary' }, { label: 'Keep what I have', value: false, style: 'secondary' }] }))) return;
    let filled, msg;
    if(fx.src === 'hist'){
      filled = histToMatch(fx.h, cur);
      msg = `✓ Filled in <b>${esc(scoreTxt({...cur, ...filled}))}</b> from the Leeds United Historical Archive. Now add your review below. For games this old some details aren't recorded – you can add anything you remember later with Edit.`;
    } else {
      b.disabled = true; b.querySelector('.sc').textContent = '…';
      let sum = null;
      try { sum = await espnJSON(`${fx.ev.league?.slug || 'all'}/summary?event=${fx.ev.id}`); } catch(err){}
      filled = { ...espnToMatch(fx.ev, sum, cur), histId: '' };
      msg = sum ? `✓ Filled in <b>${esc(scoreTxt({...cur, ...filled}))}</b>. Now add your review below – you can change any of the match details later with Edit.`
                : `✓ Filled in the fixture and score for <b>${esc(scoreTxt({...cur, ...filled}))}</b>. Couldn't load the goals and line-ups just now – add your review below, and fill those in later with Edit if you like.`;
    }
    formView({ ...cur, ...filled, id: m.id, created: m.created }, isNew, msg);
    try { window.scrollTo(0, 0); } catch(err){}
  };
}

/* route entry points */
export function newView(p){
  if(p.id && DEMO !== null){
    const src = db.matches.find(m => m.id === p.id);
    if(src) return formView({ ...JSON.parse(JSON.stringify(src)), id: 'demo-new', rating:'', motm:'', review:'', with:'', seat:'' }, true, `✓ Filled in <b>${esc(scoreTxt(src))}</b>. Now add your review below – you can change any of the match details later with Edit.`);
  }
  formView(null);
}
export function editView(p){
  const m = db.matches.find(x => x.id === p.id);
  if(!m){ go('#/matches', { replace: true }); return; }
  formView(m, false);
}
