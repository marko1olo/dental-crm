import { chromium } from 'playwright';
import path from 'path';

(async () => {
  console.log('Starting playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1440, height: 900 });
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  
  // Try to close onboarding if it's open
  try {
    const gotItBtn = await page.$('text="Понятно"');
    if (gotItBtn) await gotItBtn.click();
  } catch (e) {}

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot_schedule.png', fullPage: true });
  console.log('Saved screenshot_schedule.png');

  // Find navigation buttons
  // In App.tsx, the nav is probably an aside or header with buttons.
  // The views are: Расписание (schedule), Пациенты (patients), Прием (visit), Документы (documents), Настройки (settings)
  const views = [
    { text: 'Пациенты', file: 'screenshot_patients.png' },
    { text: 'Прием', file: 'screenshot_visit.png' },
    { text: 'Документы', file: 'screenshot_documents.png' },
    { text: 'Настройки', file: 'screenshot_settings.png' }
  ];

  for (const view of views) {
    try {
      console.log(`Clicking ${view.text}...`);
      // We look for a button or link with the text
      await page.click(`text="${view.text}"`);
      await page.waitForTimeout(1500); // Wait for render
      await page.screenshot({ path: view.file, fullPage: true });
      console.log(`Saved ${view.file}`);
    } catch (err) {
      console.log(`Could not click ${view.text}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
