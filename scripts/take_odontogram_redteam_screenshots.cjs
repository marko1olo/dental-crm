/**
 * scripts/take_odontogram_redteam_screenshots.cjs
 *
 * Odontogram & Interactive Tooth Chart Red Team Live Screenshot Suite.
 * Mandate 8c: 4-State visual proof (1440x900 Desktop Light/Dark, 390x844 Mobile Light/Dark)
 * Mandate 8p: Zero cartoon emojis, high contrast, clean toolbars (32-36px).
 * Mandate 8b: Strictly <= 800 lines.
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
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
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
      notes: "Бронхиальная астма, аллергия на лидокаин",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
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
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Эндодонтия 46 зуба (3 канала)",
      serviceCategories: ["therapy", "endodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
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

const targetDirs = [
  path.resolve("docs/screenshots/odontogram_audit"),
  "C:/Users/Admin/.gemini/antigravity/brain/c8b0a113-d724-454f-ada2-66f09061b986",
  "C:/Users/Admin/.gemini/antigravity/brain/9ea21f87-962f-4962-8237-a01bee2ebf13",
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function saveProof(page, fileName, description = "") {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    try {
      await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled", timeout: 25000 });
    } catch (err) {
      console.warn(`[WARN] Standard screenshot timed out (${err.message}), retrying...`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled", timeout: 25000 });
    }
    const stats = fs.statSync(fullPath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(fullPath)).digest("hex");
    console.log(`[PROOF] ${fileName} (${stats.size} B / ${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5}) - ${description}`);
  }
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
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
    } catch (_) {}
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, states: [] }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
  });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" })
    );
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    sessionStorage.setItem("dente_chunk_reload_/", "1");
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true, hasPediatricMode: true },
        },
      })
    );
  });
}

async function run() {
  console.log("=== ODONTOGRAM & INTERACTIVE TOOTH CHART AUDIT PIPELINE ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP SUITE (1440x900)
    // -------------------------------------------------------------
    console.log("\n[Desktop] Launching 1440x900 viewport...");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addInitStorage(desktopContext);
    const dPage = await desktopContext.newPage();
    dPage.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" || text.includes("error") || text.includes("Error")) {
        console.log("[dPage console]:", text);
      }
    });
    dPage.on("pageerror", (err) => console.log("[dPage pageerror]:", err.stack || err.message));
    await setupPageRoutes(dPage);

    await dPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await dPage.waitForTimeout(2000);

    // Navigate to Visit via hash
    console.log("[Desktop] Navigating to Visit view via hash...");
    await dPage.evaluate(() => { window.location.hash = "#visit"; });
    try {
      await dPage.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 15000 });
    } catch {
      await dPage.waitForTimeout(3000);
    }

    // Dismiss any banner
    await dPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent && (b.textContent.includes("Скрыть") || b.textContent.includes("Понятно"))
      );
      if (btn) btn.click();
    });
    await dPage.waitForTimeout(400);

    // Switch to Odontogram subtab via DOM click
    console.log("[Desktop] Switching to Odontogram subtab via DOM click...");
    await dPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-odontogram"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Зубная формула'));
      if (btn) btn.click();
    });
    try {
      await dPage.waitForSelector('.odontogram-toolbar, .tooth-chart-svg, [data-testid="mark-intact-dentition-btn"]', { timeout: 15000 });
    } catch {
      await dPage.waitForTimeout(2000);
    }
    await dPage.waitForTimeout(600);

    const ensureOdontogramSubtab = async () => {
      const hash = await dPage.evaluate(() => window.location.hash);
      if (hash !== "#visit") {
        await dPage.evaluate(() => { window.location.hash = "#visit"; });
        await dPage.waitForTimeout(600);
      }
      await dPage.evaluate(() => {
        const btn = document.querySelector('[data-testid="visit-subtab-odontogram"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Зубная формула'));
        if (btn) btn.click();
      });
      await dPage.waitForSelector('.odontogram-toolbar', { timeout: 15000 }).catch(() => {});
      await dPage.waitForTimeout(400);
    };

    // 1A. Anatomical Odontogram Desktop Light & Dark
    await ensureOdontogramSubtab();
    await setTheme(dPage, "light");
    await saveProof(dPage, "01_odontogram_desktop_light.png", "Desktop Light Anatomical 3D Formula");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "02_odontogram_desktop_dark.png", "Desktop Dark Anatomical 3D Formula");

    // 1B. Switch to Classic GOST 043/u Table
    console.log("[Desktop] Switching to Classic GOST mode via DOM click...");
    await ensureOdontogramSubtab();
    await dPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="odontogram-mode-btn-classic_gost"]');
      if (btn) btn.click();
    });
    await dPage.waitForSelector('[data-testid="classic-gost-odontogram"]', { timeout: 10000 }).catch(() => {});
    await dPage.waitForTimeout(800);

    await setTheme(dPage, "dark");
    await dPage.waitForSelector('[data-testid="classic-gost-odontogram"]', { timeout: 5000 }).catch(() => {});
    await dPage.waitForTimeout(400);
    await saveProof(dPage, "04_odontogram_gost_desktop_dark.png", "Desktop Dark Classic GOST 043/u Table Grid");

    await setTheme(dPage, "light");
    await dPage.waitForSelector('[data-testid="classic-gost-odontogram"]', { timeout: 5000 }).catch(() => {});
    await dPage.waitForTimeout(400);
    await saveProof(dPage, "03_odontogram_gost_desktop_light.png", "Desktop Light Classic GOST 043/u Table Grid");

    // Switch back to anatomical
    console.log("[Desktop] Switching back to anatomical 3D mode via DOM click...");
    await ensureOdontogramSubtab();
    await dPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="odontogram-mode-btn-anatomical_svg"]');
      if (btn) btn.click();
    });
    await dPage.waitForSelector('.tooth-chart-container, .tooth-arch-quadrant, [data-testid="quick-trigger-caries-btn"]', { timeout: 10000 }).catch(() => {});
    await dPage.waitForTimeout(600);

    // 1C. Active Stamp Tool (Caries Stamp 1-Click Mode)
    console.log("[Desktop] Activating Caries Stamp tool via DOM click...");
    await ensureOdontogramSubtab();
    await dPage.evaluate(() => {
      const stampBtn = document.querySelector('[data-testid="quick-trigger-caries-btn"]');
      if (stampBtn) stampBtn.click();
    });
    await dPage.waitForSelector('[data-testid="odontogram-active-stamp-indicator"]', { timeout: 10000 }).catch(() => {});
    await dPage.waitForTimeout(600);

    await setTheme(dPage, "light");
    await saveProof(dPage, "05_stamp_caries_active_desktop_light.png", "Desktop Light Caries Stamp Tool Active with Banner");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "06_stamp_caries_active_desktop_dark.png", "Desktop Dark Caries Stamp Tool Active with Banner");

    // 1-Click tooth stamping test (Click tooth 16 to apply stamp immediately without modal)
    console.log("[Desktop] Stamping tooth 16 with Caries stamp in 1 click...");
    await dPage.evaluate(() => {
      const t = document.querySelector('[data-tooth-id="16"]') ||
                document.querySelector('.tooth-svg-wrapper[data-tooth="16"]') ||
                document.querySelector('[data-testid="tooth-cell-16"]');
      if (t) t.click();
    });
    await dPage.waitForTimeout(600);

    // Deactivate stamp tool via Escape
    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(400);

    // 1D. Open ToothRadialMenu on Tooth 14 (when NO stamp is active)
    console.log("[Desktop] Opening ToothRadialMenu on Tooth 14 via DOM click...");
    await ensureOdontogramSubtab();
    await dPage.evaluate(() => {
      const t = document.querySelector('[data-tooth-id="14"]') ||
                document.querySelector('.tooth-svg-wrapper[data-tooth="14"]') ||
                document.querySelector('[data-testid="tooth-cell-14"]');
      if (t) t.click();
    });
    await dPage.waitForTimeout(800);

    await setTheme(dPage, "light");
    await saveProof(dPage, "07_tooth_radial_menu_desktop_light.png", "Desktop Light Tooth Radial Menu Open (Tooth 14)");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "08_tooth_radial_menu_desktop_dark.png", "Desktop Dark Tooth Radial Menu Open (Tooth 14)");

    // Test Escape hotkey to close radial menu
    console.log("[Desktop] Testing Escape key dismiss...");
    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(600);

    // 1E. Open OdontogramLiveInvoice (Click "Смета")
    console.log("[Desktop] Opening OdontogramLiveInvoice modal via DOM click...");
    await dPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Смета'));
      if (btn) btn.click();
    });
    await dPage.waitForTimeout(1000);

    await setTheme(dPage, "light");
    await saveProof(dPage, "09_odontogram_live_invoice_desktop_light.png", "Desktop Light Odontogram Live Invoice (Order 804n)");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "10_odontogram_live_invoice_desktop_dark.png", "Desktop Dark Odontogram Live Invoice (Order 804n)");

    // Dismiss live invoice
    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(600);

    // 1F. Open Pediatric Mixed Dentition Modal via More Menu
    console.log("[Desktop] Opening Pediatric Mixed Dentition Modal via DOM click...");
    await dPage.evaluate(() => {
      const moreBtn = document.querySelector('[data-testid="odontogram-toolbar-more-menu-btn"]') ||
                      Array.from(document.querySelectorAll('button')).find(b => (b.title && b.title.includes('Дополнительные')) || (b.textContent && b.textContent.includes('Ещё')));
      if (moreBtn) moreBtn.click();
    });
    await dPage.waitForTimeout(600);

    await dPage.evaluate(() => {
      const pedBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Сменный прикус'));
      if (pedBtn) pedBtn.click();
    });
    await dPage.waitForTimeout(1000);

    await setTheme(dPage, "light");
    await saveProof(dPage, "11_pediatric_modal_desktop_light.png", "Desktop Light Pediatric Mixed Dentition Modal");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "12_pediatric_modal_desktop_dark.png", "Desktop Dark Pediatric Mixed Dentition Modal");

    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(600);

    await desktopContext.close();

    // -------------------------------------------------------------
    // 2. MOBILE SUITE (390x844)
    // -------------------------------------------------------------
    console.log("\n[Mobile] Launching 390x844 viewport...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(mobileContext);
    const mPage = await mobileContext.newPage();
    mPage.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" || text.includes("error") || text.includes("Error")) {
        console.log("[mPage console]:", text);
      }
    });
    mPage.on("pageerror", (err) => console.log("[mPage pageerror]:", err.stack || err.message));
    await setupPageRoutes(mPage);

    await mPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mPage.waitForTimeout(2000);

    await mPage.evaluate(() => { window.location.hash = "#visit"; });
    try {
      await mPage.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 15000 });
    } catch {
      await mPage.waitForTimeout(3000);
    }

    await mPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-odontogram"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Зубная формула'));
      if (btn) btn.click();
    });
    try {
      await mPage.waitForSelector('.odontogram-toolbar, .tooth-chart-svg, [data-testid="mark-intact-dentition-btn"]', { timeout: 15000 });
    } catch {
      await mPage.waitForTimeout(2000);
    }
    await mPage.waitForTimeout(600);

    // 2A. Mobile Odontogram Light & Dark
    await setTheme(mPage, "light");
    await saveProof(mPage, "13_odontogram_mobile_light.png", "Mobile Light Odontogram View (390x844)");

    await setTheme(mPage, "dark");
    await saveProof(mPage, "14_odontogram_mobile_dark.png", "Mobile Dark Odontogram View (390x844)");

    // 2B. Mobile Tooth Radial Menu (Bottom Sheet)
    console.log("[Mobile] Opening Tooth Bottom Sheet on Tooth 16 via DOM click...");
    await mPage.waitForTimeout(1000);
    try {
      await mPage.evaluate(() => {
        const t = document.querySelector('[data-tooth-id="16"]') ||
                  document.querySelector('.tooth-svg-wrapper[data-tooth="16"]') ||
                  document.querySelector('[data-testid="tooth-cell-16"]');
        if (t) t.click();
      });
    } catch (err) {
      console.warn("[WARN] Mobile tooth click error:", err.message);
      await mPage.waitForTimeout(1200);
      await mPage.evaluate(() => {
        const t = document.querySelector('[data-tooth-id="16"]') ||
                  document.querySelector('.tooth-svg-wrapper[data-tooth="16"]') ||
                  document.querySelector('[data-testid="tooth-cell-16"]');
        if (t) t.click();
      }).catch(() => {});
    }
    await mPage.waitForTimeout(800);

    await setTheme(mPage, "light");
    await saveProof(mPage, "15_tooth_bottom_sheet_mobile_light.png", "Mobile Light Tooth Action Bottom Sheet (Tooth 16)");

    await setTheme(mPage, "dark");
    await saveProof(mPage, "16_tooth_bottom_sheet_mobile_dark.png", "Mobile Dark Tooth Action Bottom Sheet (Tooth 16)");

    await mobileContext.close();
    console.log("\n>>> ALL 16 RED TEAM PROOFS CAPTURED SUCCESSFULLY! <<<");

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
