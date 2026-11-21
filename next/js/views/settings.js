/* Settings: appearance, cloud sync, backup / restore / export. */
import { db, save, esc, uid, sorted, seasonOf, venueTxt, res, minTxt, $ } from '../core.js';
import { cloud, syncStateText, cloudGoogle, cloudEmail, cloudReset, cloudSignOut } from '../sync.js';
import { app, go, route } from '../router.js';
import { actions, icon } from '../ui.js';
import { getPref, setPref } from '../theme.js';

function syncCardHTML(){
  if(cloud.user) return `<div class="card mat-panel"><h3>Cloud sync is on</h3>
      <div class="who-box"><div>Signed in as <b>${esc(cloud.user.email || 'you')}</b><div class="muted small" id="syncstate">${esc(syncStateText())}</div></div>
      <button class="btn sec" data-act="signOut">Sign out</button></div>
      <p class="small muted" style="margin:12px 0 0">Every match is backed up automatically. Sign in with the same account on your phone, tablet or computer and they'll all show the same matches.</p></div>`;
  if(cloud.failed) return `<div class="card mat-panel"><h3>Cloud sync</h3><p class="small muted" style="margin:0">Can't reach the sync service right now (no internet?). Your matches are safe on this device. <a href="#/settings" data-act="reload">Try again</a></p></div>`;
  if(!cloud.fb) return `<div class="card mat-panel"><h3>Cloud sync</h3><p class="small muted" style="margin:0">Loading…</p></div>`;
  return `<div class="card mat-panel"><h3>Turn on cloud sync</h3>
      <p style="margin-top:0">Sign in once on each device. Your matches are then backed up automatically and stay the same on your phone and computer. Any matches already on this device are added to your account.</p>
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
    <div class="card mat-panel"><h3>Appearance</h3>
      <div class="seg" role="group" aria-label="Appearance"><span class="seg-ind" style="width:calc((100% - 16px) / 3);transform:translateX(calc(${idx} * (100% + 4px)))"></span>
        ${opts.map(([k, l]) => `<button type="button" data-act="theme" data-v="${k}" aria-pressed="${k === pref}">${l}</button>`).join('')}</div>
    </div>
    ${syncCardHTML()}
    <div class="card mat-panel"><h3>Backup file</h3>
      <p class="small muted" style="margin-top:0">${cloud.user ? 'Your matches are already backed up in the cloud. A file is an extra copy you control – handy once a season.' : 'Saves a file with every match. Keep a copy somewhere safe – email it to yourself, or put it in Google Drive / iCloud.'}<br>${db.matches.length} matches on this device · Last backup file: ${last ? new Date(last).toLocaleString('en-GB') : 'never'}</p>
      <button class="btn" data-act="exportJSON">${icon('download')} Download backup file</button>
    </div>
    <div class="card mat-panel"><h3>Restore / move to another device</h3>
      <p class="small muted" style="margin-top:0">Choose a backup file made by this site.${cloud.user ? ' Restored matches are synced to your other devices too.' : ''}</p>
      <input type="file" accept=".json,application/json" data-change="importJSON" aria-label="Choose a backup file">
    </div>
    <div class="card mat-panel"><h3>Spreadsheet</h3>
      <p class="small muted" style="margin-top:0">A summary of every match to open in Excel or Google Sheets (for viewing – to restore, use the backup file above).</p>
      <button class="btn sec" data-act="exportCSV">${icon('download')} Download spreadsheet (CSV)</button>
    </div>
    <div class="card mat-panel"><h3>About</h3>
      <p class="small muted" style="margin:0">Match facts from 2001/02 onwards come from ESPN; earlier seasons from the <a href="https://lufchistory.com" target="_blank" rel="noopener">Leeds United Historical Archive</a>. Club crests via ESPN.
      Stadium photo: Elland Road (Revie and North stands, 2009) by MightyEagleGER, public domain, via <a href="https://commons.wikimedia.org/wiki/File:LeedsvOldham0910RevieNorthStand.jpg" target="_blank" rel="noopener">Wikimedia Commons</a>.</p>
    </div>
    <div class="card mat-panel"><h3>Danger zone</h3><button class="btn danger" data-act="wipe">Delete all matches${cloud.user ? ' everywhere' : ' on this device'}</button></div>`;
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
