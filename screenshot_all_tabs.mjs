import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

const routes = [
  { name: 'shift',    hash: '#shift',    label: 'Смена' },
  { name: 'schedule', hash: '#schedule', label: 'Записи' },
  { name: 'patients', hash: '#patients', label: 'Пациенты' },
  { name: 'visit',    hash: '#visit',    label: 'Прием' },
  { name: 'finance',  hash: '#finance',  label: 'Оплаты' },
  { name: 'comms',    hash: '#communications', label: 'Связь' },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// First load
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

for (const route of routes) {
  // Click the nav link
  const navLink = page.locator(`nav a[href="${route.hash}"], button[data-route="${route.name}"]`).first();
  if (await navLink.count()) {
    await navLink.click();
  } else {
    await page.goto(BASE + '/' + route.name, { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `audit_${route.name}.png`, fullPage: true });
  console.log(`✓ ${route.label} → audit_${route.name}.png`);
}

await browser.close();
console.log('Done.');
