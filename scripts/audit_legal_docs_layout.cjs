/**
 * scripts/audit_legal_docs_layout.cjs
 *
 * GLOBAL RED TEAM INQUISITOR 1: ДОКУМЕНТЫ, ФОРМА 043/У, ИДС И ПЕЧАТЬ
 * Comprehensive Playwright Visual Proof Capture:
 * - PC Light / Dark (1440x900)
 * - Mobile Light / Dark (390x844)
 * - Documents Registry (#documents)
 * - Form 043/u (DentalMedicalCard043uForm)
 * - Informed Consent Form (InformedConsentForm)
 * - Official A4 Print Preview Modal (DocumentA4PrintPreviewModal)
 * - Consent Modal / Tablet Signature (InformedConsentModal)
 * - Mobile Documents Hub (MobileDocumentsHub)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/screenshots/audit_legal_docs");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

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
  await page.waitForTimeout(500);
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
    `,
  }).catch(() => {});
}

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const capturedRegistry = [];

  // Setup context
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
    capturedRegistry.push({
      fileName,
      desc,
      sizeBytes: stat.size,
      filePath,
    });
    console.log(`[SNAP] ${fileName} (${desc}): ${stat.size} bytes`);
  }

  // 1. Desktop: Documents Registry Hub
  console.log(">>> 1. Navigating to #documents...");
  await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector(".document-patient-banner, .documents-panel, .document-primary-intake-banner", { state: "visible", timeout: 30000 });
  await hideOverlays(page);
  await page.waitForTimeout(1000);

  await applyTheme(page, "light");
  await snap("pc_light_documents.png", "Documents Hub & Registry (Light)");

  await applyTheme(page, "dark");
  await snap("pc_dark_documents.png", "Documents Hub & Registry (Dark)");

  // 2. Desktop: Form 043/u (DentalMedicalCard043uForm)
  console.log(">>> 2. Switching to Form 043/u via Select...");
  await applyTheme(page, "light");
  await page.selectOption('[data-testid="select-document-kind"]', "dental_medical_card_043u");
  await page.waitForSelector('.form-043u-wrapper', { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(800);

  // Click physiological norm
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="btn-043-global-norm-1click"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);

  // Scroll 043u form into center
  await page.evaluate(() => {
    const form = document.querySelector('.form-043u-wrapper');
    if (form) form.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(500);

  await snap("pc_light_043u.png", "Dental Medical Card 043/u Form (Light)");

  await applyTheme(page, "dark");
  await snap("pc_dark_043u.png", "Dental Medical Card 043/u Form (Dark)");

  // 3. Desktop: Informed Consent Form (InformedConsentForm)
  console.log(">>> 3. Switching to Informed Consent Form...");
  await applyTheme(page, "light");
  await page.selectOption('[data-testid="select-document-kind"]', "informed_consent");
  await page.waitForSelector('[data-testid="btn-print-informed-consent"]', { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(600);

  // Scroll into view
  await page.evaluate(() => {
    const el = document.querySelector('.informed-consent-toolbar');
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(500);

  await snap("pc_light_consent.png", "Informed Consent Form (Light)");

  await applyTheme(page, "dark");
  await snap("pc_dark_consent.png", "Informed Consent Form (Dark)");

  // 4. Desktop: Official A4 Print Preview Modal (DocumentA4PrintPreviewModal)
  console.log(">>> 4. Opening Official A4 Print Preview Modal...");
  await applyTheme(page, "light");

  // Scroll back to top so header banner is visible
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  await page.click('[data-testid="btn-open-pro-a4-modal"]');
  await page.waitForSelector('[data-testid="modal-a4-document-preview"], [data-testid="pro-a4-physical-sheet"]', { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(800);

  await snap("pc_light_print_preview.png", "Official A4 Print Preview Sheet (Light)");

  await applyTheme(page, "dark");
  await snap("pc_dark_print_preview.png", "Official A4 Print Preview Sheet (Dark)");

  // Close A4 modal
  await page.click('[data-testid="btn-close-a4-preview-modal"]');
  await page.waitForTimeout(500);

  // 5. Desktop: Informed Consent Modal & Tablet Vector Signature (consent_signing_preview.html)
  console.log(">>> 5. Navigating to Informed Consent Preview Modal (Light)...");
  await page.goto("http://127.0.0.1:5173/consent_signing_preview.html?theme=light", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".consent-modal-container, .consent-signing-panel, .consent-modal-footer", { state: "visible", timeout: 15000 });
  await hideOverlays(page);
  await page.waitForTimeout(800);

  await snap("pc_light_consent_modal.png", "Informed Consent Modal Tablet / Paper (Light)");

  console.log(">>> Navigating to Informed Consent Preview Modal (Dark)...");
  const darkModalCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const darkModalPage = await darkModalCtx.newPage();
  await darkModalPage.goto("http://127.0.0.1:5173/consent_signing_preview.html?theme=dark", { waitUntil: "networkidle", timeout: 30000 });
  await darkModalPage.waitForSelector(".consent-modal-container, .consent-signing-panel, .consent-modal-footer", { state: "visible", timeout: 15000 });
  await hideOverlays(darkModalPage);
  await darkModalPage.waitForTimeout(800);
  const darkModalPath = path.join(outputDir, "pc_dark_consent_modal.png");
  await darkModalPage.screenshot({ path: darkModalPath, fullPage: false, animations: "disabled" });
  console.log(`[SNAP] pc_dark_consent_modal.png: ${fs.statSync(darkModalPath).size} bytes`);
  await darkModalCtx.close();

  // 6. Mobile: Mobile Documents Hub (390x844 iPhone 14 Pro standard)
  console.log(">>> 6. Mobile Viewport (390x844)...");
  await context.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.addInitScript(() => {
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
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ completed: true, skipped: false, step: "complete" })
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

  const mobilePage = await mobileContext.newPage();

  await mobilePage.route("**/api/**", async (route) => {
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

  await mobilePage.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
  await mobilePage.waitForSelector('[data-testid="mobile-documents-hub"]', { state: "visible", timeout: 30000 });
  await hideOverlays(mobilePage);
  await mobilePage.waitForTimeout(1000);

  // Mobile Light
  await applyTheme(mobilePage, "light");
  const mobileLightPath = path.join(outputDir, "mobile_light_documents.png");
  await hideOverlays(mobilePage);
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: mobileLightPath, fullPage: false, animations: "disabled" });
  console.log(`[SNAP] mobile_light_documents.png: ${fs.statSync(mobileLightPath).size} bytes`);

  // Mobile Dark
  await applyTheme(mobilePage, "dark");
  const mobileDarkPath = path.join(outputDir, "mobile_dark_documents.png");
  await hideOverlays(mobilePage);
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
  console.log(`[SNAP] mobile_dark_documents.png: ${fs.statSync(mobileDarkPath).size} bytes`);

  await browser.close();
  console.log("\n>>> CAPTURE COMPLETE. Screenshots written to:", outputDir);
}

main().catch((err) => {
  console.error("FATAL ERROR in Playwright capture:", err);
  process.exit(1);
});
