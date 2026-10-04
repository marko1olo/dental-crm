const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const PARENT_ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";
const MY_ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\fca5d8f9-d6bd-43df-9974-83d8696d0acd";
const DOCS_DIR = path.resolve("docs/screenshots/inquisition_live");

for (const dir of [DOCS_DIR, PARENT_ARTIFACT_DIR, MY_ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveProof(page, basename) {
  const docsPath = path.join(DOCS_DIR, basename);
  const parentArtifactPath = path.join(PARENT_ARTIFACT_DIR, basename);
  const myArtifactPath = path.join(MY_ARTIFACT_DIR, basename);

  await page.screenshot({ path: docsPath });
  fs.copyFileSync(docsPath, parentArtifactPath);
  fs.copyFileSync(docsPath, myArtifactPath);
  console.log(`[PROOF SAVED]: ${basename} -> docs + brain artifacts`);
}

async function run() {
  console.log("Launching Chrome for Mobile Shell & Bottom Tab Bar Proofs (390x844)...");
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
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  const port = process.env.VITE_PORT || "5173";
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Authenticate demo
  const demoBtn = page.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(600);
  }

  const launchBtn = page.locator(".auth-submit-btn--glow").first();
  if (await launchBtn.isVisible()) {
    await launchBtn.click();
    await page.waitForTimeout(2000);
  }

  // Dismiss any tour modals / overlays / compact strips
  await page.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover').forEach((el) => el.remove());
  });

  // Verify bottom tab bar exists
  await page.waitForSelector(".mobile-tab-bar", { timeout: 10000 });
  console.log("Found .mobile-tab-bar on page!");

  // Click on "Расписание" tab to ensure schedule view is active
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll(".mobile-tab-item"));
    const sched = tabs.find((t) => t.textContent && t.textContent.includes("Расписание"));
    if (sched) sched.click();
    document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover').forEach((el) => el.remove());
  });
  await page.waitForTimeout(800);

  // Measure geometry and horizontal scroll
  const metrics = await page.evaluate(() => {
    const tabbar = document.querySelector(".mobile-tab-bar");
    const topbar = document.querySelector(".topbar");
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    return {
      tabbarHeight: tabbar ? tabbar.offsetHeight : null,
      topbarHeight: topbar ? topbar.offsetHeight : null,
      hasHorizontalOverflow: docWidth > winWidth,
      scrollWidth: docWidth,
      innerWidth: winWidth,
    };
  });
  console.log("Measured Mobile Metrics:", JSON.stringify(metrics, null, 2));

  // 1. LIGHT THEME — SCHEDULE VIEW WITH TAB BAR
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.setItem("dente_theme_mode", "light");
    document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover').forEach((el) => el.remove());
  });
  await page.waitForTimeout(600);
  await saveProof(page, "proof_mobile_shell_tabbar_light.png");

  // 2. DARK THEME — SCHEDULE VIEW WITH TAB BAR
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    localStorage.setItem("dente_theme_mode", "dark");
    document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover').forEach((el) => el.remove());
  });
  await page.waitForTimeout(600);
  await saveProof(page, "proof_mobile_shell_tabbar_dark.png");

  // 3. DARK THEME — OPEN "MORE" BOTTOM SHEET
  console.log("Opening More Bottom Sheet Drawer...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll(".mobile-tab-item"));
    const moreBtn = buttons.find((btn) => btn.textContent && btn.textContent.includes("Ещё"));
    if (moreBtn) {
      moreBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
  });
  await page.waitForTimeout(600);
  await page.waitForFunction(() => !!document.querySelector(".ios-bottom-sheet-surface"));
  await page.waitForTimeout(400); // Wait for transition
  await saveProof(page, "proof_mobile_shell_more_drawer_dark.png");

  // 4. LIGHT THEME — OPEN "MORE" BOTTOM SHEET
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.setItem("dente_theme_mode", "light");
  });
  await page.waitForTimeout(600);
  await saveProof(page, "proof_mobile_shell_more_drawer_light.png");

  await browser.close();
  console.log("SUCCESS: All mobile shell & bottom tab bar proofs captured and saved!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
