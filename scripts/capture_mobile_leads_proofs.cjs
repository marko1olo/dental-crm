const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const BRAIN_DIRS = [
  path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\198af957-6e3c-4cc5-b6b4-c03be082aafa"),
  path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc"),
];

async function captureMobileLeadsProofs() {
  console.log("[Playwright] Launching Chrome in iPhone 390x844 resolution...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });

  // 1. Enter demo mode
  console.log("[Playwright] Checking demo entry button...");
  const demoBtn = page.locator(".auth-demo-btn").first();
  if (await demoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("[Playwright] Clicking .auth-demo-btn...");
    await demoBtn.click();
    await page.waitForTimeout(1000);

    // Select Owner role (has leads permissions)
    console.log("[Playwright] Selecting Owner role card...");
    const ownerCard = page.locator('button:has-text("Главврач / Владелец")').first();
    await ownerCard.click();
    await page.waitForTimeout(500);

    const enterBtn = page.locator('button:has-text("Войти в демо-тур как")').first();
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("[Playwright] Found enterBtn, clicking...");
      await enterBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  // 2. Clean overlays and tour spotlight
  await page.evaluate(() => {
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // 3. Navigate to leads via MobileTabBar More drawer
  console.log("[Playwright] Waiting for MobileTabBar...");
  await page.waitForSelector(".mobile-tab-bar", { timeout: 10000 });

  console.log("[Playwright] Opening 'Ещё' tab in MobileTabBar...");
  const moreTab = page.locator('.mobile-tab-item:has-text("Ещё")').first();
  await moreTab.click({ force: true });
  await page.waitForTimeout(1000);

  // Clean overlays again before drawer click
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  console.log("[Playwright] Clicking 'Обращения и лиды'...");
  const leadsRow = page.locator('.ios-grouped-row:has-text("Обращения")').first();
  await leadsRow.waitFor({ state: "visible", timeout: 5000 });
  await leadsRow.click({ force: true });
  await page.waitForTimeout(2500);

  // Clean overlays after view switch
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
  });

  // 4. Wait for mobile leads cards
  console.log("[Playwright] Waiting for .leads-mobile-card...");
  await page.waitForSelector(".leads-mobile-card", { timeout: 15000 });
  console.log("[Playwright] Leads mobile cards loaded!");

  // 5. Capture LIGHT Mode Proof
  console.log("[Playwright] Capturing LIGHT mode feed...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
  });
  await page.waitForTimeout(800);

  const lightShot = path.resolve(OUT_DIR, "proof_mobile_leads_feed_light.png");
  await page.screenshot({ path: lightShot });
  console.log("[Playwright] Saved Light Feed:", lightShot);

  // 6. Capture DARK Mode Proof
  console.log("[Playwright] Capturing DARK mode feed...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
  });
  await page.waitForTimeout(800);

  const darkShot = path.resolve(OUT_DIR, "proof_mobile_leads_feed_dark.png");
  await page.screenshot({ path: darkShot });
  console.log("[Playwright] Saved Dark Feed:", darkShot);

  // 7. Click first lead card to open LeadMobileBottomSheet
  console.log("[Playwright] Opening Bottom Sheet for first lead...");
  const firstCard = page.locator(".leads-mobile-card").first();
  await firstCard.waitFor({ state: "visible", timeout: 5000 });
  await firstCard.click({ force: true });

  // Wait for bottom sheet
  await page.waitForSelector('[data-testid="lead-mobile-bottom-sheet"]', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Clean any floating toasts
  await page.evaluate(() => {
    document.querySelectorAll('.global-toast-container, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"]').forEach((el) => el.remove());
  });

  const sheetDarkShot = path.resolve(OUT_DIR, "proof_mobile_leads_sheet_dark.png");
  await page.screenshot({ path: sheetDarkShot });
  console.log("[Playwright] Saved Dark Bottom Sheet:", sheetDarkShot);

  // 8. Copy all screenshots to brain directories
  for (const bDir of BRAIN_DIRS) {
    if (fs.existsSync(bDir)) {
      try {
        fs.copyFileSync(lightShot, path.resolve(bDir, "proof_mobile_leads_feed_light.png"));
        fs.copyFileSync(darkShot, path.resolve(bDir, "proof_mobile_leads_feed_dark.png"));
        fs.copyFileSync(sheetDarkShot, path.resolve(bDir, "proof_mobile_leads_sheet_dark.png"));
        console.log(`[Playwright] Copied screenshots to brain dir: ${bDir}`);
      } catch (e) {
        console.error(`[Playwright] Failed to copy to ${bDir}:`, e.message);
      }
    }
  }

  await browser.close();
  console.log("[Playwright] ALL MOBILE LEADS PROOFS CAPTURED SUCCESSFULLY!");
}

captureMobileLeadsProofs().catch((err) => {
  console.error("[Playwright] Error:", err);
  process.exit(1);
});
