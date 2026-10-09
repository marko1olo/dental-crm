import { mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
await mkdir(OUT_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLiveAuth() {
  console.log("[Auth] Authenticating against Fastify API on 4100...");
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
  });
  if (!res.ok) {
    throw new Error(`Login failed HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  console.log("[Auth] Auth OK:", data.user?.fullName);
  return {
    clinicToken: data.clinicToken,
    staffToken: data.staffToken,
    user: data.user,
    organizationId: data.organizationId || "01a00000-0000-0000-0000-000000000000",
  };
}

async function waitForAppReady(page, targetSelector) {
  await page.waitForFunction(() => {
    return !document.querySelector(".boot-state") && Boolean(document.querySelector("#app-main-content, main, nav, [data-view]"));
  }, { timeout: 35000 });

  if (targetSelector) {
    await page.waitForSelector(targetSelector, { state: "visible", timeout: 25000 }).catch((e) => {
      console.log(`[Notice] Target selector ${targetSelector} not directly visible yet:`, e.message);
    });
  }
  await wait(1500);
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
  }, theme);
  await wait(800);
}

async function run() {
  const auth = await getLiveAuth();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const capturedFiles = [];

  for (const theme of ["light", "dark"]) {
    console.log(`\n============================================================`);
    console.log(`>>> STARTING SOLO-DOCTOR E2E AUDIT: PC ${theme.toUpperCase()} (1440x900)`);
    console.log(`============================================================`);

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(
      ({ cTok, sTok, usr, oId, th }) => {
        localStorage.setItem("dente_clinic_token", cTok);
        localStorage.setItem("dente_staff_token", sTok);
        localStorage.setItem("dente_active_session_token", sTok);
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dente_perspective", "doctor");
        localStorage.setItem("dente_user_name", usr?.fullName || "Д-р Смирнов А. П.");
        localStorage.setItem("dente_organization_id", oId);
        localStorage.setItem("dente_theme", th);
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(usr));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
        localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
      },
      { cTok: auth.clinicToken, sTok: auth.staffToken, usr: auth.user, oId: auth.organizationId, th: theme },
    );

    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`[PAGE ERROR ${theme}]:`, err.message));

    const saveShot = async (filename) => {
      const fullPath = path.join(OUT_DIR, filename);
      const rootPath = path.join("C:/Clinic_MVP/dental-crm", filename);
      await page.screenshot({ path: fullPath, fullPage: false });
      await page.screenshot({ path: rootPath, fullPage: false });
      const stats = fs.statSync(fullPath);
      console.log(`✓ Saved ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
      if (stats.size < 20480) {
        throw new Error(`Screenshot size ${stats.size} bytes is below the 20KB anti-blank threshold!`);
      }
      capturedFiles.push({ filename, fullPath, size: stats.size });
    };

    // ─── STEP 1: SCHEDULE & QUICK BOOKING DRAWER ────────────────────────
    console.log(`\n[STEP 1] Navigating to #schedule (${theme})...`);
    await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(page, '[data-testid="schedule-toolbar-primary-quick-booking-btn"]');
    await applyTheme(page, theme);

    console.log("Opening Quick Booking Drawer...");
    const quickBookingBtn = page.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"]').first();
    await quickBookingBtn.click();
    await wait(1000);

    const quickDrawer = page.locator('[data-testid="quick-booking-drawer"]').first();
    await quickDrawer.waitFor({ state: "visible", timeout: 15000 });
    await wait(1500);

    await saveShot(`proof_solo_step1_schedule_quick_booking_${theme}_1440x900.png`);

    // Close drawer
    await page.keyboard.press("Escape");
    await wait(500);

    // ─── STEP 2: VISIT VIEW WITH ODONTOGRAM & 1-CLICK NORM ───────────────
    console.log(`\n[STEP 2] Navigating to #visit (${theme})...`);
    await page.goto(`${APP_BASE}/?demo=true#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(page, '[data-testid="btn-soap-norm-one-click"]');
    await applyTheme(page, theme);

    const odontoTab = page.locator("[data-testid='visit-subtab-odontogram']").first();
    if (await odontoTab.isVisible()) {
      await odontoTab.click();
      await wait(1000);
    }

    await saveShot(`proof_solo_step2_visit_odontogram_norm_${theme}_1440x900.png`);

    // ─── STEP 3: PRESCRIPTION MODAL AT CHAIR ────────────────────────────
    console.log(`\n[STEP 3] Opening Prescription Modal at chair (${theme})...`);
    const diaryMoreBtn = page.locator("[data-testid='diary-more-actions-btn']").first();
    await diaryMoreBtn.waitFor({ state: "visible", timeout: 15000 });
    await diaryMoreBtn.scrollIntoViewIfNeeded();
    await diaryMoreBtn.click();
    await wait(800);

    const openRxBtn = page.locator("[data-testid='open-prescription-btn']").first();
    await openRxBtn.waitFor({ state: "visible", timeout: 15000 });
    await openRxBtn.click();

    const rxModal = page.locator("[data-testid='prescription-print-modal']").first();
    await rxModal.waitFor({ state: "visible", timeout: 20000 });
    await wait(1500);

    await saveShot(`proof_solo_step3_prescription_modal_${theme}_1440x900.png`);

    // Close Prescription Modal
    const rxCloseBtn = page.locator("[data-testid='btn-close-prescription-modal'], button:has-text('✕'), button.close-modal-btn").first();
    if (await rxCloseBtn.count() > 0 && await rxCloseBtn.isVisible()) {
      await rxCloseBtn.click();
      await wait(500);
    } else {
      await page.keyboard.press("Escape");
      await wait(500);
    }

    // ─── STEP 4 & 5: FINANCE & FLOATING CHECKOUT BAR ────────────────────
    console.log(`\n[STEP 4 & 5] Navigating to #finance (${theme})...`);
    await page.goto(`${APP_BASE}/?demo=true#finance`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(page);
    await applyTheme(page, theme);
    await wait(2000);

    // If checkout bar is not visible, ensure a patient or transaction is selected
    const checkoutBar = page.locator('#payment-checkout-bar, [data-testid="payment-checkout-bar"]').first();
    if (await checkoutBar.count() === 0 || !(await checkoutBar.isVisible())) {
      console.log("Looking for pending payment item or quick cashier trigger...");
      const payItem = page.locator('tr:has-text("Иванов"), button:has-text("К оплате"), .payment-row').first();
      if (await payItem.count() > 0 && await payItem.isVisible()) {
        await payItem.click();
        await wait(1000);
      }
    }

    await saveShot(`proof_solo_step4_finance_checkout_bar_${theme}_1440x900.png`);

    await context.close();
  }

  await browser.close();
  console.log("\n============================================================");
  console.log(`[SUCCESS] Captured ${capturedFiles.length} proof screenshots!`);
  for (const f of capturedFiles) {
    console.log(`- ${f.filename}: ${(f.size / 1024).toFixed(1)} KB`);
  }
}

run().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
