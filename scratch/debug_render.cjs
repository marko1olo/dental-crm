const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER UNCAUGHT EXCEPTION:', err));

  await page.goto('http://127.0.0.1:5173/#finance');
  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'demo_clinic_token');
    localStorage.setItem('dente_staff_token', 'demo_staff_token');
  });
  await page.reload();
  await page.waitForTimeout(2000);

  const demoBtn = await page.$('button:has-text("Попробовать демо-режим")');
  if (demoBtn) {
    console.log('Clicking demo button...');
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  const text = await page.textContent('body');
  console.log('BODY TEXT PREVIEW:', text.slice(0, 300));
  await browser.close();
}

test();
