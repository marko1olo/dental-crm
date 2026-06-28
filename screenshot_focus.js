import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// Логируем все консольные выводы из браузера
page.on('console', msg => {
  console.log('BROWSER LOG:', msg.text());
});

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 20000 });

// Click 'Открыть прием'
const openBtn = page.locator('button:has-text("Открыть прием")').first();
if (await openBtn.count() > 0) {
  await openBtn.click();
  await page.waitForTimeout(2500);
}

// 1. Клик по штампу "Лечение"
console.log("Выбираем штамп 'Лечение'...");
await page.locator('.stamp-treatment').click();
await page.waitForTimeout(400);

// 2. Клик по квадранту ВЧ Право (Q1)
console.log("Выбираем квадрант Q1...");
await page.locator('button:has-text("ВЧ Право (Q1)")').click();
await page.waitForTimeout(400);

// 3. Клик по зубу 15 (чтобы покрасить его в Лечение мгновенно!)
console.log("Кликаем по зубу 15...");
await page.locator('button[aria-label="Зуб 15"]').click();
await page.waitForTimeout(1000); // Даем больше времени для сохранения состояния

// Скроллим к карте зубов
await page.evaluate(() => {
  const el = document.querySelector('.tooth-map');
  if (el) el.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'C:/Clinic_MVP/shot_tooth_map_zoomed.png', fullPage: false });

// 4. Клик по вкладке 'Жалобы' в ЭМК
console.log("Кликаем по вкладке 'Жалобы'...");
await page.locator('.emk-tab-button:has-text("Жалобы")').click();
await page.waitForTimeout(600);

// Скроллим к ЭМК
await page.evaluate(() => {
  const el = document.querySelector('.visit-note-panel');
  if (el) el.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'C:/Clinic_MVP/shot_emk_focused.png', fullPage: false });

await browser.close();
console.log('done');
