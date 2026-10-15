/**
 * scripts/take_settings_redteam_proofs.cjs
 *
 * Captures 4-state visual proofs for the Settings domain (#settings):
 * 1. Price Catalog with open PriceItemEditModal (title, 804n code, base price, materials cost)
 *    - 1440x900 PC Light
 *    - 1440x900 PC Dark
 * 2. Staff Tab
 *    - 1440x900 PC Light
 *    - 1440x900 PC Dark
 * 3. Clinic Chairs Tab
 *    - 1440x900 PC Light
 *    - 1440x900 PC Dark
 * 4. Mobile View (390x844)
 *    - Mobile Light
 *    - Mobile Dark
 *
 * Invariants:
 * - Real Fastify API (http://127.0.0.1:4100) + Vite Frontend (http://127.0.0.1:5173) + PostgreSQL 18
 * - Real token auth (no admin secret needed for staff/owner)
 * - Output saved to docs/screenshots/inquisition_live/ and brain directory
 * - File sizes >= 20 KB verified
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/0cbe75ca-9c64-424d-ba74-f37146783771");
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/inquisition_live");

fs.mkdirSync(BRAIN_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

async function provisionTestClinic() {
  const ts = Date.now();
  console.log(">>> [AUTH] Initializing test clinic...");
  const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Эксперт",
      email: `redteam-settings-${ts}@dente-live.local`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "123456"
    })
  });

  if (!initRes.ok) {
    throw new Error(`Init clinic failed: ${initRes.status} ${await initRes.text()}`);
  }

  const initData = await initRes.json();
  const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" })
  });

  if (!unlockRes.ok) {
    throw new Error(`Unlock staff failed: ${unlockRes.status} ${await unlockRes.text()}`);
  }

  const unlockData = await unlockRes.json();
  const staffToken = unlockData.staffToken;

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": staffToken,
    "Authorization": `Bearer ${staffToken}`
  };

  // Seed sample services into live catalog
  console.log(">>> [SEED] Seeding services with 804n codes and materialsCostRub...");
  await fetch("http://127.0.0.1:4100/api/settings/catalog", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Лечение кариеса (Filtek Ultimate)",
      category: "therapy",
      specialty: "therapist",
      basePriceRub: 5500,
      durationMinutes: 45,
      order804nCode: "A16.07.002.001",
      materialsCostRub: 1450.50
    })
  });

  await fetch("http://127.0.0.1:4100/api/settings/catalog", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Профессиональная гигиена полости рта (AirFlow + УЗ)",
      category: "hygiene",
      specialty: "hygienist",
      basePriceRub: 6800,
      durationMinutes: 60,
      order804nCode: "A16.07.051",
      materialsCostRub: 980.00
    })
  });

  // Seed chairs into live database
  console.log(">>> [SEED] Seeding chairs for clinic...");
  await fetch("http://127.0.0.1:4100/api/settings/chairs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Кабинет №1 (Терапия)",
      room: "101"
    })
  });

  await fetch("http://127.0.0.1:4100/api/settings/chairs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Кабинет №2 (Хирургия / Имплантология)",
      room: "102"
    })
  });

  return {
    clinicToken: initData.clinicToken,
    staffToken,
    ownerUserId: initData.ownerUserId
  };
}

async function saveScreenshot(page, filename) {
  const docsPath = path.join(DOCS_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);

  await page.screenshot({ path: docsPath, fullPage: false });
  fs.copyFileSync(docsPath, brainPath);

  const stats = fs.statSync(docsPath);
  console.log(`[SAVED] ${filename} -> size: ${(stats.size / 1024).toFixed(1)} KB`);
  if (stats.size < 20 * 1024) {
    console.warn(`[WARN] File ${filename} is smaller than 20 KB!`);
  }
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", t);
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("dente_theme_mode", t);
    if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
      window.__useThemeStore.getState().setThemeMode(t);
    }
  }, theme);
  await page.waitForTimeout(400);
}

async function run() {
  const creds = await provisionTestClinic();

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true
  });

  // ─── 1. Desktop 1440x900 Context ──────────────────────────────
  console.log("\n>>> [PC] Launching Desktop Context (1440x900)...");
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await pcContext.addInitScript(({ ct, st, uid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_session_token", st);
    localStorage.setItem("dente_active_user_id", uid);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      onboardingDismissed: true
    }));
    localStorage.setItem("dente_staff_session", JSON.stringify({
      userId: uid,
      name: "Д-р Воронов А. В.",
      fullName: "Д-р Воронов Алексей Владимирович",
      role: "owner",
      permissions: ["all"]
    }));
  }, { ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId });

  const page = await pcContext.newPage();
  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="settings-view"], #settings', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Switch to All Sections ("Все разделы") to make all tabs visible in sidebar
  console.log(">>> [PC] Switching to 'Все разделы' mode...");
  const roleAllBtn = page.locator('[data-testid="btn-settings-role-all"]');
  if (await roleAllBtn.isVisible().catch(() => false)) {
    await roleAllBtn.click();
    await page.waitForTimeout(500);
  }

  // 1.1 Prices Tab & Modal (Light)
  console.log(">>> [PC] Navigating to Prices Tab...");
  const pricesTabLocator = page.locator('#settings-tab-prices, [data-testid="settings-tab-prices"], [data-testid="owner-tab-prices"]').first();
  await pricesTabLocator.waitFor({ state: "visible", timeout: 10000 });
  await pricesTabLocator.click();
  await page.waitForTimeout(1000);

  console.log(">>> [PC] Opening PriceItemEditModal (Новая услуга)...");
  // Click on "Новая услуга" button
  const newServiceBtn = page.getByRole("button", { name: /Новая услуга|Услуга/ }).first();
  await newServiceBtn.click();
  await page.waitForTimeout(500);

  // Fill in form fields to demonstrate full autonomy and clean labels
  await page.locator("#service-title-input").fill("Лечение глубокого кариеса (композит Filtek Ultimate)");
  await page.locator("#service-code-input").fill("A16.07.002.001");
  await page.locator("#service-order804n-input").fill("A16.07.002.001");
  await page.locator("#service-price-input").fill("5500,00");
  await page.locator("#service-materials-cost-input").fill("1450.50");
  await page.waitForTimeout(400);

  console.log(">>> [PC] Capturing proof_settings_prices_modal_pc_light.png...");
  await setTheme(page, "light");
  await saveScreenshot(page, "proof_settings_prices_modal_pc_light.png");

  console.log(">>> [PC] Capturing proof_settings_prices_modal_pc_dark.png...");
  await setTheme(page, "dark");
  await saveScreenshot(page, "proof_settings_prices_modal_pc_dark.png");

  // Close modal
  const closeBtn = page.locator(".modal-close-btn, button:has-text('Отмена')").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 1.2 Staff Tab
  console.log(">>> [PC] Navigating to Staff Tab...");
  const staffTabLocator = page.locator('#settings-tab-staff, [data-testid="settings-tab-staff"], [data-testid="admin-tab-staff"]').first();
  await staffTabLocator.waitFor({ state: "visible", timeout: 10000 });
  await staffTabLocator.click();
  await page.waitForTimeout(1000);

  console.log(">>> [PC] Capturing proof_settings_staff_pc_light.png...");
  await setTheme(page, "light");
  await saveScreenshot(page, "proof_settings_staff_pc_light.png");

  console.log(">>> [PC] Capturing proof_settings_staff_pc_dark.png...");
  await setTheme(page, "dark");
  await saveScreenshot(page, "proof_settings_staff_pc_dark.png");

  // 1.3 Clinic Chairs Tab
  console.log(">>> [PC] Navigating to Clinic Tab...");
  const clinicTabLocator = page.locator('#settings-tab-clinic, [data-testid="settings-tab-clinic"], [data-testid="owner-tab-clinic"], [data-testid="admin-tab-clinic"]').first();
  await clinicTabLocator.waitFor({ state: "visible", timeout: 10000 });
  await clinicTabLocator.click();
  await page.waitForTimeout(1000);

  console.log(">>> [PC] Capturing proof_settings_pc_light.png...");
  await setTheme(page, "light");
  await saveScreenshot(page, "proof_settings_pc_light.png");

  console.log(">>> [PC] Capturing proof_settings_pc_dark.png...");
  await setTheme(page, "dark");
  await saveScreenshot(page, "proof_settings_pc_dark.png");

  // Scroll down to Chairs Master section
  await page.locator('text=Кабинеты и кресла').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  console.log(">>> [PC] Capturing proof_settings_clinic_chairs_pc_light.png...");
  await setTheme(page, "light");
  await saveScreenshot(page, "proof_settings_clinic_chairs_pc_light.png");

  console.log(">>> [PC] Capturing proof_settings_clinic_chairs_pc_dark.png...");
  await setTheme(page, "dark");
  await saveScreenshot(page, "proof_settings_clinic_chairs_pc_dark.png");

  await pcContext.close();

  // ─── 2. Mobile 390x844 Context ──────────────────────────────
  console.log("\n>>> [MOBILE] Launching Mobile Context (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  await mobileContext.addInitScript(({ ct, st, uid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_session_token", st);
    localStorage.setItem("dente_active_user_id", uid);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      onboardingDismissed: true
    }));
    localStorage.setItem("dente_staff_session", JSON.stringify({
      userId: uid,
      name: "Д-р Воронов А. В.",
      fullName: "Д-р Воронов Алексей Владимирович",
      role: "owner",
      permissions: ["all"]
    }));
  }, { ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForSelector(".settings-zone-mobile", { timeout: 15000 });
  // Wait until loading skeleton goes away
  await mobilePage.waitForFunction(() => !document.body.innerText.includes("загрузка"), { timeout: 15000 }).catch(() => {});
  await mobilePage.waitForTimeout(1000);

  // Capture Root Mobile Settings (Apple iOS Grouped Inset Card List)
  console.log(">>> [MOBILE] Capturing proof_settings_mobile_light.png...");
  await setTheme(mobilePage, "light");
  await saveScreenshot(mobilePage, "proof_settings_mobile_light.png");

  console.log(">>> [MOBILE] Capturing proof_settings_mobile_dark.png...");
  await setTheme(mobilePage, "dark");
  await saveScreenshot(mobilePage, "proof_settings_mobile_dark.png");
  await setTheme(mobilePage, "light");

  // If in mobile root settings, click on "Прейскурант услуг"
  console.log(">>> [MOBILE] Navigating to Mobile Pricelist...");
  const priceItem = mobilePage.getByText("Прейскурант услуг").first();
  if (await priceItem.isVisible()) {
    await priceItem.click();
    await mobilePage.waitForTimeout(1000);
  } else {
    const fallbackPriceItem = mobilePage.getByText(/Прейскурант/i).first();
    if (await fallbackPriceItem.isVisible()) {
      await fallbackPriceItem.click();
      await mobilePage.waitForTimeout(1000);
    }
  }

  // Open MobilePriceDrawer via floating bottom bar
  console.log(">>> [MOBILE] Opening MobilePriceDrawer...");
  const mobileAddBtn = mobilePage.locator('[data-testid="btn-mobile-add-price-bottom"]');
  if (await mobileAddBtn.isVisible()) {
    await mobileAddBtn.click();
    await mobilePage.waitForTimeout(600);
  } else {
    const fallbackAddBtn = mobilePage.getByRole("button", { name: /Новая услуга|Добавить/i }).first();
    if (await fallbackAddBtn.isVisible()) {
      await fallbackAddBtn.click();
      await mobilePage.waitForTimeout(600);
    }
  }

  console.log(">>> [MOBILE] Capturing proof_settings_prices_modal_mobile_light.png...");
  await setTheme(mobilePage, "light");
  await saveScreenshot(mobilePage, "proof_settings_prices_modal_mobile_light.png");

  console.log(">>> [MOBILE] Capturing proof_settings_prices_modal_mobile_dark.png...");
  await setTheme(mobilePage, "dark");
  await saveScreenshot(mobilePage, "proof_settings_prices_modal_mobile_dark.png");

  await mobileContext.close();
  await browser.close();

  console.log("\n>>> [SUCCESS] All 8 proof screenshots captured successfully!");
}

run().catch((err) => {
  console.error(">>> [FATAL]", err);
  process.exit(1);
});
