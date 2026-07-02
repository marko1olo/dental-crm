import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';

async function ss(page, name, dir = 'C:/Clinic_MVP/dental-crm') {
  const p = `${dir}/ss_${name}.png`;
  await page.screenshot({ path: p });
  console.log(`SS: ${name}`);
}

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().substring(0,200)); });
  page.on('pageerror', e => errors.push('PAGE ERR: ' + e.message.substring(0,200)));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(2500);
  await ss(page, 'A_shift');

  const links = await page.$$eval('nav a', els => els.map(e => ({href: e.getAttribute('href'), txt: e.textContent?.trim().slice(0,20)})));
  console.log('Links:', JSON.stringify(links));

  for (const { href, txt } of links) {
    if (!href) continue;
    await page.goto(`${BASE}/${href}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await ss(page, `B_${href.replace('#','')}`);
  }

  // New appointment: look for "+ Запись" button
  await page.goto(`${BASE}/#schedule`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1000);
  const allBtns = await page.$$eval('button', bs => bs.map(b => b.textContent?.trim().slice(0,30)));
  console.log('Buttons on schedule:', JSON.stringify(allBtns.slice(0,20)));
  const newBtn = await page.$('button:has-text("Запись"), button:has-text("Создать"), button:has-text("+")');
  if (newBtn) {
    await newBtn.click();
    await page.waitForTimeout(1200);
    await ss(page, 'C_new_appointment_open');
  }

  // Patient EMK
  await page.goto(`${BASE}/#patients`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  const pRow = await page.$('table tbody tr, [class*="patient"]:not(nav)');
  if (pRow) { await pRow.click(); await page.waitForTimeout(1500); await ss(page, 'D_patient_emk'); }

  // Visit (EMK dictation)
  await page.goto(`${BASE}/#visit`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(2000);
  await ss(page, 'E_visit');

  console.log('\nCONSOLE ERRORS:');
  errors.slice(0,15).forEach(e => console.log(' >', e));
  await browser.close();
}

audit().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
