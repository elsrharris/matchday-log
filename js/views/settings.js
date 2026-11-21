/* Settings: appearance, cloud sync, backup / restore / export. */
import { db, save, esc, uid, sorted, seasonOf, venueTxt, res, minTxt, $ } from '../core.js';
import { cloud, syncStateText, cloudGoogle, cloudEmail, cloudReset, cloudSignOut } from '../sync.js';
import { app, go, route } from '../router.js';
import { actions, icon } from '../ui.js';
import { getPref, setPref } from '../theme.js';

function syncCardHTML(){
  if(cloud.user) return `<div class="sgroup mat-panel">
      <div class="srow"><span class="sico ok">${icon('cloud')}</span><span class="stxt"><b>Cloud sync is on</b><small>${esc(cloud.user.email || 'Signed in')}</small></span></div>
      <div class="srow"><span class="sico">${icon('check')}</span><span class="stxt"><b>Status</b><small id="syncstate">${esc(syncStateText())}</small></span></div>
      <button class="srow" data-act="signOut"><span class="sico">${icon('back')}</span><span class="stxt"><b>Sign out on this device</b><small>Your matches stay safe in the cloud</small></span>${icon('chevron', 'chev')}</button>
    </div>
    <p class="sfoot">Every match is backed up automatically. Sign in with the same account on your phone and computer and they'll show the same matches.</p>`;
  if(cloud.failed) return `<div class="sgroup mat-panel"><button class="srow" data-act="reload"><span class="sico warn">${icon('cloud')}</span><span class="stxt"><b>Can't reach the sync service</b><small>No internet? Your matches are safe on this device. Tap to try again.</small></span>${icon('chevron', 'chev')}</button></div>`;
  if(!cloud.fb) return `<div class="sgroup mat-panel"><div class="srow"><span class="sico">${icon('cloud')}</span><span class="stxt"><b>Cloud sync</b><small>Loading…</small></span></div></div>`;
  return `<div class="sgroup mat-panel sgroup-pad">
      <p style="margin:0 0 12px">Sign in once on each device. Your matches are then backed up automatically and stay the same on your phone and computer. Any matches already on this device are added to your account.</p>
      <button class="gbtn" data-act="google"><b>G</b> Sign in with Google</button>
      <details class="alt"><summary>Use an email and password instead</summary>
        <div style="margin-top:10px">
          <label class="f">Email<input id="aem" type="email" autocomplete="username" autocapitalize="none"></label>
          <label class="f">Password<input id="apw" type="password" autocomplete="current-password" placeholder="at least 6 characters"></label>
          <div class="btns"><button class="btn" data-act="emailIn">Sign in</button><button class="btn sec" data-act="emailCreate">Create account</button><button class="btn link" data-act="emailReset">Forgot password?</button></div>
        </div>
      </details></div>`;
}

export function settingsView(){
  const last = db.meta.lastBackup, pref = getPref(), opts = [['dark', 'Dark'], ['light', 'Light'], ['system', 'System']];
  const idx = opts.findIndex(o => o[0] === pref);
  app().innerHTML = `
    <div class="page-head"><div><h1>Settings</h1></div></div>
    <h2 class="shead">Appearance</h2>
    <div class="sgroup mat-panel sgroup-pad">
      <div class="seg" role="group" aria-label="Appearance"><span class="seg-ind" style="width:calc((100% - 16px) / 3);transform:translateX(calc(${idx} * (100% + 4px)))"></span>
        ${opts.map(([k, l]) => `<button type="button" data-act="theme" data-v="${k}" aria-pressed="${k === pref}">${l}</button>`).join('')}</div>
      <p class="sfoot" style="margin:10px 2px 0">System follows your phone or computer's own light/dark setting.</p>
    </div>
    <h2 class="shead">Cloud sync</h2>
    ${syncCardHTML()}
    <h2 class="shead">Backup &amp; data</h2>
    <div class="sgroup mat-panel">
      <button class="srow" data-act="exportJSON"><span class="sico">${icon('download')}</span><span class="stxt"><b>Download backup file</b><small>${db.matches.length} matches · last backup ${last ? esc(new Date(last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })) : 'never'}</small></span>${icon('chevron', 'chev')}</button>
      <label class="srow"><span class="sico">${icon('copy')}</span><span class="stxt"><b>Restore from a backup file</b><small>Or move matches from another device${cloud.user ? ' (synced to your other devices too)' : ''}</small></span>${icon('chevron', 'chev')}
        <input type="file" accept=".json,application/json" data-change="importJSON" class="sr-only"></label>
      <button class="srow" data-act="exportCSV"><span class="sico">${icon('matches')}</span><span class="stxt"><b>Download spreadsheet (CSV)</b><small>For Excel or Google Sheets – viewing only</small></span>${icon('chevron', 'chev')}</button>
    </div>
    <p class="sfoot">${cloud.user ? 'Your matches are already backed up in the cloud. A backup file is an extra copy you control – handy once a season.' : 'Matches are saved on this device. Keep a backup file somewhere safe – email it to yourself, or put it in Google Drive or iCloud.'}</p>
    <h2 class="shead">About</h2>
    <div class="sgroup mat-panel sgroup-pad">
      <p class="small" style="margin:0 0 8px"><b>Matchday Log</b> – every Leeds United game I've been to.</p>
      <p class="small muted" style="margin:0">Match facts from 2001/02 onwards come from ESPN; earlier seasons from the <a href="https://lufchistory.com" target="_blank" rel="noopener">Leeds United Historical Archive</a>. Club crests via ESPN.
      Stadium photo: Elland Road (Revie and North stands, 2009) by MightyEagleGER, public domain, via <a href="https://commons.wikimedia.org/wiki/File:LeedsvOldham0910RevieNorthStand.jpg" target="_blank" rel="noopener">Wikimedia Commons</a>.</p>
    </div>
    <h2 class="shead">Danger zone</h2>
    <div class="sgroup mat-panel">
      <button class="srow danger" data-act="wipe"><span class="sico bad">${icon('trash')}</span><span class="stxt"><b>Delete all matches${cloud.user ? ' everywhere' : ' on this device'}</b><small>This can't be undone – download a backup first</small></span></button>
    </div>`;
}

