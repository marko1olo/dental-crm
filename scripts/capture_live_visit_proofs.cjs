const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function captureVisitProofs() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/6d815c86-c779-4f38-bbd1-0f0abe81c076"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
  const outDir = targetDirs[0];

  console.log("[Playwright] Launching Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

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
    await page.waitForTimeout(600);
  }

  async function takeProof(page, fileName, viewName, modeName) {
    const targetFile = path.join(outDir, fileName);
    await page.waitForTimeout(600);
    await page.screenshot({ path: targetFile, fullPage: false });

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        fs.copyFileSync(targetFile, dest);
      }
    }

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`
    );
  }

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1440x900)
  // =========================================================================
  console.log("\n>>> DESKTOP SUITE (1440x900) <<<");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const dPage = await desktopContext.newPage();

  console.log("Loading http://127.0.0.1:5174/ ...");
  await dPage.goto("http://127.0.0.1:5174/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForTimeout(3000);

  // 1. Click Demo Tour Button
  const demoBtn = dPage.locator('text=Быстрый вход в Демо-тур').first();
  if (await demoBtn.isVisible()) {
    console.log("Clicking Demo Tour button...");
    await demoBtn.click();
    await dPage.waitForTimeout(1500);
  }

  // 2. Click Launch Role Button (Therapist)
  const launchBtn = dPage.locator('.auth-submit-btn--glow').first();
  if (await launchBtn.isVisible()) {
    console.log("Launching Therapist Demo Role...");
    await launchBtn.click();
    await dPage.waitForTimeout(3000);
  }

  // 3. Remove onboarding / tour spotlight if present
  await dPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // 4. Navigate to Visit View
  console.log("Navigating to Visit view...");
  const visitNavBtn = dPage.locator('button:has-text("Прием"), a:has-text("Прием"), [data-testid="nav-visit"]').first();
  if (await visitNavBtn.isVisible()) {
    await visitNavBtn.click();
    await dPage.waitForTimeout(2000);
  } else {
    await dPage.evaluate(() => { window.location.hash = "visit"; });
    await dPage.waitForTimeout(2000);
  }

  // Remove tour overlays again
  await dPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Switch to EMK Tab in visit if present
  const emkTab = dPage.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК"), [data-testid="visit-subtab-emk"]').first();
  if (await emkTab.isVisible()) {
    await emkTab.click({ force: true });
    console.log("Clicked EMK tab in visit");
    await dPage.waitForTimeout(1000);
  }

  // 1A. Visit Desktop Light
  await applyTheme(dPage, "light");
  await takeProof(dPage, "proof_01_visit_desktop_light.png", "Visit View", "Desktop Light");

  // 1B. Open Protocols Dropdown Menu in Desktop Light
  const menuBtn = dPage.locator('[data-testid="btn-toggle-extra-soap-menu"]').first();
  if (await menuBtn.isVisible()) {
    console.log("Opening Protocols dropdown menu in Light mode...");
    await menuBtn.click({ force: true });
    await dPage.waitForTimeout(600);
    await takeProof(dPage, "proof_02_visit_protocols_dropdown_open_light.png", "Protocols Menu Open", "Desktop Light");
    // Close menu
    await menuBtn.click({ force: true });
    await dPage.waitForTimeout(400);
  }

  // 1C. Visit Desktop Dark
  await applyTheme(dPage, "dark");
  await takeProof(dPage, "proof_03_visit_desktop_dark.png", "Visit View", "Desktop Dark");

  // 1D. Open Protocols Dropdown Menu in Desktop Dark
  if (await menuBtn.isVisible()) {
    console.log("Opening Protocols dropdown menu in Dark mode...");
    await menuBtn.click({ force: true });
    await dPage.waitForTimeout(600);
    await takeProof(dPage, "proof_04_visit_protocols_dropdown_open_dark.png", "Protocols Menu Open", "Desktop Dark");
    await menuBtn.click({ force: true });
    await dPage.waitForTimeout(400);
  }

  await desktopContext.close();

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844)
  // =========================================================================
  console.log("\n>>> MOBILE SUITE (390x844) <<<");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mPage = await mobileContext.newPage();

  await mPage.goto("http://127.0.0.1:5174/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForTimeout(3000);

  const mDemoBtn = mPage.locator('text=Быстрый вход в Демо-тур').first();
  if (await mDemoBtn.isVisible()) {
    await mDemoBtn.click();
    await mPage.waitForTimeout(1500);
  }

  const mLaunchBtn = mPage.locator('.auth-submit-btn--glow').first();
  if (await mLaunchBtn.isVisible()) {
    await mLaunchBtn.click();
    await mPage.waitForTimeout(3000);
  }

  await mPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  const mVisitNavBtn = mPage.locator('button:has-text("Прием"), a:has-text("Прием"), [data-testid="nav-visit"]').first();
  if (await mVisitNavBtn.isVisible()) {
    await mVisitNavBtn.click();
    await mPage.waitForTimeout(2000);
  } else {
    await mPage.evaluate(() => { window.location.hash = "visit"; });
    await mPage.waitForTimeout(2000);
  }

  const mEmkTab = mPage.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК"), [data-testid="visit-subtab-emk"]').first();
  if (await mEmkTab.isVisible()) {
    await mEmkTab.click({ force: true });
    await mPage.waitForTimeout(1000);
  }

  // 2A. Mobile Light
  await applyTheme(mPage, "light");
  await takeProof(mPage, "proof_05_visit_mobile_light.png", "Visit View", "Mobile Light");

  // 2B. Mobile Dark
  await applyTheme(mPage, "dark");
  await takeProof(mPage, "proof_06_visit_mobile_dark.png", "Visit View", "Mobile Dark");

  await mobileContext.close();
  await browser.close();

  console.log("\n==================================================");
  console.log("VISIT TOOLBAR RED TEAM PROOF SUMMARY");
  console.log("==================================================");
  console.table(capturedRegistry);
  console.log(`\nTotal captured: ${capturedRegistry.length}/6`);
}

captureVisitProofs().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
