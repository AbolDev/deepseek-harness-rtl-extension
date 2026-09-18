import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const extension = new URL('../DeepSeek Harness RTL - Chrome Extension/', import.meta.url);
const source = fs.readFileSync(new URL('content.js', extension), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', extension), 'utf8'));
for (const file of [...manifest.content_scripts.flatMap(s => [...s.js, ...s.css]), manifest.action.default_popup, ...Object.values(manifest.icons)]) {
  assert.ok(fs.existsSync(new URL(file, extension)), 'Missing manifest resource: ' + file);
}
const dom = new JSDOM('<!doctype html><title>DeepSeek Harness</title><body><div id="root"><p id="fa" dir="ltr">DeepSeek Harness را راست‌چین کن <code>npm run dev</code></p><p id="en">English text</p><p id="stream">Loading</p><pre><code id="code">const text = "سلام";</code></pre><textarea id="input"></textarea><div id="editor" contenteditable="true"><p>سلام دنیا</p></div></div></body>', {url:'http://127.0.0.1:3080', runScripts:'outside-only'});
const {window} = dom;
let settingsChanged;
window.chrome = {
  runtime:{},
  storage:{local:{get(defaults, callback) { callback(defaults); }}, onChanged:{addListener(callback) { settingsChanged = callback; }}}
};
window.eval(source);
const get = id => window.document.getElementById(id);
const dir = id => get(id).getAttribute('data-dsh-auto-dir');
assert.equal(dir('fa'), 'rtl');
assert.equal(get('fa').getAttribute('dir'), 'ltr', 'Original direction is preserved');
assert.equal(dir('en'), 'ltr');
assert.equal(dir('code'), null);
assert.equal(dir('root'), null, 'Do not mirror app layout');
assert.equal(dir('editor'), 'rtl', 'Rich editor with nested paragraphs works');
get('input').value = 'سلام';
get('input').dispatchEvent(new window.Event('input', {bubbles:true}));
assert.equal(dir('input'), 'rtl');
get('input').value = 'Hello';
get('input').dispatchEvent(new window.Event('input', {bubbles:true}));
assert.equal(dir('input'), 'ltr');
get('stream').firstChild.data = 'پاسخ جدید';
await new Promise(resolve => setTimeout(resolve, 130));
assert.equal(dir('stream'), 'rtl', 'Streaming text is detected');
const added = window.document.createElement('p');
added.textContent = 'پیام جدید';
get('root').append(added);
await new Promise(resolve => setTimeout(resolve, 130));
assert.equal(added.getAttribute('data-dsh-auto-dir'), 'rtl');
settingsChanged({enabled:{newValue:false}}, 'local');
assert.equal(window.document.querySelectorAll('[data-dsh-auto-dir]').length, 0);
assert.equal(window.document.documentElement.hasAttribute('data-dsh-rtl-active'), false);
assert.equal(get('fa').getAttribute('dir'), 'ltr');
settingsChanged({enabled:{newValue:true}}, 'local');
assert.equal(dir('fa'), 'rtl');
console.log('PASS: manifest resources, Persian/English, existing dir, code exclusion, layout protection, rich editor, typing, streaming, new messages, disable/restore/re-enable.');
window.close();
for (const [url, title] of [['http://localhost:8080','DeepSeek Harness'], ['http://localhost:3080','Another app']]) {
  const other = new JSDOM('<title>' + title + '</title><p>سلام</p>', {url, runScripts:'outside-only'});
  other.window.eval(source); // Must exit before accessing Chrome APIs.
  assert.equal(other.window.document.querySelector('[data-dsh-auto-dir]'), null);
  other.window.close();
}
console.log('PASS: unrelated app/port guards. Browser visual testing still required.');
