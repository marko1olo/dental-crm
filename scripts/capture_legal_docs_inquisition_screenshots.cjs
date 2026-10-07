/**
 * scripts/capture_legal_docs_inquisition_screenshots.cjs
 * Red Team Inquisitor №11 - Legal Documents, Paid Contracts & Consents Screen Proofs.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      ogrn: "1217700123456",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: {
      mode: "small_clinic",
      title: "Оптимальный режим",
      fitScore: 100,
      blockers: [],
      upgrades: [],
      lowFrictionNextStep: "ready",
    },
    doctorLoads: [],
    assistantLoads: [],
    chairLoads: [],
    roleQueues: [],
    scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      cardNumber: "043/у-2026-102",
      balanceRub: 15000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [],
  payments: [],
};

async function applyTheme(page, theme) {
  await page.waitForFunction(() => typeof window !== "undefined", { timeout: 10000 }).catch(() => {});
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function hideOverlays(page) {
  await page.addStyleTag({
    content: `
      .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
      .coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
      [data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"] {
        display: none !important;
        pointer-events: none !important;
      }
    `
  }).catch(() => {});
}

async function main() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/legal_docs_inquisition");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const capturedRegistry = [];

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1", "step2", "step3", "step4"] }));
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true },
        },
      })
    );
  });

  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            active: true,
            organizationId: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-inquisition-staff-token",
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.patients),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  async function snap(fileName, desc) {
    const filePath = path.join(outputDir, fileName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    await hideOverlays(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
    const stat = fs.statSync(filePath);
    const hash = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
    capturedRegistry.push({
      fileName,
      desc,
      sizeBytes: stat.size,
      sizeKb: (stat.size / 1024).toFixed(1),
      md5: hash,
      pass: stat.size >= 40960,
    });
    console.log(`[SNAP] ${fileName} (${desc}): ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB), MD5: ${hash}`);
  }

  // 1. Documents Registry Hub
  console.log(">>> 1. Navigating to #documents...");
  await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector(".document-patient-banner, .documents-panel, .document-primary-intake-banner", { state: "visible", timeout: 30000 });
  await hideOverlays(page);
  await page.waitForTimeout(1000);

  await applyTheme(page, "light");
  await snap("01_documents_view_light.png", "Documents Hub & Registry (Light)");

  await applyTheme(page, "dark");
  await snap("02_documents_view_dark.png", "Documents Hub & Registry (Dark)");

  // 2. Paid Service Contract Form
  console.log(">>> 2. Selecting Paid Service Contract...");
  await applyTheme(page, "light");
  await page.selectOption('[data-testid="select-document-kind"]', "paid_medical_services_contract");
  await page.waitForSelector(".paid-contract-toolbar, [data-testid=\"btn-paid-contract-fill-norm\"]", { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(600);

  const fillBtn = await page.$('[data-testid="btn-paid-contract-fill-norm"]');
  if (fillBtn) {
    await fillBtn.click();
    await page.waitForTimeout(800);
  }
  await snap("03_paid_contract_form_light.png", "Paid Medical Services Contract Form PP RF 736 (Light)");

  await applyTheme(page, "dark");
  await snap("04_paid_contract_form_dark.png", "Paid Medical Services Contract Form PP RF 736 (Dark)");

  // 3. Primary Intake Package Modal (Light & Dark)
  console.log(">>> 3. Opening Primary Intake Package Modal...");
  await applyTheme(page, "light");
  await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector('[data-testid="scenario-primary-intake-btn"]', { state: "visible", timeout: 30000 });
  await hideOverlays(page);
  await page.waitForTimeout(600);
  await page.click('[data-testid="scenario-primary-intake-btn"]');
  await page.waitForSelector('.document-package-modal-overlay, .document-package-modal-content', { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(1000);

  await applyTheme(page, "light");
  await snap("05_primary_intake_modal_light.png", "Primary Intake Package Modal (Light)");

  await applyTheme(page, "dark");
  await page.waitForSelector('.document-package-modal-content', { state: "visible", timeout: 5000 }).catch(async () => {
    await page.click('[data-testid="scenario-primary-intake-btn"]').catch(() => {});
    await page.waitForSelector('.document-package-modal-content', { state: "visible", timeout: 5000 });
  });
  await hideOverlays(page);
  await page.waitForTimeout(1000);
  await snap("06_primary_intake_modal_dark.png", "Primary Intake Package Modal (Dark)");

  // 4. Informed Consent Packages Modal (Paper Physical Mode)
  console.log(">>> 4. Navigating to Consent Packages (Paper Mode Light)...");
  await page.goto("http://127.0.0.1:5173/consent_signing_preview.html?theme=light&method=paper_physical", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".consent-modal-container", { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(800);
  await snap("07_consent_packages_modal_light.png", "Informed Consent Packages Modal Paper Mode (Light)");

  console.log(">>> Navigating to Consent Packages (Paper Mode Dark)...");
  await page.goto("http://127.0.0.1:5173/consent_signing_preview.html?theme=dark&method=paper_physical", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".consent-modal-container", { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(800);
  await snap("08_consent_packages_modal_dark.png", "Informed Consent Packages Modal Paper Mode (Dark)");

  // 5. Tablet Touch Vector Signature Pad (Stylus Vector Mode)
  console.log(">>> 5. Navigating to Tablet Stylus Vector Pad (Light)...");
  await page.goto("http://127.0.0.1:5173/consent_signing_preview.html?theme=light&method=tablet_stylus", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".consent-modal-container", { state: "visible", timeout: 15000 });
  await page.waitForSelector('[data-testid="consent-vector-pad-svg"]', { state: "visible", timeout: 15000 });
  await page.waitForTimeout(600);

  const modalBody = await page.$('.consent-modal-body');
  if (modalBody) {
    await modalBody.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await hideOverlays(page);
  await page.waitForTimeout(800);
  await snap("09_consent_tablet_vector_light.png", "Tablet Vector Stylus Signature Pad 63-FZ (Light)");

  console.log(">>> Navigating to Tablet Stylus Vector Pad (Dark)...");
  await page.goto("http://127.0.0.1:5173/consent_signing_preview.html?theme=dark&method=tablet_stylus", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".consent-modal-container", { state: "visible", timeout: 15000 });
  await page.waitForSelector('[data-testid="consent-vector-pad-svg"]', { state: "visible", timeout: 15000 });
  await page.waitForTimeout(600);

  const modalBodyDark = await page.$('.consent-modal-body');
  if (modalBodyDark) {
    await modalBodyDark.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await hideOverlays(page);
  await page.waitForTimeout(800);
  await snap("10_consent_tablet_vector_dark.png", "Tablet Vector Stylus Signature Pad 63-FZ (Dark)");

  await browser.close();

  console.log("\n=================== CAPTURE SUMMARY ===================");
  let allPass = true;
  for (const item of capturedRegistry) {
    console.log(`${item.fileName}: ${item.sizeBytes} bytes (${item.sizeKb} KB) | MD5: ${item.md5} | Status: ${item.pass ? "PASS" : "FAIL"}`);
    if (!item.pass) allPass = false;
  }
  console.log(`ALL SCREENSHOTS PASS: ${allPass}`);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
