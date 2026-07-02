import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Usually the CRM loads into the schedule or patients. 
  // Let's try to click a row in the schedule to open a visit
  try {
    const visitButtons = await page.$$('.schedule-visit-cell');
    if (visitButtons.length > 0) {
      await visitButtons[0].click();
      await page.waitForTimeout(2000);
    } else {
      // maybe we need to click a button that says 'Открыть' or something
      const btns = await page.$$('button');
      for (const b of btns) {
        const text = await b.textContent();
        if (text?.includes('Начать прием') || text?.includes('Открыть')) {
          await b.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
    }
  } catch (e) {
    console.log("Could not navigate to visit:", e);
  }

  // Open the visiograph panel if we are on the visit page
  try {
    const details = await page.$('details.visiograph-analyzer-panel');
    if (details) {
      await page.evaluate(el => el.setAttribute('open', 'true'), details);
    }
  } catch(e) {}

  await page.waitForTimeout(500);

  const shotPath = path.resolve(process.cwd(), 'screenshot.png');
  await page.screenshot({ path: shotPath, fullPage: true });
  
  console.log(`Screenshot saved to ${shotPath}`);
  await browser.close();
})();
