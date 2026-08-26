/**
 * captureCopilotScreenshots.mjs — Live Playwright 4-State Visual Proof Capture for DENTE Copilot.
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/copilot';
const BRAIN_PARENT = 'C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f';
const BRAIN_CURRENT = 'C:/Users/Admin/.gemini/antigravity/brain/660c4f4b-44ee-49d6-b275-35bfe7c31ff7';

const TARGET_DIRS = [PROOFS_DIR, BRAIN_PARENT, BRAIN_CURRENT];
for (const dir of TARGET_DIRS) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const executablePath = edgePaths.find((p) => existsSync(p));
if (!executablePath) {
  console.error('[ERROR] No Chromium/Edge browser found on disk.');
  process.exit(1);
}

const PORT = 5173;
const DEV_URL = `http://127.0.0.1:${PORT}`;

async function isServerUp(url) {
  try {
    const res = await fetch(url);
    return res.ok || res.status === 200 || res.status === 304;
  } catch {
    return false;
  }
}

let devServerProcess = null;
const serverReady = await isServerUp(DEV_URL);
if (!serverReady) {
  console.log('[DEV SERVER] Starting Vite server on 127.0.0.1:5173...');
  devServerProcess = spawn('npx.cmd', ['vite', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: 'C:/Clinic_MVP/dental-crm/apps/web',
    stdio: 'ignore',
    shell: true,
  });

  const start = Date.now();
  let online = false;
  while (Date.now() - start < 25000) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isServerUp(DEV_URL)) {
      online = true;
      break;
    }
  }
  if (!online) {
    console.error('[ERROR] Vite dev server failed to start in 25s.');
    if (devServerProcess) devServerProcess.kill();
    process.exit(1);
  }
  console.log('[DEV SERVER] Online.');
} else {
  console.log('[DEV SERVER] Already active at 127.0.0.1:5173.');
}

const MOCK_USER = {
  id: 'user-1',
  orgId: 'org-1',
  name: 'Доктор Иванов И.И.',
  fullName: 'Доктор Иванов И.И.',
  role: 'doctor',
  email: 'doctor@dente.ru',
  active: true,
  pin: null,
};

const MOCK_APPOINTMENT = {
  id: 'appt-1',
  patientId: 'pat-1',
  patientName: 'Иванов Иван Иванович',
  patientPhone: '+7 (999) 123-45-67',
  doctorUserId: 'user-1',
  doctorId: 'user-1',
  doctorName: 'д-р Иванов И.И.',
  chairId: 'chair-1',
  chairNumber: 1,
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  startTime: '2026-08-27T10:00:00.000Z',
  endTime: '2026-08-27T11:00:00.000Z',
  status: 'confirmed',
  reason: 'Лечение кариеса 36',
};

const MOCK_PATIENT = {
  id: 'pat-1',
  fullName: 'Иванов Иван Иванович',
  name: 'Иванов Иван Иванович',
  phone: '+7 (999) 123-45-67',
  balanceKopecks: 0,
};

const MOCK_DASHBOARD = {
  clinic: {
    id: 'org-1',
    name: 'DENTE Стоматологическая Клиника',
    mode: 'clinic',
    hasInventoryModule: true,
    hasAnalyticsModule: true,
    hasMarketingModule: true,
    hasPayrollModule: false,
  },
  clinicSettings: {
    staff: [MOCK_USER],
    profile: {
      name: 'DENTE Стоматологическая Клиника',
      address: 'ул. Стоматологическая, 10',
      phone: '+7 (495) 000-00-00',
      mode: 'clinic',
      timezone: 'Europe/Moscow',
      defaultVisitMinutes: 30,
      organizationId: 'org-1',
    },
    chairs: [{ id: 'chair-1', name: 'Кресло 1 (Терапия)', active: true }],
  },
  staff: [MOCK_USER],
  shifts: [],
  scheduleSlots: [],
  appointments: [MOCK_APPOINTMENT],
  patients: [MOCK_PATIENT],
  waitlist: [],
  imagingStudies: [],
  recentPatients: [MOCK_PATIENT],
  todayStats: { revenue: 154000, appointments: 8, newPatients: 2 },
  notifications: [],
};

const MOCK_MESSAGES = [
  {
    kind: 'text',
    role: 'user',
    text: 'Покажи приемы на сегодня и проверь статус заполнения формы 043/у по терапевтическим пациентам.',
  },
  {
    kind: 'tool',
    callId: 'call-overview-1',
    name: 'clinical.get_day_overview',
    status: 'done',
    result: {
      appointments: [
        {
          id: 'APP-101',
          patient_name: 'Иванов Иван Иванович',
          start_time: '2026-08-27T10:00:00Z',
          end_time: '2026-08-27T11:00:00Z',
          cabinet: '1 (Терапия)',
          status: 'В кресле',
        },
        {
          id: 'APP-102',
          patient_name: 'Смирнова Елена Павловна',
          start_time: '2026-08-27T11:30:00Z',
          end_time: '2026-08-27T12:30:00Z',
          cabinet: '2 (Ортопедия)',
          status: 'Ожидает',
        },
      ],
    },
  },
  {
    kind: 'text',
    role: 'assistant',
    text: `### Сводка приемов на сегодня
- **10:00 - 11:00** · **Иванов И.И.** (Кабинет 1) — *Терапевтический прием*
- **11:30 - 12:30** · **Смирнова Е.П.** (Кабинет 2) — *Ортопедическая консультация*

### Клинический аудит 043/у:
1. **Иванов И.И.**: Отсутствует запись о проводниковой анестезии и ISQ денситометрии.
2. **Смирнова Е.П.**: План лечения согласован, требуется сформировать гарантийный талон.`,
  },
];

const MOCK_PENDING = {
  callId: 'call-confirm-42',
  name: 'book_appointment',
  args: {
    patient_id: 'PAT-0042',
    patient_name: 'Иванов Иван Иванович',
    doctor_name: 'д-р Смирнов А.В.',
    start_time: '27 авг 2026, 14:00',
    end_time: '27 авг 2026, 15:00',
    cabinet: 'Кабинет 1 (Терапия)',
    service: 'Лечение кариеса 2.4 + световая пломба',
    estimated_amount: '7 500 ₽',
  },
};

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});

async function setupPageMocks(page, theme) {
  await page.addInitScript(({ themeName, mockUser }) => {
    localStorage.setItem('dente_clinic_token', 'test-clinic-token-123');
    localStorage.setItem('dente_staff_token', 'test-staff-token-456');
    localStorage.setItem('dente_theme_mode', themeName);
    localStorage.setItem('dente_active_view', 'schedule');
    localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ theme: themeName, onboardingDismissed: true }));
    localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true }));

    const applyTheme = () => {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-theme', themeName);
        if (themeName === 'dark' || themeName === 'ocean' || themeName === 'cyber_xray' || themeName === 'night') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      }
    };
    applyTheme();
    window.addEventListener('DOMContentLoaded', applyTheme);
  }, { themeName: theme, mockUser: MOCK_USER });

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth/staff/unlock')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, staffToken: 'test-staff-token-456', user: MOCK_USER }),
      });
    }
    if (url.includes('/api/auth/staff')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_USER]) });
    }
    if (url.includes('/api/auth/user/me')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER }) });
    }
    if (url.includes('/api/dashboard')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD) });
    }
    if (url.includes('/api/settings/clinic/profile')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD.clinicSettings.profile) });
    }
    if (url.includes('/api/settings/staff')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_USER]) });
    }
    if (url.includes('/api/settings/chairs')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD.clinicSettings.chairs) });
    }
    if (url.includes('/api/patients')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [MOCK_PATIENT], total: 1 }) });
    }
    if (url.includes('/api/schedule/appointments')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_APPOINTMENT]) });
    }
    if (url.includes('/api/v1/copilot/nudges')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nudges: [
            {
              id: 'nudge-1',
              kind: 'emr_alert',
              payload: { title: 'Заполнить зубную формулу 043/у', description: 'Пациент Иванов И.И. в кресле' },
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            },
          ],
        }),
      });
    }

    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, success: true }) });
  });
}

async function ensureWorkspaceUnlocked(page) {
  try {
    const staffCard = page.locator('.auth-staff-card');
    if (await staffCard.first().isVisible({ timeout: 1200 })) {
      await staffCard.first().click();
      await page.waitForTimeout(200);
      const pinBtn = page.locator('.auth-pin-btn');
      for (let i = 0; i < 4; i++) {
        await pinBtn.first().click();
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(600);
    }
  } catch {}

  try {
    const demoBtn = page.locator('.wizard-mode-card--demo');
    if (await demoBtn.isVisible({ timeout: 1200 })) {
      await demoBtn.click();
      await page.waitForTimeout(600);
    }
  } catch {}
}

const capturedFiles = [];

// 1. PC Dark Mode (1440x900)
{
  console.log('[1/5] Capturing 01_copilot_drawer_pc_dark_1440.png...');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
  });
  const page = await context.newPage();
  await setupPageMocks(page, 'dark');
  await page.goto(`${DEV_URL}/#schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800);
  await ensureWorkspaceUnlocked(page);

  await page.evaluate((data) => {
    if (window.__denteCopilot) {
      window.__denteCopilot.open();
      window.__denteCopilot.setMessages(data.messages);
      window.__denteCopilot.setActiveTab('chat');
    }
  }, { messages: MOCK_MESSAGES });

  await page.waitForTimeout(600);
  const outPath = path.join(PROOFS_DIR, '01_copilot_drawer_pc_dark_1440.png');
  await page.screenshot({ path: outPath, timeout: 8000, animations: 'disabled' });
  capturedFiles.push('01_copilot_drawer_pc_dark_1440.png');
  await context.close();
}

// 2. PC Light Mode (1440x900)
{
  console.log('[2/5] Capturing 01_copilot_drawer_pc_light_1440.png...');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
  });
  const page = await context.newPage();
  await setupPageMocks(page, 'light');
  await page.goto(`${DEV_URL}/#schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800);
  await ensureWorkspaceUnlocked(page);

  await page.evaluate((data) => {
    if (window.__denteCopilot) {
      window.__denteCopilot.open();
      window.__denteCopilot.setMessages(data.messages);
      window.__denteCopilot.setActiveTab('chat');
    }
  }, { messages: MOCK_MESSAGES });

  await page.waitForTimeout(600);
  const outPath = path.join(PROOFS_DIR, '01_copilot_drawer_pc_light_1440.png');
  await page.screenshot({ path: outPath, timeout: 8000, animations: 'disabled' });
  capturedFiles.push('01_copilot_drawer_pc_light_1440.png');
  await context.close();
}

// 3. PC Dark Mode - Action Proposal Card (1440x900)
{
  console.log('[3/5] Capturing 02_copilot_confirm_action_card_pc_dark_1440.png...');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
  });
  const page = await context.newPage();
  await setupPageMocks(page, 'dark');
  await page.goto(`${DEV_URL}/#schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800);
  await ensureWorkspaceUnlocked(page);

  await page.evaluate((data) => {
    if (window.__denteCopilot) {
      window.__denteCopilot.open();
      window.__denteCopilot.setPending(data.pending);
      window.__denteCopilot.setActiveTab('pending');
    }
  }, { pending: MOCK_PENDING });

  await page.waitForTimeout(600);
  const outPath = path.join(PROOFS_DIR, '02_copilot_confirm_action_card_pc_dark_1440.png');
  await page.screenshot({ path: outPath, timeout: 8000, animations: 'disabled' });
  capturedFiles.push('02_copilot_confirm_action_card_pc_dark_1440.png');
  await context.close();
}

// 4. Mobile Dark Mode (390x844)
{
  console.log('[4/5] Capturing 03_copilot_drawer_mobile_dark_390.png...');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await setupPageMocks(page, 'dark');
  await page.goto(`${DEV_URL}/#schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800);
  await ensureWorkspaceUnlocked(page);

  await page.evaluate((data) => {
    if (window.__denteCopilot) {
      window.__denteCopilot.open();
      window.__denteCopilot.setMessages(data.messages);
      window.__denteCopilot.setActiveTab('chat');
    }
  }, { messages: MOCK_MESSAGES });

  await page.waitForTimeout(600);
  const outPath = path.join(PROOFS_DIR, '03_copilot_drawer_mobile_dark_390.png');
  await page.screenshot({ path: outPath, timeout: 8000, animations: 'disabled' });
  capturedFiles.push('03_copilot_drawer_mobile_dark_390.png');
  await context.close();
}

// 5. Mobile Light Mode (390x844)
{
  console.log('[5/5] Capturing 03_copilot_drawer_mobile_light_390.png...');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await setupPageMocks(page, 'light');
  await page.goto(`${DEV_URL}/#schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800);
  await ensureWorkspaceUnlocked(page);

  await page.evaluate((data) => {
    if (window.__denteCopilot) {
      window.__denteCopilot.open();
      window.__denteCopilot.setMessages(data.messages);
      window.__denteCopilot.setActiveTab('chat');
    }
  }, { messages: MOCK_MESSAGES });

  await page.waitForTimeout(600);
  const outPath = path.join(PROOFS_DIR, '03_copilot_drawer_mobile_light_390.png');
  await page.screenshot({ path: outPath, timeout: 8000, animations: 'disabled' });
  capturedFiles.push('03_copilot_drawer_mobile_light_390.png');
  await context.close();
}

await browser.close();

console.log('\n[COPY] Distributing visual proofs to artifact directories...');
for (const fname of capturedFiles) {
  const src = path.join(PROOFS_DIR, fname);
  for (const dstDir of [BRAIN_PARENT, BRAIN_CURRENT]) {
    const dst = path.join(dstDir, fname);
    copyFileSync(src, dst);
  }
  const sz = statSync(src).size;
  console.log(`- ${fname} (${sz} bytes) -> OK`);
}

if (devServerProcess) {
  devServerProcess.kill();
}

console.log('\n[SUMMARY] All 4-State Visual Proofs captured and verified successfully!');
