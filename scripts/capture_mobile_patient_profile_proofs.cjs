const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureProofs() {
  console.log("[Playwright] Starting patient profile visual proofs capture...");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ─────────────────────────────────────────────────────────────
  // 1. MOBILE 390x844 (iPhone 14 / Apple HIG Touch Cockpit)
  // ─────────────────────────────────────────────────────────────
  console.log("[Playwright] Setting up mobile context 390x844...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });

  // 1. Click "Быстрый вход в Демо-тур"
  const quickDemoBtn = mobilePage.locator('button:has-text("Быстрый вход в Демо-тур")').first();
  await quickDemoBtn.waitFor({ state: "visible", timeout: 15000 });
  console.log("[Playwright] Found quickDemoBtn, clicking...");
  await quickDemoBtn.click();

  // 2. Click "Войти в демо-тур как Терапевт"
  const enterBtn = mobilePage.locator('button:has-text("Войти в демо-тур как Терапевт")').first();
  await enterBtn.waitFor({ state: "visible", timeout: 15000 });
  console.log("[Playwright] Found enterBtn, clicking...");
  await enterBtn.click();
  await mobilePage.waitForTimeout(2500);

  // 3. Clear tour overlays
  await mobilePage.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  // 4. Wait for MobileTabBar and click "Пациенты"
  console.log("[Playwright] Waiting for MobileTabBar...");
  await mobilePage.waitForSelector(".mobile-tab-bar", { timeout: 15000 });
  const patientsTab = mobilePage.locator('.mobile-tab-item:has-text("Пациенты")').first();
  await patientsTab.waitFor({ state: "visible", timeout: 10000 });
  console.log("[Playwright] Clicking Patients in MobileTabBar...");
  await patientsTab.click();
  await mobilePage.waitForTimeout(2000);

  // 5. Wait for the new Apple Health Grouped Inset Card
  console.log("[Playwright] Waiting for [data-testid=\"mobile-grouped-inset-card\"]...");
  await mobilePage.waitForSelector('[data-testid="mobile-grouped-inset-card"]', { timeout: 15000 });
  console.log("[Playwright] Found [data-testid=\"mobile-grouped-inset-card\"]!");

  // Clean overlays again just in case
  await mobilePage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
  });

  // 6. Click on first patient item (Healthy Norm)
  console.log("[Playwright] Clicking first patient item to open Mobile Patient Workspace...");
  const patientRow1 = mobilePage.locator('.mobile-patient-item, [data-testid^="mobile-patient-item-"]').first();
  await patientRow1.waitFor({ state: "visible", timeout: 10000 });
  await patientRow1.click({ force: true });
  await mobilePage.waitForTimeout(2000);

  // Verify MobilePatientProfileWorkspace mounted
  await mobilePage.waitForSelector('[data-testid="mobile-patient-profile-workspace"]', { timeout: 15000 });

  // Clean overlays again
  await mobilePage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
  });

  // 8. Capture Mobile LIGHT Mode Proof (Patient 1: Healthy Norm)
  console.log("[Playwright] Capturing Mobile LIGHT mode screenshot (Patient 1)...");
  await mobilePage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await mobilePage.waitForTimeout(800);
  const mobileLightPath = path.resolve(OUT_DIR, "proof_mobile_patient_hud_light.png");
  await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
  console.log("[Playwright] Saved Light Mode Proof:", mobileLightPath);

  // 9. Capture Mobile DARK Mode Proof (Patient 1: Healthy Norm)
  console.log("[Playwright] Capturing Mobile DARK mode screenshot (Patient 1)...");
  await mobilePage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await mobilePage.waitForTimeout(800);
  const mobileDarkPath = path.resolve(OUT_DIR, "proof_mobile_patient_hud_dark.png");
  await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
  console.log("[Playwright] Saved Dark Mode Proof:", mobileDarkPath);

  // 10. Click Back to List and select Patient 2 (Allergy on Penicillin)
  console.log("[Playwright] Clicking Back to list...");
  const backBtn = mobilePage.locator('[data-testid="mobile-patient-back-btn"]').first();
  await backBtn.click({ force: true });
  await mobilePage.waitForTimeout(1500);

  console.log("[Playwright] Clicking Patient 2 (Voronov with Penicillin allergy)...");
  const patientRow2 = mobilePage.locator('.mobile-patient-item, [data-testid^="mobile-patient-item-"]').nth(1);
  if (await patientRow2.isVisible({ timeout: 5000 }).catch(() => false)) {
    await patientRow2.click({ force: true });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.waitForSelector('[data-testid="mobile-patient-profile-workspace"]', { timeout: 15000 });

    // Clean overlays
    await mobilePage.evaluate(() => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
    });

    // Capture Patient 2 Allergy Light & Dark
    console.log("[Playwright] Capturing Patient 2 Allergy in Light mode...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
    });
    await mobilePage.waitForTimeout(800);
    const allergyLightPath = path.resolve(OUT_DIR, "proof_mobile_patient_allergy_light.png");
    await mobilePage.screenshot({ path: allergyLightPath, fullPage: false });
    console.log("[Playwright] Saved Allergy Light Proof:", allergyLightPath);

    console.log("[Playwright] Capturing Patient 2 Allergy in Dark mode...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await mobilePage.waitForTimeout(800);
    const allergyDarkPath = path.resolve(OUT_DIR, "proof_mobile_patient_allergy_dark.png");
    await mobilePage.screenshot({ path: allergyDarkPath, fullPage: false });
    console.log("[Playwright] Saved Allergy Dark Proof:", allergyDarkPath);
  }

  await mobileContext.close();

  // ─────────────────────────────────────────────────────────────
  // 2. DESKTOP 1440x900 (Large Display Ergonomics)
  // ─────────────────────────────────────────────────────────────
  console.log("[Playwright] Setting up desktop context 1440x900...");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });

  // Handle demo-tour login
  const desktopDemoBtn = desktopPage.locator('button:has-text("Быстрый вход в Демо-тур")').first();
  await desktopDemoBtn.waitFor({ state: "visible", timeout: 15000 });
  await desktopDemoBtn.click();
  const desktopEnterBtn = desktopPage.locator('button:has-text("Войти в демо-тур как Терапевт")').first();
  await desktopEnterBtn.waitFor({ state: "visible", timeout: 15000 });
  await desktopEnterBtn.click();
  await desktopPage.waitForTimeout(2500);

  // Clear tour overlays
  await desktopPage.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
  });

  // Navigate to Patients in sidebar
  console.log("[Playwright] Clicking Patients in desktop sidebar...");
  const desktopPatientsNav = desktopPage.locator('button:has-text("Пациенты"), a:has-text("Пациенты")').first();
  await desktopPatientsNav.waitFor({ state: "visible", timeout: 15000 });
  await desktopPatientsNav.click();
  await desktopPage.waitForTimeout(2000);

  // Click first patient item in desktop list if present
  const desktopPatientRow = desktopPage.locator('.patient-item, [data-patient-id]').first();
  if (await desktopPatientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    await desktopPatientRow.click();
    await desktopPage.waitForTimeout(1500);
  }

  // Clear overlays again
  await desktopPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // Desktop Light Mode
  console.log("[Playwright] Capturing Desktop LIGHT mode...");
  await desktopPage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await desktopPage.waitForTimeout(800);
  const desktopLightPath = path.resolve(OUT_DIR, "proof_desktop_patient_profile_light.png");
  await desktopPage.screenshot({ path: desktopLightPath, fullPage: false });
  console.log("[Playwright] Saved:", desktopLightPath);

  // Desktop Dark Mode
  console.log("[Playwright] Capturing Desktop DARK mode...");
  await desktopPage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await desktopPage.waitForTimeout(800);
  const desktopDarkPath = path.resolve(OUT_DIR, "proof_desktop_patient_profile_dark.png");
  await desktopPage.screenshot({ path: desktopDarkPath, fullPage: false });
  console.log("[Playwright] Saved:", desktopDarkPath);

  await desktopContext.close();
  await browser.close();
  console.log("[Playwright] All visual proofs captured successfully!");
}

captureProofs().catch((err) => {
  console.error("[Playwright] Execution failed:", err);
  process.exit(1);
});
