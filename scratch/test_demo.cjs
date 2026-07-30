const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:5173/#finance');
  await page.waitForTimeout(1000);

  const demoBtn = await page.$('button:has-text("Попробовать демо-режим")');
  if (demoBtn) {
    console.log('Found demo button, clicking...');
    await demoBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('Demo button not found directly.');
  }

  const ssPath = path.join(__dirname, 'test_demo_click.png');
  await page.screenshot({ path: ssPath });
  console.log('Saved test screenshot:', ssPath);

  await browser.close();
}

test();
