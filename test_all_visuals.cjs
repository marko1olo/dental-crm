const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const OUTPUT_DIR = path.join(__dirname, 'docs', 'proofs', 'ui_audit');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const states = [
  { name: 'PC_LIGHT',    width: 1440, height: 900, theme: 'light' },
  { name: 'PC_DARK',     width: 1440, height: 900, theme: 'dark'  },
  { name: 'MOBILE_LIGHT', width: 375, height: 812, theme: 'light' },
  { name: 'MOBILE_DARK',  width: 375, height: 812, theme: 'dark'  }
];

// в”Ђв”Ђв”Ђ rich mock data в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const PATIENTS = [
  { id: 'p1', fullName: 'РЎРјРёСЂРЅРѕРІ РђР»РµРєСЃР°РЅРґСЂ Р’РёРєС‚РѕСЂРѕРІРёС‡', phone: '+79991234567', balanceRub:  5000, status: 'active', email: 'smirnov@mail.ru', notes: null, birthDate: '1985-03-12', administrativeProfile: null },
  { id: 'p2', fullName: 'РРІР°РЅРѕРІР° РњР°СЂРёСЏ РРІР°РЅРѕРІРЅР°',        phone: '+79997654321', balanceRub: -2000, status: 'active', email: null,              notes: null, birthDate: '1990-07-24', administrativeProfile: null },
  { id: 'p3', fullName: 'РџРµС‚СЂРѕРІ РџС‘С‚СЂ РџРµС‚СЂРѕРІРёС‡',           phone: '+79990001122', balanceRub:     0, status: 'active', email: null,              notes: null, birthDate: '1978-11-05', administrativeProfile: null }
];

