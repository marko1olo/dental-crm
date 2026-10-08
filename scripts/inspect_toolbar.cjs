const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/radiology_inquisition_preview.html?view=rvg&theme=light');
  await page.waitForSelector('[data-testid="rvg-filters-1row-toolbar"]');
  const toolbar = await page.$('[data-testid="rvg-filters-1row-toolbar"]');
  const box = await toolbar.boundingBox();
  console.log('Toolbar BBox:', JSON.stringify(box));
  const buttons = await toolbar.$$('button, select');
  for (const b of buttons) {
    const text = await b.innerText();
    const tag = await b.evaluate(el => el.tagName + '.' + el.className);
    const bBox = await b.boundingBox();
    console.log('Elem:', tag, text.trim(), JSON.stringify(bBox));
  }
  await browser.close();
}

test().catch(console.error);
