import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to local dev server
  await page.goto('http://localhost:5173/');
  
  // Wait for initial load
  await page.waitForTimeout(2000);
  
  const views = [
    { name: 'schedule', selector: 'a[title*="Расписание"]' },
    { name: 'patients', selector: 'a[title*="Пациенты"]' },
    { name: 'visit', selector: 'a[title*="Текущий прием"]' },
    { name: 'documents', selector: 'a[title*="Документы"]' },
  ];

  for (const view of views) {
    try {
      if (view.selector) {
        // Try clicking the nav link if it exists (using a general selector)
        // Let's just click the link containing text
        await page.click(`text=${view.name === 'schedule' ? 'Расписание' : view.name === 'patients' ? 'Пациенты' : view.name === 'visit' ? 'Прием' : 'Документы'}`);
      }
      await page.waitForTimeout(1000); // Wait for render
      await page.screenshot({ path: path.join(process.cwd(), `scratch/screens/${view.name}.png`), fullPage: true });
      console.log(`Saved screenshot for ${view.name}`);
    } catch (e) {
      console.error(`Failed to screenshot ${view.name}:`, e);
    }
  }

  await browser.close();
})();
