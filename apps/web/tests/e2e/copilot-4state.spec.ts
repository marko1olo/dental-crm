import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const DENTE_CLINIC_TOKEN_KEY = 'dente_clinic_token';
const DENTE_STAFF_TOKEN_KEY = 'dente_staff_token';
const MOCK_CLINIC_TOKEN = 'test-clinic-token-abc123';
const MOCK_STAFF_TOKEN = 'test-staff-token-xyz789';

const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/copilot';

const MOCK_USER = {
  id: 'user-doc-1',
  orgId: 'org-1',
  name: 'Д-р Смирнов А.П.',
  role: 'doctor',
  email: 'doctor@dente.ru',
  active: true,
  pin: null,
};

const MOCK_DASHBOARD = {
  clinic: {
    id: 'org-1',
    name: 'Стоматология ДЕНТЕ',
    mode: 'clinic',
    hasInventoryModule: true,
    hasAnalyticsModule: true,
    hasMarketingModule: true,
    hasPayrollModule: true,
  },
  clinicSettings: {
    name: 'Стоматология ДЕНТЕ',
    address: 'г. Москва, ул. Клиническая, 10',
    phone: '+7 (495) 123-45-67',
    staff: [MOCK_USER],
  },
  staff: [MOCK_USER],
  patients: [
    {
      id: 'pat-101',
      fullName: 'Сидоров Алексей Петрович',
      phone: '+7 (916) 123-45-67',
      birthDate: '1988-04-12',
      balanceRub: 12000,
    },
  ],
  appointments: [
    {
      id: 'app-101',
      patientId: 'pat-101',
      doctorUserId: 'user-doc-1',
      chairId: 'c1',
      status: 'in_treatment',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      serviceTitle: 'Лечение кариеса дентина зуба 36',
    },
  ],
  serviceCatalog: [
    { id: 's1', code: 'A16.07.002.010', name: 'Препарирование кариозной полости', priceRub: 2500, category: 'therapy' },
  ],
  inventoryItems: [],
  shifts: [],
  scheduleSlots: [],
  waitlist: [],
  imagingStudies: [],
  todayStats: { revenue: 85000, appointments: 8, newPatients: 3 },
  notifications: [],
};

async function setupPage(page: Page, theme: 'light' | 'dark', viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(
    ({ clinicKey, staffKey, clinicToken, staffToken, t }) => {
      localStorage.setItem(clinicKey, clinicToken);
      localStorage.setItem(staffKey, staffToken);
      localStorage.setItem('dente_workspace_perspective', 'presentation');
      localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, step: 'done', savedAt: new Date().toISOString() }));
      localStorage.setItem('dente_onboarding_completed', 'true');
      localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, theme: t }));
      localStorage.setItem('dente_active_session_token', 'mock-session-token');
      localStorage.setItem('dente_user_role', 'doctor');
      localStorage.setItem('dente_user_name', 'Д-р Смирнов А.П.');
      localStorage.setItem('dente_theme', t);
      localStorage.setItem('dente_theme_mode', t);
      localStorage.setItem('dente_offline_readiness_banner_dismissed_v1', 'true');
    },
    {
      clinicKey: DENTE_CLINIC_TOKEN_KEY,
      staffKey: DENTE_STAFF_TOKEN_KEY,
      clinicToken: MOCK_CLINIC_TOKEN,
      staffToken: MOCK_STAFF_TOKEN,
      t: theme,
    },
  );

  await page.route('**/*', async (route) => {
    let url: URL;
    try {
      url = new URL(route.request().url());
    } catch {
      return route.continue();
    }

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname.startsWith('/api/auth/user/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: MOCK_USER, ...MOCK_USER }),
        });
      }
      if (url.pathname.startsWith('/api/dashboard')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DASHBOARD),
        });
      }
      if (url.pathname.startsWith('/api/system/')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    return route.continue();
  });
}

