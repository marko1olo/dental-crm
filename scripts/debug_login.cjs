const { chromium } = require('playwright');
const fs = require('fs');

async function debugLogin() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?demo=true#documents', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const quickDemoBtn = page.locator('button:has-text("Быстрый вход в Демо-тур")').first();
  console.log('quickDemoBtn exists:', await quickDemoBtn.count());
  await quickDemoBtn.click();
  await page.waitForTimeout(1500);

  // Take screenshot of what modal or screen popped up
  await page.screenshot({ path: 'scripts/debug_login_step.png' });
  console.log('Saved debug_login_step.png');

  // Print all buttons on page
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
  });
  console.log('Buttons on screen:', buttons);

  await browser.close();
}

debugLogin().catch(console.error);
