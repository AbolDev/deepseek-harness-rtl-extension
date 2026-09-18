import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const base = new URL('../DeepSeek Harness RTL - Chrome Extension/', import.meta.url);
const html = fs.readFileSync(new URL('popup.html', base), 'utf8');
const js = fs.readFileSync(new URL('popup.js', base), 'utf8');

async function popupWith(tagName) {
  const dom = new JSDOM(html, {runScripts:'outside-only'});
  const w = dom.window;
  const store = {};
  w.chrome = {runtime:{getManifest:()=>({version:'1.1.0'})}, storage:{local:{
    get(defs, cb) { cb({...defs, ...store}); },
    set(values, cb) { Object.assign(store, values); cb(); }
  }}};
  w.fetch = async () => ({ok:true, status:200, json:async()=>({tag_name: tagName})});
  await w.eval(js);
  await new Promise(r=>setTimeout(r, 50));
  return {w, store};
}

// Newer release: banner appears, dismiss persists for that version.
{
  const {w, store} = await popupWith('v1.2.0');
  assert.equal(w.document.getElementById('update').hidden, false, 'banner visible for newer version');
  assert.match(w.document.getElementById('update-text').textContent, /1\.2\.0/);
  assert.equal(store.latestVersion, 'v1.2.0');
  assert.ok(store.updateCheckAt > 0, 'check timestamp saved');
  w.document.getElementById('update-dismiss').click();
  await new Promise(r=>setTimeout(r, 50));
  assert.equal(w.document.getElementById('update').hidden, true, 'dismiss hides banner');
  assert.equal(store.dismissedVersion, 'v1.2.0');
  w.close();
}
// Same or older release: no banner.
{
  const {w} = await popupWith('v1.0.9');
  assert.equal(w.document.getElementById('update').hidden, true, 'no banner for older version');
  w.close();
}
// No fetch available (offline/test env): popup still works, no banner.
{
  const dom = new JSDOM(html, {runScripts:'outside-only'});
  const w = dom.window;
  w.chrome = {runtime:{getManifest:()=>({version:'1.1.0'})}, storage:{local:{
    get(defs, cb) { cb({...defs}); },
    set(_v, cb) { cb(); }
  }}};
  await w.eval(js);
  await new Promise(r=>setTimeout(r, 50));
  assert.equal(w.document.getElementById('update').hidden, true, 'no banner without fetch');
  assert.equal(w.document.body.dataset.state, 'enabled');
  w.close();
}
console.log('PASS: update banner for newer release, dismiss per version, no banner for older release or offline.');
