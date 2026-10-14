import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('docs/proofs/insurance');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-insurance-001';
const MOCK_STAFF_TOKEN = 'test-staff-token-insurance-002';

const MOCK_USER = {
  id: 'user-doc-1',
  orgId: 'org-1',
  name: 'Д-р Смирнов А.П.',
  role: 'doctor',
  email: 'doctor@dente.ru',
  pin: null,
};

const MOCK_CLINIC_PROFILE = {
  id: 'org-1',
  name: 'Стоматология DENTE',
  address: 'ул. Медицинская, 12',
  phone: '+7 (495) 123-45-67',
  mode: 'clinic',
  features: {
    hasInventoryModule: true,
    hasAnalyticsModule: true,
    hasMarketingModule: true,
    hasPayrollModule: true,
  },
};

const MOCK_DASHBOARD = {
  clinic: {
    id: 'org-1',
    name: 'Стоматология DENTE',
    mode: 'clinic',
    hasInventoryModule: true,
    hasAnalyticsModule: true,
    hasMarketingModule: true,
    hasPayrollModule: true,
  },
  staff: [MOCK_USER],
  shifts: [],
  scheduleSlots: [],
  appointments: [],
  waitlist: [],
  imagingStudies: [],
  recentPatients: [],
  todayStats: { revenue: 3842500, appointments: 812, newPatients: 428 },
  notifications: [],
};

async function setupPage(page, theme, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(
    ({ clinicKey, staffKey, clinicToken, staffToken, t }) => {
      window.localStorage.setItem(clinicKey, clinicToken);
      window.localStorage.setItem(staffKey, staffToken);
      window.localStorage.setItem('dente_theme', t);
      document.documentElement.setAttribute('data-theme', t);
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    {
      clinicKey: DENTE_CLINIC_TOKEN_KEY,
      staffKey: DENTE_STAFF_TOKEN_KEY,
      clinicToken: MOCK_CLINIC_TOKEN,
      staffToken: MOCK_STAFF_TOKEN,
      t: theme,
    }
  );

  await page.route('**/api/auth/user/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
  });
  await page.route('**/api/dashboard', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
  });
  await page.route('**/api/settings/clinic/profile**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CLINIC_PROFILE) });
  });
  await page.route('**/api/settings/preferences**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme, language: 'ru' }) });
  });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const targets = [
    {
      id: '01_insurance_pc_light_1440.png',
      theme: 'light',
      viewport: { width: 1440, height: 900 },
      isMobile: false,
    },
    {
      id: '02_insurance_pc_dark_1440.png',
      theme: 'dark',
      viewport: { width: 1440, height: 900 },
      isMobile: false,
    },
    {
      id: '03_insurance_mobile_light_390.png',
      theme: 'light',
      viewport: { width: 390, height: 844 },
      isMobile: true,
    },
    {
      id: '04_insurance_mobile_dark_390.png',
      theme: 'dark',
      viewport: { width: 390, height: 844 },
      isMobile: true,
    },
  ];

  for (const t of targets) {
    const context = await browser.newContext({
      viewport: t.viewport,
      isMobile: t.isMobile,
      hasTouch: t.isMobile,
    });
    const page = await context.newPage();
    await setupPage(page, t.theme, t.viewport);

    await page.goto('http://127.0.0.1:5174/?dms=letter', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Apply theme strictly
    await page.evaluate((theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, t.theme);

    // Wait for the DMS modal window to be visible
    const modal = page.locator('.dms-modal-window');
    await modal.waitFor({ state: 'visible', timeout: 10000 });

    const screenshotPath = path.join(OUT_DIR, t.id);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const stats = fs.statSync(screenshotPath);
    console.log(`Captured: ${t.id} (${stats.size} bytes)`);
    if (stats.size < 20000) {
      throw new Error(`File ${t.id} size (${stats.size}) is under 20KB`);
    }

    await context.close();
  }

  await browser.close();
  console.log('All 4 insurance screenshots successfully captured and verified!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