async function prepareCopilotState(page: Page, theme: 'light' | 'dark') {
  await page.waitForFunction(() => typeof (window as any).__denteCopilot !== 'undefined', { timeout: 25000 });

  await page.evaluate((currentTheme) => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    const copilot = (window as any).__denteCopilot;
    copilot.open();
    copilot.setMessages([
      {
        id: 'msg-1',
        kind: 'text',
        role: 'user',
        text: 'Осмотр: зуб 36 глубокий кариес дентина, боли от холодного. Составь протокол SOAP и смету лечения.',
      },
      {
        id: 'msg-2',
        kind: 'text',
        role: 'assistant',
        text: `### Протокол SOAP (Зуб 36 — Кариес дентина)
- **S (Жалобы)**: Кратковременные боли от термических раздражителей (холодное), быстро проходящие после устранения.
- **O (Объективно)**: На окклюзионной поверхности зуба 36 глубокая кариозная полость дентина, зондирование слабо болезненно. ЭОД 8 мкА.
- **A (Диагноз)**: K02.1 Кариес дентина (Зуб 36).
- **P (План)**: Анестезия Артикаин 1:200000 1.7 мл, препарирование, изолирующая прокладка SDR, пломба светового отверждения.

Подготовил предварительную смету для согласования:`,
      },
    ]);
    copilot.setPending({
      callId: 'call-est-1',
      name: 'apply_treatment_estimate',
      toolName: 'apply_treatment_estimate',
      args: {
        title: 'Смета лечения кариеса зуба 36',
        servicesCount: 3,
        amountKopecks: 765000,
        discountPercent: 10,
        doctorAutonomyGuaranteed: true,
      },
    });
  }, theme);
}

test.describe('DENTE Copilot 4-State Visual Proof Gate (PC & Mobile, Light & Dark)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(PROOFS_DIR)) {
      fs.mkdirSync(PROOFS_DIR, { recursive: true });
    }
  });

  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  // 1. PC Light (1440x900)
  test('01. PC Light Viewport (1440x900) — Copilot Drawer with Two-Phase Guard', async ({ page }) => {
    await setupPage(page, 'light', { width: 1440, height: 900 });
    await page.goto('/?copilot=open', { waitUntil: 'domcontentloaded' });
    await prepareCopilotState(page, 'light');

    await expect(page.locator('.copilot-drawer')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-action-confirm-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-composer-input')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    const screenshotPath = path.join(PROOFS_DIR, '01_copilot_drawer_pc_light_1440x900.png');
    await page.screenshot({ path: screenshotPath });
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(40000);
  });

  // 2. PC Dark (1440x900)
  test('02. PC Dark Viewport (1440x900) — Copilot Drawer in Dark Mode', async ({ page }) => {
    await setupPage(page, 'dark', { width: 1440, height: 900 });
    await page.goto('/?copilot=open', { waitUntil: 'domcontentloaded' });
    await prepareCopilotState(page, 'dark');

    await expect(page.locator('.copilot-drawer')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-action-confirm-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-composer-input')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    const screenshotPath = path.join(PROOFS_DIR, '02_copilot_drawer_pc_dark_1440x900.png');
    await page.screenshot({ path: screenshotPath });
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(40000);
  });

  // 3. Mobile Light (390x844)
  test('03. Mobile Light Viewport (390x844) — Native Bottom Sheet Drawer', async ({ page }) => {
    await setupPage(page, 'light', { width: 390, height: 844 });
    await page.goto('/?copilot=open', { waitUntil: 'domcontentloaded' });
    await prepareCopilotState(page, 'light');

    await expect(page.locator('.copilot-drawer')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-action-confirm-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-drawer-drag-handle')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    const screenshotPath = path.join(PROOFS_DIR, '03_copilot_drawer_mobile_light_390x844.png');
    await page.screenshot({ path: screenshotPath });
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(40000);
  });

  // 4. Mobile Dark (390x844)
  test('04. Mobile Dark Viewport (390x844) — Native Bottom Sheet Drawer Dark Mode', async ({ page }) => {
    await setupPage(page, 'dark', { width: 390, height: 844 });
    await page.goto('/?copilot=open', { waitUntil: 'domcontentloaded' });
    await prepareCopilotState(page, 'dark');

    await expect(page.locator('.copilot-drawer')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-action-confirm-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.copilot-drawer-drag-handle')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    const screenshotPath = path.join(PROOFS_DIR, '04_copilot_drawer_mobile_dark_390x844.png');
    await page.screenshot({ path: screenshotPath });
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(40000);
  });
});
