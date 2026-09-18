import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const base = new URL('../DeepSeek Harness RTL - Chrome Extension/', import.meta.url);
const html = fs.readFileSync(new URL('popup.html', base), 'utf8');
const js = fs.readFileSync(new URL('popup.js', base), 'utf8');
const dom = new JSDOM(html, {runScripts:'outside-only'});
const w = dom.window;
let readError = true, writeError = false, persisted = false;
w.chrome = {runtime:{getManifest:()=>({version:'1.0.0'})}, storage:{local:{
  get(defaults, cb) { w.chrome.runtime.lastError = readError ? {message:'test'} : undefined; cb({enabled:persisted}); delete w.chrome.runtime.lastError; },
  set(values, cb) { w.chrome.runtime.lastError = writeError ? {message:'test'} : undefined; if(!writeError) persisted = values.enabled; cb(); delete w.chrome.runtime.lastError; }
}}};
w.eval(js);
const q = s=>w.document.querySelector(s);
assert.equal(q('html').lang,'en'); assert.equal(q('html').dir,'ltr');
assert.equal(q('body').dataset.state,'error'); assert.equal(q('#retry').hidden,false); assert.equal(q('#enabled').disabled,true);
readError = false; q('#retry').click();
assert.equal(q('body').dataset.state,'disabled'); assert.equal(q('#enabled').checked,false);
q('#enabled').click();
assert.equal(q('body').dataset.state,'enabled'); assert.equal(persisted,true);
writeError = true; q('#enabled').click();
assert.equal(q('#enabled').checked,true); assert.equal(q('body').dataset.state,'enabled'); assert.equal(q('#status').dataset.error,'true');
writeError = false; q('#enabled').click();
assert.equal(q('body').dataset.state,'disabled'); assert.equal(persisted,false);
assert.equal(q('#status').dataset.error,'false'); assert.equal(q('#version').textContent,'v1.0.0');
console.log('PASS: English/LTR interface, load failure/retry, persisted state, enable/disable, write failure rollback, version label.');
w.close();