const DASHBOARD_BODY = JSON.stringify({
  workspaceStaticOptions: {
    scheduleStartHour: 8, scheduleEndHour: 20,
    breakStartHour: 13, breakEndHour: 14,
    defaultAppointmentDurationMinutes: 30,
    enableAiDictation: true, enableSmartScheduling: true,
    telegramBotToken: null, telegramAdminChatId: null,
    billingTaxRate: 6, paymentMethods: [], cancellationPolicy: null, termsOfServiceUrl: null
  },
  clinicSettings: {
    profile: {
      organizationId: '00000000-0000-0000-0000-000000000001',
      clinicName: 'РЎС‚РѕРјР°С‚РѕР»РѕРіРёСЏ DENTE',
      legalName: 'РћРћРћ "DENTE РљР»РёРЅРёРєР°"',
      inn: '7701234567',
      kpp: null, ogrn: null,
      address: 'РњРѕСЃРєРІР°, СѓР». Р›РµРЅРёРЅР° 1',
      phone: '+74951234567',
      email: null, website: null,
      medicalLicenseNumber: 'Р›Рћ-77-01-000001',
      medicalLicenseIssuedAt: null, medicalLicenseIssuer: null,
      bankDetails: null, signatoryName: null, signatoryTitle: null,
      mode: 'small_clinic', timezone: 'Europe/Moscow',
      defaultVisitMinutes: 60,
      scheduleDefaults: { workdayStart: '09:00', workdayEnd: '20:00', workingDays: [1,2,3,4,5], appointmentBufferMinutes: 10 },
      networkEnabled: false, egiszEnabled: false,
      updatedAt: new Date().toISOString()
    },
    staff: [
      {
        id: 'u1', organizationId: '00000000-0000-0000-0000-000000000001',
        fullName: 'Р”РѕРєС‚РѕСЂ РРІР°РЅРѕРІ РРІР°РЅ', role: 'Owner',
        specialties: ['therapy'], phone: '+79991111111', email: 'doctor@dente.ru',
        active: true, canSignMedicalRecords: true, canManageMoney: true, canManageImports: true,
        color: '#4f8cff', workingHours: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ],
    chairs: [],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false
  },
  shiftIntelligence: {
    doctorStats: [], shiftSuggestions: [], warnings: [], doctorLoads: [],
    assistantLoads: [], chairLoads: [], scheduleWarnings: [],
    roleQueues: [{ queueId: 'q1', title: 'РџСЂРёС‘Рј', nextAction: 'РџР°С†РёРµРЅС‚ РЎРјРёСЂРЅРѕРІ РІ РєСЂРµСЃР»Рµ', openItems: 3, blockedBy: [], automationHint: null, items: [] }]
  },
  patients: PATIENTS,
  patientInsights: [],
  recommendedActions: [],
  appointments: [
    { id: 'appt-1', patientId: 'p1', patientName: 'РЎРјРёСЂРЅРѕРІ Рђ.Р’.', doctorUserId: 'u1',
      startsAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
      endsAt:   new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
      status: 'Scheduled', type: 'Therapy', chairId: null },
    { id: 'appt-2', patientId: 'p2', patientName: 'РРІР°РЅРѕРІР° Рњ.Р.', doctorUserId: 'u1',
      startsAt: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
      endsAt:   new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
      status: 'Scheduled', type: 'Consultation', chairId: null }
  ],
  appointmentReadiness: [], scheduleSuggestions: [],
  activeVisit: {
    id: '11111111-1111-1111-1111-111111111111',
    patientId: 'p1',
    updatedAt: new Date().toISOString()
  },
  visitCloseChecklist: null, documents: [], imagingStudies: [],
  protocolTemplates: [], serviceCatalog: [],
  treatmentPlanItems: [], treatmentPlanScenarios: [],
  clinicalRules: [], clinicalRuleEvaluations: [],
  clinicalRuleSummary: { failedRequiredRules: [], passedRequiredRules: [], warnings: [] },
  payments: [],
  billingSummary: { totalRevenue: 248000, pendingPayments: 12000, overduePayments: 3500, activePaymentPlans: 2 },
  communicationTemplates: [], communicationTasks: [], communicationEvents: [],
  importBatches: [], speechProviders: [], auditEvents: [],
  todayIso: new Date().toISOString().slice(0, 10),
  clinicName: 'РЎС‚РѕРјР°С‚РѕР»РѕРіРёСЏ DENTE',
  complianceWarnings: [],
  onboardingProgress: { completedSteps: 3, totalSteps: 5, percent: 60, nextStep: 'documents' }
});

const TOOTH_STATES_BODY = JSON.stringify({
  success: true,
  states: [
    { toothNumber: 16, state: 'caries',  diagnosticText: 'Р“Р»СѓР±РѕРєРёР№ РєР°СЂРёРµСЃ' },
    { toothNumber: 25, state: 'crown',   diagnosticText: 'РњРљ РєРѕСЂРѕРЅРєР°'      },
    { toothNumber: 46, state: 'implant', diagnosticText: 'РРјРїР»Р°РЅС‚ Osstem'  }
  ]
});

const TREATMENT_PLANS_BODY = JSON.stringify([
  {
    id: 'tp1', name: 'РљРѕРјРїР»РµРєСЃРЅС‹Р№ РїР»Р°РЅ (Р”РњРЎ)',
    stages: [
      { name: 'РЎР°РЅР°С†РёСЏ',        items: [{ name: 'РљР°СЂРёРµСЃ 16 Р·СѓР±Р°',        price:  5500 }] },
      { name: 'РџСЂРѕС‚РµР·РёСЂРѕРІР°РЅРёРµ', items: [{ name: 'РњРљ РєРѕСЂРѕРЅРєР° 25',          price: 25000 }] },
      { name: 'РРјРїР»Р°РЅС‚Р°С†РёСЏ',    items: [{ name: 'РРјРїР»Р°РЅС‚ Osstem Р·СѓР± 46',  price: 35000 }] }
    ],
    total: 65500
  }
]);

const ANALYTICS_BODY = JSON.stringify({
  ltv:    [{ month: 'РЇРЅРІ', value: 80000 }, { month: 'Р¤РµРІ', value: 110000 }, { month: 'РњР°СЂ', value: 145000 }],
  funnel: [{ stage: 'РџРµСЂРІРёС‡РЅС‹Рµ', count: 120 }, { stage: 'РџР»Р°РЅ Р»РµС‡РµРЅРёСЏ', count: 64 }, { stage: 'Р—Р°РІРµСЂС€РµРЅРѕ', count: 38 }]
});
// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

async function waitForServer() {
  process.stdout.write('Waiting for Vite server... ');
  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:5173/', res => {
          res.statusCode === 200 ? resolve() : reject(new Error(`${res.statusCode}`));
        });
        req.on('error', reject);
        req.end();
      });
      console.log('UP!');
      return;
    } catch { await new Promise(r => setTimeout(r, 1000)); }
  }
}

