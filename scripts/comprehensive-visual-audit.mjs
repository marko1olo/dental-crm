import puppeteer from 'puppeteer';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const APP_URL = 'http://127.0.0.1:5173';
const ARTIFACTS_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/e1a85de0-5463-4dad-9cfd-a687decd3eb2';
const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dashboardMockRaw = await fsPromises.readFile(path.join(__dirname, '..', 'mock-dashboard.json'), 'utf8');

const NOW = new Date().toISOString();

const LOCALSTORAGE_SEED = {
  'dente_clinic_token': 'audit-bypass-token',
  'dente_staff_token': 'audit-bypass-staff',
  'dental-crm:web-ui-preferences:v1': JSON.stringify({
    version: 1,
    selectedWorkspaceRole: 'owner',
    selectedSpecialty: 'therapist',
    onboardingDismissed: true,
    onboardingDraftMode: false,
    onboardingStep: 'done',
    onboardingDismissedAt: NOW,
    savedAt: NOW
  })
};

const VIEWPORTS = [
  { width: 1440, height: 900, label: 'PC', isMobile: false, hasTouch: false },
  { width: 375,  height: 812,  label: 'Mobile', isMobile: true, hasTouch: true },
];

const THEMES = ['light', 'dark'];

const VIEWS = [
  { name: 'Clinical_Scheduler', hash: '#schedule' },
  { name: 'Odontogram', hash: '#/odontogram' },
  { name: 'Treatment_Planner', hash: '#/plans' },
  { name: 'Patient_Portal', hash: '#/portal' },
];

const mockPatient1 = {
  id: "00000000-0000-0000-0000-000000000001",
  organizationId: "00000000-0000-0000-0000-000000000000",
  fullName: "Смирнов Алексей Васильевич",
  status: "active",
  birthDate: "1980-05-15",
  phone: "+79991234567",
  email: "smirnov.alex@gmail.com",
  notes: "Острая аллергия на лидокаин! Только ультракаин без адреналина.",
  administrativeProfile: {
    inn: "770102030405",
    snils: "123-456-789 01",
    passport: "4508 123456"
  },
  balanceRub: -5000,
  createdAt: NOW,
  updatedAt: NOW
};

const mockPatient2 = {
  id: "00000000-0000-0000-0000-000000000002",
  organizationId: "00000000-0000-0000-0000-000000000000",
  fullName: "Иванова Марина Игоревна",
  status: "active",
  birthDate: "1992-08-20",
  phone: "+79997654321",
  email: "ivanova.marina@mail.ru",
  notes: "Беременность 2 триместр.",
  administrativeProfile: null,
  balanceRub: 12500,
  createdAt: NOW,
  updatedAt: NOW
};

const mockVisit = {
  id: "00000000-0000-0000-0000-000000000002",
  organizationId: "00000000-0000-0000-0000-000000000000",
  patientId: mockPatient1.id,
  appointmentId: "00000000-0000-0000-0000-000000000003",
  status: "draft",
  revision: 1,
  complaint: "Острая боль при накусывании зуба 4.6",
  anamnesis: "Боль появилась несколько дней назад, усиливается от температурных раздражителей.",
  objectiveStatus: "На дистально-жевательной поверхности 4.6 глубокая кариозная полость, зондирование дна резко болезненно.",
  diagnosis: "К04.0 Начальный пульпит зуба 4.6",
  treatmentPlan: "Эндодонтическое лечение каналов 4.6, временная пломба.",
  doctorSummary: "Проведена анестезия Sol. Ultracaini 1.7ml. Механическая и медикаментозная обработка каналов.",
  createdAt: NOW,
  updatedAt: NOW
};

const mockToothStates = [
  { id: "ts-1", patientId: mockPatient1.id, toothNumber: 16, state: "Caries", updatedAt: NOW },
  { id: "ts-2", patientId: mockPatient1.id, toothNumber: 25, state: "Crown", updatedAt: NOW },
  { id: "ts-3", patientId: mockPatient1.id, toothNumber: 46, state: "Implant", updatedAt: NOW }
];

