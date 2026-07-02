import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let initial data load
  
  // Find all sidebar links
  const navLinks = await page.$$('nav a');
  console.log(`Found ${navLinks.length} navigation links.`);

  const outputDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\19527560-fbad-4059-97a2-76c3b38db9cc';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // We will iterate through each link, click it, wait for network/load, and take a screenshot
  for (let i = 0; i < navLinks.length; i++) {
    // Re-select nav links in case DOM changed
    const links = await page.$$('nav a');
    if (!links[i]) continue;
    
    const href = await links[i].getAttribute('href');
    const text = await links[i].textContent();
    const safeName = text ? text.replace(/[^a-z0-9а-яё]/gi, '_').toLowerCase() : `page_${i}`;
    
    console.log(`Navigating to ${href} (${safeName})...`);
    await links[i].click();
    await page.waitForTimeout(2000); // wait for page to render
    
    const shotPath = path.join(outputDir, `${safeName}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  await browser.close();
})();