(async () => {
  await waitForServer();
  console.log('Starting master visual audit...\n');
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`--- TESTING STATE: ${state.name} ---`);

    const context = await browser.newContext({
      viewport:         { width: state.width, height: state.height },
      colorScheme:       state.theme,
      deviceScaleFactor: 2
    });

    const page = await context.newPage();

    // Silence noise, surface real errors
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`  [ERR] ${msg.text().slice(0, 120)}`);
    });

    // в”Ђв”Ђ Playwright route-based mocking в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/dashboard/analytics')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: ANALYTICS_BODY });
      }
      if (url.includes('/api/dashboard')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: DASHBOARD_BODY });
      }
      if (url.includes('/api/auth')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'u1', name: 'Р”РѕРєС‚РѕСЂ РРІР°РЅРѕРІ', role: 'Owner' } }) });
      }
      if (url.includes('/api/patients') && url.includes('/tooth-states')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: TOOTH_STATES_BODY });
      }
      if (url.includes('/api/patients') && url.includes('/treatment-plans')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: TREATMENT_PLANS_BODY });
      }
      if (url.includes('/api/patients')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PATIENTS) });
      }
      // catch-all вЂ“ return 200 so nothing spins forever
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    // Inject theme + fake auth token before page scripts run
    await page.addInitScript((theme) => {
      localStorage.setItem('dente_theme_mode', theme);
      localStorage.setItem('dente_theme', theme);
      localStorage.setItem('dente_staff_token', 'mock_token_for_testing');
      // suppress any localStorage-guard that demands a real token
      window.__TEST_MODE__ = true;
    }, state.theme);

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const screenshot = async (label, hash) => {
      await page.evaluate(h => { window.location.hash = h; }, hash);
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const file = path.join(OUTPUT_DIR, `${label}_${state.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  вњ“ ${label}`);
    };

    await screenshot('Scheduler',       '#schedule');
    await screenshot('PatientCard',     '#patients');
        // --- ODONTOGRAM INTERACTION TEST ---
    await page.evaluate(h => { window.location.hash = h; }, '#/odontogram');
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1000);
    
    // Click tooth 46
    await page.evaluate(() => {
      const teeth = document.querySelectorAll('.tooth-svg-wrapper');
      for (const t of teeth) {
        if (t.textContent && t.textContent.includes('46')) {
           t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
           return;
        }
      }
    });
    await page.waitForTimeout(500);
    
    // Click Implant
    await page.evaluate(() => {
      const btn = document.querySelector('.tooth-menu-btn.implant');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    // Click tooth 16
    await page.evaluate(() => {
      const teeth = document.querySelectorAll('.tooth-svg-wrapper');
      for (const t of teeth) {
        if (t.textContent && t.textContent.includes('16')) {
           t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
           return;
        }
      }
    });
    await page.waitForTimeout(500);
    
    // Click Caries
    await page.evaluate(() => {
      const btn = document.querySelector('.tooth-menu-btn.caries');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(1000);

    const odontogramFile = path.join(OUTPUT_DIR, 'OdontogramSynced_' + state.name + '.png');
    await page.screenshot({ path: odontogramFile, fullPage: true });
    console.log('  \u2713 OdontogramSynced');
    // -----------------------------------
    await screenshot('TreatmentPlanner','#/plans');
    await screenshot('Dashboard',       '#finance');
    await screenshot('ExecutiveBI',     '#analytics');
        await screenshot('ExecutiveBI',     '#analytics');
    await screenshot('PatientPortal',   '#/portal');

    // Wait and go back to finance
    await page.evaluate(h => { window.location.hash = h; }, '#finance');
    await page.waitForTimeout(1000);
    
    // Open Billing Modal
    await page.evaluate(() => {
      const btn = document.querySelector('.demo-pay-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const modalFile = path.join(OUTPUT_DIR, 'BillingModal_' + state.name + '.png');
    await page.screenshot({ path: modalFile, fullPage: true });
    console.log('  \u2713 BillingModal');
    
    // Pay and open Receipt
    await page.evaluate(() => {
      const btn = document.querySelector('.pay-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const receiptFile = path.join(OUTPUT_DIR, 'ThermalReceipt_' + state.name + '.png');
    await page.screenshot({ path: receiptFile, fullPage: true });
    console.log('  \u2713 ThermalReceipt');

    await context.close();
    console.log('');
  }

  await browser.close();
  console.log('=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===');
})();


