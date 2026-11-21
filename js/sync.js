/* Cloud sync (Firebase).
   This device's copy in localStorage is what the app reads and writes, so it works with no signal.
   When signed in, each match is also a document at users/{uid}/matches/{id}. Deleted matches become
   small "tombstone" documents so a deletion on one device isn't undone by another. When the same
   match differs, the copy with the later `updated` time wins. */
import { db, DEMO, saveLocal, resetKnownIds, hooks, $, $$ } from './core.js';

const FB_VER = '12.19.0';
const FB_CFG = {
  apiKey: "AIzaSyCFd1KRDQOHk5KYfQ9WKlSAohPUZkVa0T8",
  authDomain: "matchday-log.firebaseapp.com",
  projectId: "matchday-log",
  storageBucket: "matchday-log.firebasestorage.app",
  messagingSenderId: "339121033614",
  appId: "1:339121033614:web:0b87a1a885460145f794df"
};
export const cloud = { fb:null, failed:false, user:undefined, col:null, unsub:null, remote:new Map(), live:false, pending:false, fromCache:false, error:'' };

export async function cloudInit(){
  try {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-`;
    const [A, U, F] = await Promise.all([import(base + 'app.js'), import(base + 'auth.js'), import(base + 'firestore.js')]);
    const app = A.initializeApp(FB_CFG);
    cloud.fb = { U, F, auth: U.getAuth(app), fs: F.getFirestore(app) };
    U.onAuthStateChanged(cloud.fb.auth, user => user ? cloudStart(user) : cloudStop());
  } catch(e){
    cloud.failed = true; cloud.user = null; cloudStatus(); hooks.rerender();
  }
}

function cloudStart(user){
  if(cloud.user && cloud.user.uid === user.uid) return;
  const { F, fs } = cloud.fb;
  if(db.meta.uid && db.meta.uid !== user.uid && db.matches.length &&
     !confirm(`This device has ${db.matches.length} matches from a different account.\n\nOK = add them to ${user.email || 'this account'} as well\nCancel = remove them from this device`)){
    db.matches = []; db.tomb = {}; resetKnownIds([]);
  }
  cloud.user = user; cloud.live = false; cloud.error = '';
  db.meta.uid = user.uid; db.meta.email = user.email || ''; saveLocal();
  cloud.col = F.collection(fs, 'users', user.uid, 'matches');
  cloud.unsub = F.onSnapshot(cloud.col, { includeMetadataChanges: true }, snap => {
    cloud.fromCache = snap.metadata.fromCache;
    cloud.pending = snap.metadata.hasPendingWrites;
    if(!cloud.live && snap.metadata.fromCache){ cloudStatus(); return; } // wait for the real server copy before comparing
    cloud.remote = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    cloud.live = true; cloud.error = '';
    if(!snap.metadata.hasPendingWrites) db.meta.lastSync = new Date().toISOString();
    cloudReconcile();
    cloudStatus();
  }, err => { cloud.error = err.code || err.message; cloudStatus(); });
  cloudStatus(); hooks.rerender();
}

function cloudStop(){
  if(cloud.unsub) cloud.unsub();
  Object.assign(cloud, { user:null, col:null, unsub:null, remote:new Map(), live:false, pending:false });
  cloudStatus(); hooks.rerender();
}

export function cloudReconcile(){
  if(!cloud.live || !cloud.user || !cloud.col) return;
  const local = new Map(db.matches.map(m => [m.id, m]));
  const ids = new Set([...local.keys(), ...Object.keys(db.tomb), ...cloud.remote.keys()]);
  const push = []; let changed = false, tombs = false;
  for(const id of ids){
    const l = local.get(id), r = cloud.remote.get(id);
    const lt = l ? (l.updated || '') : (id in db.tomb ? db.tomb[id] : null);
    const rt = r ? (r.updated || '') : null;
    if(rt !== null && (lt === null || rt > lt)){            // the cloud copy is newer
      if(r.deleted){ if(l){ local.delete(id); changed = true; } db.tomb[id] = rt; tombs = true; }
      else { local.set(id, r); if(id in db.tomb){ delete db.tomb[id]; tombs = true; } changed = true; }
    } else if(lt !== null && (rt === null || lt > rt)){     // this device's copy is newer
      push.push(l || { id, deleted: true, updated: lt });
    }
  }
  if(changed){ db.matches = [...local.values()]; resetKnownIds(local.keys()); }
  if(changed || tombs) saveLocal();
  if(changed) hooks.rerender();
  if(push.length){
    const { F, fs } = cloud.fb;
    for(let i = 0; i < push.length; i += 400){
      const b = F.writeBatch(fs);
      push.slice(i, i + 400).forEach(m => b.set(F.doc(cloud.col, m.id), JSON.parse(JSON.stringify(m))));
      b.commit().catch(e => { cloud.error = e.code || e.message; cloudStatus(); });
    }
  }
}

/* status shown in the header pill(s) and on the settings page */
export function syncState(){
  if(cloud.user === undefined && !cloud.failed) return { key: 'loading', label: '' };
  if(!cloud.user) return { key: 'off', label: cloud.failed ? 'Offline' : 'Sign in to sync' };
  if(cloud.error) return { key: 'warn', label: 'Sync problem' };
  if(!navigator.onLine || cloud.fromCache) return { key: 'offline', label: 'Offline – saved here' };
  if(cloud.pending || !cloud.live) return { key: 'busy', label: 'Syncing…' };
  return { key: 'ok', label: 'Synced' };
}
export function cloudStatus(){
  const s = syncState();
  $$('[data-syncpill]').forEach(p => { p.hidden = s.key === 'loading'; p.dataset.state = s.key; p.querySelector('span').textContent = s.label; });
  const t = $('#syncstate'); if(t) t.textContent = syncStateText();
}
window.addEventListener('online', cloudStatus);
window.addEventListener('offline', cloudStatus);

export function syncStateText(){
  if(cloud.error) return 'There was a problem syncing (' + cloud.error + '). Your matches are still saved on this device.';
  if(!navigator.onLine || cloud.fromCache) return 'No internet right now – changes are saved on this device and will sync when you\'re back online.';
  if(cloud.pending || !cloud.live) return 'Syncing…';
  return 'All matches synced' + (db.meta.lastSync ? ' · ' + new Date(db.meta.lastSync).toLocaleString('en-GB', {dateStyle:'medium', timeStyle:'short'}) : '') + '.';
}

const authMsg = e => ({
  'auth/popup-blocked': 'The sign-in window was blocked. Please allow pop-ups for this site and try again.',
  'auth/unauthorized-domain': 'This website address isn\'t allowed to sign in yet (add it under Firebase → Authentication → Settings → Authorized domains).',
  'auth/operation-not-allowed': 'This sign-in method isn\'t switched on in Firebase yet.',
  'auth/invalid-credential': 'That email and password don\'t match.',
  'auth/wrong-password': 'That email and password don\'t match.',
  'auth/user-not-found': 'No account with that email – tap "Create account" first.',
  'auth/email-already-in-use': 'There\'s already an account with that email – tap "Sign in" instead (or sign in with Google if that\'s how it was made).',
  'auth/weak-password': 'Please use a password of at least 6 characters.',
  'auth/invalid-email': 'That doesn\'t look like an email address.',
  'auth/network-request-failed': 'No internet connection – try again when you\'re online.'
})[e.code] || ('Sign-in didn\'t work: ' + (e.code || e.message));
const quietAuth = e => ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(e.code);
const demoOff = () => { if(DEMO !== null){ alert('Demo mode – sign-in is switched off.'); return true; } return false; };

export function cloudGoogle(){
  if(demoOff() || !cloud.fb) return;
  const { U, auth } = cloud.fb;
  /* called straight from the tap (no await first) so browsers don't block the pop-up */
  U.signInWithPopup(auth, new U.GoogleAuthProvider()).catch(e => { if(!quietAuth(e)) alert(authMsg(e)); });
}
export function cloudEmail(create){
  if(demoOff()) return;
  const { U, auth } = cloud.fb, em = $('#aem').value.trim(), pw = $('#apw').value;
  if(!em || !pw){ alert('Please enter an email and password.'); return; }
  (create ? U.createUserWithEmailAndPassword : U.signInWithEmailAndPassword)(auth, em, pw).catch(e => alert(authMsg(e)));
}
export function cloudReset(){
  if(demoOff()) return;
  const { U, auth } = cloud.fb, em = $('#aem').value.trim();
  if(!em){ alert('Type your email in the box above first.'); return; }
  U.sendPasswordResetEmail(auth, em).then(() => alert('A password reset email is on its way to ' + em + '.'), e => alert(authMsg(e)));
}
export function cloudSignOut(){
  if(demoOff()) return;
  if(!confirm('Sign out on this device? Your matches stay on this device and in the cloud, but changes here won\'t sync until you sign in again.')) return;
  cloud.fb.U.signOut(cloud.fb.auth);
}
hooks.afterSave = cloudReconcile;
