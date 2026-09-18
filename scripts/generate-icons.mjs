import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
const icons = new URL('../DeepSeek Harness RTL - Chrome Extension/icons/', import.meta.url);
const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});
try {
  for (const size of [16,32,48,128,1095]) {
    const page = await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.goto(new URL('logo.svg', icons).href);
    await page.evaluate(size => {
      const svg = document.documentElement;
      if (svg.localName !== 'svg') throw new Error('Expected an SVG document');
      svg.setAttribute('width',String(size));
      svg.setAttribute('height',String(size));
      svg.style.display = 'block';
    },size);
    const name = size === 1095 ? 'logo.png' : 'icon' + size + '.png';
    await page.screenshot({path:fileURLToPath(new URL(name,icons)),omitBackground:true});
    console.log(name + ': ' + size + ' x ' + size);
    await page.close();
  }
} finally { await browser.close(); }