actions.theme = el => {
  setPref(el.dataset.v);
  const seg = el.parentNode, btns = [...seg.querySelectorAll('button')], i = btns.indexOf(el);
  btns.forEach(b => b.setAttribute('aria-pressed', b === el));
  seg.querySelector('.seg-ind').style.transform = `translateX(calc(${i} * (100% + 4px)))`;
};
actions.google = () => cloudGoogle();
actions.emailIn = () => cloudEmail(false);
actions.emailCreate = () => cloudEmail(true);
actions.emailReset = () => cloudReset();
actions.signOut = () => cloudSignOut();
actions.reload = () => location.reload();

function download(name, text, type){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
actions.exportJSON = () => {
  db.meta.lastBackup = new Date().toISOString(); save();
  download('leeds-matchday-log-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(db, null, 2), 'application/json');
  settingsView();
};
actions.exportCSV = () => {
  const cols = ['Date','Season','Competition','Round','Opponent','Venue','Ground','Leeds','Opp','HT','AET','Pens','Result','Leeds scorers','Attendance','Referee','Rating','MOTM','Review'];
  const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const rows = sorted().reverse().map(m => [m.date, seasonOf(m.date), m.comp, m.round, m.opp, venueTxt(m.venue), m.ground, m.ls, m.os, (m.htl || m.hto) ? `${m.htl}-${m.hto}` : '', m.et ? 'Yes' : '', m.pens ? `${m.pl}-${m.po}` : '', res(m) || '',
    (m.goals || []).filter(g => g.t !== 'O').map(g => `${g.p}${g.type === 'OG' ? ' (og)' : g.type === 'Pen' ? ' (pen)' : ''} ${minTxt(g.min)}`).join('; '), m.att, m.ref, m.rating, m.motm, m.review].map(q).join(','));
  download('leeds-matchday-log.csv', '﻿' + [cols.map(q).join(','), ...rows].join('\n'), 'text/csv');
};
actions.importJSON = input => {
  const file = input.files[0]; if(!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result); if(!d || !Array.isArray(d.matches)) throw new Error('Not a Matchday Log backup file');
      const replace = db.matches.length && confirm(`Backup has ${d.matches.length} matches.\n\nOK = REPLACE everything on this device with the backup\nCancel = MERGE (add any matches not already here)`);
      if(replace || !db.matches.length){ const t = new Date().toISOString(); db.matches = d.matches.map(m => ({...m, id: m.id || uid(), updated: t})); }
      else { const ids = new Set(db.matches.map(m => m.id)); d.matches.forEach(m => { if(!ids.has(m.id)) db.matches.push(m); else { const i = db.matches.findIndex(x => x.id === m.id); if((m.updated || '') > (db.matches[i].updated || '')) db.matches[i] = m; } }); }
      save(); alert('Done – ' + db.matches.length + ' matches on this device.'); go('#/matches');
    } catch(e){ alert('Could not read that file: ' + e.message); }
  };
  rd.readAsText(file);
};
actions.wipe = () => {
  if(prompt(cloud.user ? 'This deletes ALL matches – on this device, in the cloud and on every device you\'re signed in on. Type DELETE to confirm.' : 'This deletes ALL matches on this device. Type DELETE to confirm.') === 'DELETE'){ db.matches = []; save(); go('#/matches'); }
};
