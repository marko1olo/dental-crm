const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/finance");
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: "2026-10-21",
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      hasPediatricMode: true,
      timezone: "Europe/Moscow",
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        active: true,
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1",
        active: true,
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Михайлов Артем Евгеньевич",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (926) 345-67-89",
      allergies: [],
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorId: "doc-1",
      doctorUserId: "doc-1",
      status: "in_treatment",
      patientName: "Михайлов Артем Евгеньевич",
      startTime: "2026-10-21T10:00:00.000Z",
      startsAt: "2026-10-21T10:00:00.000Z",
    },
  ],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
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
          token: "audit-token-staff",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element,
      .toast,
      [data-testid="toast-container"] {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

(async () => {
  console.log("=== CAPTURING 4-STATE STUDIO PAYMENT MODAL PROOFS ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  try {
    // ─── PC CONTEXT (1440x900) ──────────────────────────────────────────
    const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pcContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "audit-token-clinic");
      localStorage.setItem("dente_staff_token", "audit-token-staff");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("theme", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      sessionStorage.setItem("dente_chunk_reload_/", "1");
    });

    const pcPage = await pcContext.newPage();
    await setupPageRoutes(pcPage);

    console.log("Navigating PC to http://127.0.0.1:5173/?payment=1 ...");
    await pcPage.goto("http://127.0.0.1:5173/?payment=1", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForFunction(() => !document.body.innerText.includes("Загрузка CRM"), { timeout: 30000 }).catch(() => {});
    await pcPage.waitForSelector(".payment-modal, [data-testid='payment-modal-studio']", { timeout: 20000 });
    await suppressOverlays(pcPage);
    await pcPage.waitForTimeout(1000);

    // 1. PC Light
    console.log("Capturing PC Light (1440x900)...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    await pcPage.waitForTimeout(600);
    const pcLightPath = path.join(proofDir, "studio_payment_modal_pc_light.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    console.log(`[1/4 PROOF] Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // 2. PC Dark
    console.log("Capturing PC Dark (1440x900)...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await pcPage.waitForTimeout(600);
    const pcDarkPath = path.join(proofDir, "studio_payment_modal_pc_dark.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    console.log(`[2/4 PROOF] Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    await pcContext.close();

    // ─── MOBILE CONTEXT (390x844) ───────────────────────────────────────
    console.log("Setting up Mobile Context (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "audit-token-clinic");
      localStorage.setItem("dente_staff_token", "audit-token-staff");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("theme", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      sessionStorage.setItem("dente_chunk_reload_/", "1");
    });

    const mobilePage = await mobileContext.newPage();
    await setupPageRoutes(mobilePage);

    console.log("Navigating Mobile to http://127.0.0.1:5173/?payment=1 ...");
    await mobilePage.goto("http://127.0.0.1:5173/?payment=1", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForFunction(() => !document.body.innerText.includes("Загрузка CRM"), { timeout: 30000 }).catch(() => {});
    await mobilePage.waitForSelector(".payment-modal, [data-testid='payment-modal-studio']", { timeout: 20000 });
    await suppressOverlays(mobilePage);
    await mobilePage.waitForTimeout(1000);

    // 3. Mobile Light
    console.log("Capturing Mobile Light (390x844)...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    await mobilePage.waitForTimeout(600);
    const mobileLightPath = path.join(proofDir, "studio_payment_modal_mobile_light.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    console.log(`[3/4 PROOF] Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // 4. Mobile Dark
    console.log("Capturing Mobile Dark (390x844)...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await mobilePage.waitForTimeout(600);
    const mobileDarkPath = path.join(proofDir, "studio_payment_modal_mobile_dark.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    console.log(`[4/4 PROOF] Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    await mobileContext.close();
    console.log("=== SUCCESS: ALL 4 STUDIO PAYMENT PROOFS CAPTURED ===");
  } finally {
    await browser.close();
  }
})();
