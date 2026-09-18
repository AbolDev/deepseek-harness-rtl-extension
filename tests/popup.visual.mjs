import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const extension = new URL('../DeepSeek Harness RTL - Chrome Extension/', import.meta.url);
const output = new URL('./screenshots/', import.meta.url);
fs.mkdirSync(output, {recursive:true});
const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});
try {
  for (const scheme of ['light','dark']) {
    const page = await browser.newPage({viewport:{width:440,height:360}, colorScheme:scheme, reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Render actual popup files, with only the Chrome storage/runtime API stubbed.
    await page.addInitScript(() => {
      window.chrome = {runtime:{getManifest:()=>({version:'1.0.0'})}, storage:{local:{get:(defaults,cb)=>{ window.finishSettings = () => cb(defaults); },set:(value,cb)=>cb()}}};
    });
    await page.goto(new URL('popup.html', extension).href);
    await page.locator('body[data-state="loading"]').waitFor();
    const dimensions = () => page.evaluate(() => [document.documentElement.offsetWidth, document.documentElement.offsetHeight, document.body.offsetWidth, document.body.offsetHeight]);
    const initialSize = await dimensions();
    assert.deepEqual(initialSize, [440,360,440,360]);
    await page.evaluate(() => window.finishSettings());
    await page.locator('body[data-state="enabled"]').waitFor();
    assert.deepEqual(await dimensions(), initialSize, 'Storage resolution must not resize popup');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,'No horizontal overflow');
    const height = await page.locator('.shell').evaluate(el=>el.getBoundingClientRect().height);
    console.log(scheme, 'size:', '440 x ' + height);
    assert.ok(height <= 480, 'Default popup should stay compact');
    await page.screenshot({path:fileURLToPath(new URL('popup-'+scheme+'.png', output)),fullPage:true});
    await page.getByRole('switch').uncheck();
    await page.locator('body[data-state="disabled"]').waitFor();
    await page.screenshot({path:fileURLToPath(new URL('popup-'+scheme+'-paused.png', output)),fullPage:true});
    await page.locator('summary').click();
    assert.equal(await page.locator('details').getAttribute('open'),'');
    assert.deepEqual(await dimensions(), initialSize, 'Toggle and help must not resize popup');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'auto', 'Expanded content remains scrollable');
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('PASS: Chromium renders light/dark and paused states, switch works, help expands, fixed 440x360 dimensions across loading, enabled, paused and expanded-help states. Chrome APIs are stubbed; this is not an installed-extension test.');
} finally { await browser.close(); }
