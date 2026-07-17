import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  
  try {
    // Fill login form (assuming basic auth works with any input or predefined input)
    // Often for dev these fields are prefilled or there is a "mode" we can toggle.
    // Let's just click the login button
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(b => b.textContent.includes('Войти'));
        if (loginBtn) loginBtn.click();
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
    
    // Now try to open a visit
    const cards = await page.$$('.kanban-card');
    if (cards.length > 0) {
        await cards[0].click();
        await page.waitForSelector('.visit-flow-progress', { timeout: 5000 });
    } else {
        // Find element by text 'Визиты' or similar to go to schedule?
        // Let's just wait a bit and screenshot
        await new Promise(r => setTimeout(r, 2000));
    }
  } catch (e) {
    console.log("Error in flow", e.message);
  }

  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/8895481b-14de-4240-af15-f80e151280a0/screenshot.png' });
  await browser.close();
})();
