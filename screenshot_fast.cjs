const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21";

const states = [
  { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light", pediatric: false },
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark",  pediatric: false },
  { name: "MOBILE_LIGHT",width: 390,  height: 844,  theme: "light", pediatric: false },
  { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark",  pediatric: false }
];

const MOCK_DASHBOARD = {
  activeVisit: null,
  appointments: [],
  patients: [],
  clinicSettings: {
    staff: [
      { id: "staff-1", fullName: "Dr. House", role: "doctor", active: true, specialties: ["therapist"], color: "#6366f1", pinCode: "1234" }
    ],
    chairs: [
      { id: "chair-1", name: "Кресло 1", active: true, specialization: "therapist" }
    ],
    name: "Клиника DENTE",
    currency: "RUB",
    phone: "+7 999 000-00-00"
  },
  schedule: [],
  shiftIntelligence: {
    roleQueues: [],
    scheduleWarnings: [],
    doctorLoads: [],
    chairLoads: [],
    assistantLoads: [],
    modeFit: {
      title: "Стандартный режим",
      fitScore: 85,
      lowFrictionNextStep: "Начните прием первого пациента",
      blockers: [],
      upgrades: ["Заполните профиль клиники"],
      resources: []
    }
  },
  billingSummary: {
    totalPlannedRub: 0,
    totalDueRub: 0,
    totalPaidRub: 0,
    openTreatmentItems: 0,
    unpaidDocuments: 0,
    taxDeductionEligibleRub: 0
  },
  clinicalRuleSummary: {
    totalActive: 0,
    highestSeverity: null,
    totalCritical: 0
  },
  scheduleSuggestions: [],
  stats: { revenue: 0, visits: 0, newPatients: 0 },
  notifications: []
};

const MOCK_LEADS = [
  { id: "lead-1", name: "Иванов Иван Иванович", phone: "+7 900 123-45-67", status: "new", expectedRevenue: "15000", createdAt: new Date().toISOString(), source: "Website" },
  { id: "lead-2", name: "Петрова Анна", phone: "+7 911 987-65-43", status: "contacted", expectedRevenue: "8000", createdAt: new Date().toISOString(), source: "Instagram" },
  { id: "lead-3", name: "Смирнов Алексей", phone: "+7 925 555-11-22", status: "consult_booked", expectedRevenue: "25000", createdAt: new Date().toISOString(), source: "Referral" }
];

const MOCK_WORKSPACE_PROFILE = {
  hasAssistants: true,
  hasMultipleChairs: true,
  hasDentalLab: true,
  hasInsuranceCoPay: true,
  hasInstallments: true,
  workspacePreset: "enterprise",
  onboardingCompleted: true,
  hasPediatricMode: false,
  isOmniRole: false,
  clinicName: "Клиника DENTE"
};

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function saveScreenshot(page, name, state) {
  const p = path.join(OUTPUT_DIR, `${name}_${state.name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  try { fs.copyFileSync(p, path.join(BRAIN_DIR, path.basename(p))); } catch(e) {}
  console.log(`[SAVED] ${path.basename(p)}`);
  return p;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`\n--- TESTING STATE: ${state.name} ---`);

    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      colorScheme: state.theme
    });
    const page = await context.newPage();

    page.on("pageerror", err => console.log(`[PAGE ERROR] ${err.message.split('\n')[0]}`));

    // Full mock API - return proper shapes to prevent crashes
    await page.route(/\/api\//, async (route) => {
      const url = route.request().url();
      if (url.includes("/api/workspace/profile")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_WORKSPACE_PROFILE) });
      } else if (url.includes("/api/dashboard")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD) });
      } else if (url.includes("/api/auth/user/me")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          user: {
            id: "user-1", fullName: "Dr. House", role: "doctor", active: true, specialties: ["therapist"],
            email: "dr@dente.ru", organizationId: "org-1"
          }
        }) });
      } else if (url.includes("/api/auth/clinic")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          clinicToken: "mock_clinic_token", clinic: { id: "clinic-1", name: "DENTE" }
        }) });
      } else if (url.includes("/api/staff")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
          { id: "staff-1", fullName: "Dr. House", role: "doctor", active: true, specialties: ["therapist"], color: "#6366f1", pinCode: "1234" }
        ]) });
      } else if (url.includes("/api/leads")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_LEADS) });
      } else if (url.includes("/api/speech") || url.includes("/api/system")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", data: null }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      }
    });

    await page.addInitScript((t) => {
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
      localStorage.setItem("dente_clinic_token", "mock_clinic_token_123");
      localStorage.setItem("dente_staff_token", "mock_staff_token_123");
      localStorage.setItem("dente_onboarding", JSON.stringify({ dismissed: true, draftMode: false, version: 1, savedAt: "2099-01-01T00:00:00.000Z" }));
    }, state.theme);

    // 1. Main dashboard
    await page.goto("http://127.0.0.1:5173/");
    await wait(3000);
    await saveScreenshot(page, "Dashboard", state);

    // 2. Onboarding preview (force via hash)
    await page.goto("http://127.0.0.1:5173/#onboarding-preview");
    await wait(2000);
    await saveScreenshot(page, "Onboarding_Step1", state);

    // Click through to step 5
    for (let i = 1; i < 5; i++) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const nextBtn = btns.find(b => b.textContent && b.textContent.includes("Далее"));
        if (nextBtn) nextBtn.click();
      });
      await wait(400);
    }
    await saveScreenshot(page, "Onboarding_Step5", state);

    // 3. Command Palette (go back to main first)
    await page.goto("http://127.0.0.1:5173/");
    await wait(2000);
    await page.keyboard.down("Control");
    await page.keyboard.press("k");
    await page.keyboard.up("Control");
    await wait(1200);
    await saveScreenshot(page, "Command_Palette", state);
    await page.keyboard.press("Escape");
    await wait(300);

    // 4. Navigate to Schedule via sidebar nav
    await page.goto("http://127.0.0.1:5173/");
    await wait(2000);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("[class*='nav-item'], nav a, nav button"));
      const link = els.find(l => l.textContent && (l.textContent.trim().startsWith("Запис") || l.textContent.trim().startsWith("Расписан")));
      if (link) link.click();
    });
    await wait(2500);
    await saveScreenshot(page, "Schedule_View", state);

    // 5. Navigate to Finance via sidebar nav
    await page.goto("http://127.0.0.1:5173/");
    await wait(2000);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("[class*='nav-item'], nav a, nav button"));
      const link = els.find(l => l.textContent && (l.textContent.trim().startsWith("Финанс")));
      if (link) link.click();
    });
    await wait(2500);
    await saveScreenshot(page, "Finance_View", state);

    // 6. Navigate to Leads/Kanban via sidebar nav
    await page.goto("http://127.0.0.1:5173/");
    await wait(2000);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("[class*='nav-item'], nav a, nav button"));
      const link = els.find(l => l.textContent && (l.textContent.includes("Лид") || l.textContent.includes("Канбан")));
      if (link) link.click();
    });
    await wait(2500);
    await saveScreenshot(page, "Leads_Kanban", state);

    await context.close();
  }

  await browser.close();
  console.log("\n✅ Done. Screenshots saved to docs/proofs/ui_audit/");
})();

