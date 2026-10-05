const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const todayDate = new Date().toLocaleDateString("en-CA");
const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7cd67b6c-4183-463f-a1cc-73d6eff523bf";
const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      hasPediatricMode: true,
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist", "implantologist"],
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
        name: "Кабинет 1",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      email: "kovalev@example.ru",
      notes: "",
      administrativeProfile: "normal",
      createdAt: todayDate,
      updatedAt: todayDate,
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: todayDate,
      endsAt: todayDate,
      startTime: todayDate,
      endTime: todayDate,
      durationMinutes: 90,
      serviceTitle: "Комплексный план",
      serviceCategories: ["therapy", "surgery", "orthopedics"],
      createdByUserId: "doc-1",
      createdAt: todayDate,
      updatedAt: todayDate,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
  },
  payments: [],
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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1" } }),
      });
    }
    if (url.includes("/tooth-states")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, states: [] }) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_session_token", "audit-token-staff");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_workspace_perspective", "presentation");
  });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
    } catch (_) {}
  }, theme);
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(context);
    const page = await context.newPage();
    await setupPageRoutes(page);

    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="tp-tab-phased4"]', { timeout: 20000 });
    await page.click('[data-testid="tp-tab-phased4"]');
    await page.waitForSelector('[data-testid="treatment-plan-phased-4stage-view"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    // Function to scroll element to top of scroll container
    async function scrollElementToTop(selector) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        let p = el.parentElement;
        while (p && p !== document.body && p !== document.documentElement) {
          const style = window.getComputedStyle(p);
          if (style.overflowY === "auto" || style.overflowY === "scroll") {
            const topOffset = el.getBoundingClientRect().top - p.getBoundingClientRect().top;
            p.scrollTop += topOffset - 20; // 20px padding from top
            return;
          }
          p = p.parentElement;
        }
        window.scrollBy(0, el.getBoundingClientRect().top - 20);
      }, selector);
      await page.waitForTimeout(600);
    }

    // 1. Capture Stage 1 (Hygiene & Sanitation) scrolled into view
    console.log("Scrolled view: Stage 1...");
    await scrollElementToTop('[data-testid="phased-stage-card-hygiene_sanitation"]');
    const stage1Path = path.join(outDir, "proof_mobile_stage1_hygiene.png");
    await page.screenshot({ path: stage1Path });
    fs.copyFileSync(stage1Path, path.join(brainDir, "proof_mobile_stage1_hygiene.png"));
    console.log("Saved Stage 1 screenshot:", stage1Path);

    // 2. Capture Stage 2 & 3 (Therapy & Surgery)
    console.log("Scrolled view: Stage 2 & 3...");
    await scrollElementToTop('[data-testid="phased-stage-card-endo_therapy"]');
    const stage2Path = path.join(outDir, "proof_mobile_stage2_therapy.png");
    await page.screenshot({ path: stage2Path });
    fs.copyFileSync(stage2Path, path.join(brainDir, "proof_mobile_stage2_therapy.png"));
    console.log("Saved Stage 2 screenshot:", stage2Path);

    // 3. Capture Stage 3 (Surgery & Implant)
    console.log("Scrolled view: Stage 3...");
    await scrollElementToTop('[data-testid="phased-stage-card-surgery_implant"]');
    const stage3Path = path.join(outDir, "proof_mobile_stage3_surgery.png");
    await page.screenshot({ path: stage3Path });
    fs.copyFileSync(stage3Path, path.join(brainDir, "proof_mobile_stage3_surgery.png"));
    console.log("Saved Stage 3 screenshot:", stage3Path);

    // 4. Capture Stage 4 (Ortho & Prosthetics) & Bank Installments 0-0-12
    console.log("Scrolled view: Stage 4 & Bank Installments 0-0-12...");
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      all.forEach((p) => {
        const style = window.getComputedStyle(p);
        if (style.overflowY === "auto" || style.overflowY === "scroll") {
          p.scrollTop = p.scrollHeight;
        }
      });
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(600);

    const installmentsPath = path.join(outDir, "proof_mobile_bank_installments_0_0_12.png");
    await page.screenshot({ path: installmentsPath });
    fs.copyFileSync(installmentsPath, path.join(brainDir, "proof_mobile_bank_installments_0_0_12.png"));
    console.log("Saved Bank Installments screenshot:", installmentsPath);

    // Also capture Dark mode of Bank Installments
    await setTheme(page, "dark");
    const installmentsDarkPath = path.join(outDir, "proof_mobile_bank_installments_0_0_12_dark.png");
    await page.screenshot({ path: installmentsDarkPath });
    fs.copyFileSync(installmentsDarkPath, path.join(brainDir, "proof_mobile_bank_installments_0_0_12_dark.png"));
    console.log("Saved Bank Installments Dark screenshot:", installmentsDarkPath);

    console.log("ALL SCROLLED EVIDENCE SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