const mockTreatmentPlans = [
  {
    id: "tp-1",
    patientId: mockPatient1.id,
    name: "Органосохраняющее лечение (Standard)",
    status: "Accepted",
    totalPrice: "40000",
    createdAt: NOW,
    updatedAt: NOW,
    items: [
      { id: "tpi-1", planId: "tp-1", toothNumber: 46, priceId: "p-1", quantity: 1, price: "12000", discount: "1200", phase: 1 },
      { id: "tpi-2", planId: "tp-1", toothNumber: 46, priceId: "p-2", quantity: 1, price: "28000", discount: "1000", phase: 2 }
    ]
  },
  {
    id: "tp-2",
    patientId: mockPatient1.id,
    name: "Удаление и одномоментная имплантация (Premium)",
    status: "Draft",
    totalPrice: "125000",
    createdAt: NOW,
    updatedAt: NOW,
    items: [
      { id: "tpi-3", planId: "tp-2", toothNumber: 46, priceId: "p-3", quantity: 1, price: "15000", discount: "0", phase: 1 },
      { id: "tpi-4", planId: "tp-2", toothNumber: 46, priceId: "p-4", quantity: 1, price: "110000", discount: "5000", phase: 2 }
    ]
  }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('[Audit] ===== COMPLETE CROSS-DEVICE PRODUCTION-GRADE AUDIT =====');
  
  if (!fs.existsSync(PROOFS_DIR)) fs.mkdirSync(PROOFS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-web-security',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();

  // strict browser log/crash handlers
  page.on('pageerror', err => {
    console.error('[Browser Crash Error]:', err.toString());
    process.exit(1);
  });

  page.on('requestfailed', request => {
    const url = request.url();
    // Ignore canceled navigation requests (which occur normally in React Router)
    if (request.failure().errorText === 'net::ERR_ABORTED') return;
    
    if (url.includes('/api/') || url.startsWith(APP_URL)) {
      console.error(`[Browser Network Failure]: ${url} failed with ${request.failure().errorText}`);
      process.exit(1);
    }
  });

  await page.setRequestInterception(true);

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      if (url.includes('/api/auth/session') || url.includes('/api/auth/user/me')) {
        request.respond({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ user: { id: "00000000-0000-0000-0000-000000000009", fullName: "Иванов И.И.", role: "owner", active: true } })
        });
      } else if (url.includes('/api/dashboard')) {
        request.respond({ status: 200, contentType: 'application/json', body: dashboardMockRaw });
      } else if (url.includes('/tooth-states')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, states: mockToothStates }) });
      } else if (url.includes('/treatment-plans')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, plans: mockTreatmentPlans }) });
      } else if (url.includes('/administrative-profile')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPatient1.administrativeProfile) });
      } else if (url.includes('/api/patients/00000000-0000-0000-0000-000000000001')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPatient1) });
      } else if (url.includes('/api/patients')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([mockPatient1, mockPatient2]) });
      } else if (url.includes('/api/visits/') || url.includes('/api/visit/')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVisit) });
      } else if (url.includes('/api/clinical/rules')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, rules: [] }) });
      } else if (url.includes('/api/system/local-bridges/readiness')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ isAvailable: false, bridges: [] }) });
      } else if (url.includes('/api/system/local-bridges/use-plans')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ readiness: { isAvailable: false, bridges: [] } }) });
      } else if (url.includes('/api/speech/providers/runtime')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/api/speech/recording-strategy')) {
        request.respond({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ recommendedPath: "browser_live", providerId: "groq", providerLabel: "Groq STT", serverUploadAllowed: true, localQueueRequired: false })
        });
      } else if (url.includes('/api/speech/recordings/recovery')) {
        request.respond({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ recordings: [], totalRecordings: 0, generatedAt: NOW })
        });
      } else if (url.includes('/api/speech/status')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: "ready" }) });
      } else if (url.includes('/api/speech/gateway-health')) {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: [] }) });
      } else {
        request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    } else {
      request.continue();
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Browser Console Error]:`, msg.text());
    }
  });

  const screenshotSizes = {};

  try {
    console.log('[Audit] Step 1: Initializing localStorage...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate((seed) => {
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
    }, LOCALSTORAGE_SEED);

    console.log('[Audit] Step 2: Running screenshots for all views and viewports...');

    for (const view of VIEWS) {
      console.log(`\n[Audit] === View: ${view.name} ===`);

      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          // 1. Set viewport and prefers-color-scheme
          await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
          await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
          
          // 2. Set theme in localStorage to prevent React overrides
          await page.evaluate((t) => {
            localStorage.setItem('dente_theme', t);
          }, theme);
          
          // 3. Load page cleanly
          await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          await page.evaluate((t) => {
            if (t === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          }, theme);
          
          await sleep(3500); // allow app load & session fetches to settle at #shift

          // 3. Set the hash of the target view
          console.log(`  [Navigate] Setting hash to ${view.hash} (${vp.label}, ${theme})...`);
          await page.evaluate((hashVal) => {
            window.location.hash = hashVal;
          }, view.hash);
          
          await sleep(2500); // wait for view to render

          // 4. View-specific interaction logic
          if (view.name === 'Patient_Portal') {
            const authContainerExists = await page.evaluate(() => !!document.querySelector('.portal-auth-container'));
            if (authContainerExists) {
              console.log('  [Action] Logging in to patient portal...');
              await page.type('input[type="tel"]', '79991234567');
              await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Send Code') || b.textContent.includes('OTP'));
                if (btn) btn.click();
              });
              await sleep(1200);
              await page.type('input[placeholder="1234"]', '1234');
              await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Verify') || b.textContent.includes('Login'));
                if (btn) btn.click();
              });
              await sleep(2500);
            }
          }

          if (view.name === 'Odontogram') {
            await page.waitForSelector('.tooth-svg-wrapper');
            const clicked = await page.evaluate(() => {
              const wrappers = Array.from(document.querySelectorAll('.tooth-svg-wrapper'));
              const tooth46 = wrappers.find(w => w.innerText.includes('46'));
              if (tooth46) {
                tooth46.click();
                return true;
              }
              return false;
            });
            if (clicked) {
              console.log('  [Action] Clicked tooth 46 to open radial menu');
              await sleep(1500); // wait for menu animation
            } else {
              console.error('  [Warning] Tooth 46 wrapper not found!');
            }
          }

          // 5. Strict error validation
          let pageText = '';
          try {
            pageText = await page.evaluate(() => document.body.innerText);
          } catch (e) {
            console.error('Failed to get page text:', e);
          }
          
          const errorIndicators = [
            'Рабочий сервер недоступен',
            'Данные клиники не загружены',
            'Внутренняя ошибка',
            'Vite Error Overlay',
            'Cannot read properties of undefined'
          ];
          for (const indicator of errorIndicators) {
            if (pageText.includes(indicator)) {
              console.error(`[FAIL] Page contains error indicator "${indicator}" on view "${view.name}" (${vp.label}, ${theme})`);
              process.exit(1);
            }
          }

          const filename = `${view.name}_${vp.label}_${theme}.png`;
          const filepathArtifacts = path.join(ARTIFACTS_DIR, filename);
          const filepathProofs = path.join(PROOFS_DIR, filename);
          
          await page.screenshot({ path: filepathArtifacts, fullPage: true });
          fs.copyFileSync(filepathArtifacts, filepathProofs);
          
          // Verify size and check duplicates
          const size = fs.statSync(filepathArtifacts).size;
          console.log(`  [Saved] ${filename} (${size} bytes)`);

          // 1. Blank page check (< 15KB)
          if (size < 15000) {
            console.error(`[FAIL] Screenshot ${filename} is too small (${size} bytes). Page is likely empty/blank.`);
            process.exit(1);
          }

          // 2. Duplicate layout check (< 1% size difference)
          const sizeKey = `${vp.label}_${theme}`;
          if (!screenshotSizes[sizeKey]) {
            screenshotSizes[sizeKey] = [];
          }
          for (const prev of screenshotSizes[sizeKey]) {
            const diffPercent = Math.abs(prev.size - size) / Math.max(prev.size, size);
            if (diffPercent < 0.01) {
              console.error(`[FAIL] Duplicate layout size detected: "${filename}" is too similar to "${prev.filename}" (diff: ${(diffPercent * 100).toFixed(2)}%). Both likely show the same error page.`);
              process.exit(1);
            }
          }
          screenshotSizes[sizeKey].push({ filename, size });
        }
      }
    }
    console.log('\n[Audit] ===== DONE =====');
  } catch (err) {
    console.error('[Audit] FATAL:', err);
    try {
      const h = await page.evaluate(() => window.location.hash);
      const text = await page.evaluate(() => document.body.innerText);
      console.log('--- Diagnostic Info ---');
      console.log('Current Hash:', h);
      console.log('Visible Text:', text.slice(0, 1000));
      const diagPath = path.join(PROOFS_DIR, 'debug_fatal.png');
      await page.screenshot({ path: diagPath });
      console.log('Saved debug_fatal.png');
    } catch (diagErr) {
      console.error('Failed to gather diagnostic info:', diagErr);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
