const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ca52ff2c-5e94-4ac2-b186-bbe8f1d866c5";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/segmented_controls";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log("=== Starting DENTE Segmented Controls & Font Standard Proof Capture ===");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    // 1. PC Browser Context (1440x900)
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    const page = await pcContext.newPage();

    // ── PROOF 1: Doctor Autonomy Preview - EMK Tab (Light Mode) ──
    console.log("Navigating to http://127.0.0.1:5173/doctor_autonomy_preview.html ...");
    await page.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html", {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    await wait(2000);

    // Click on tab 2: "2. Норма ЭМК"
    const tab2 = await page.waitForSelector('button[data-testid="tab-emk-toolbar"]', { timeout: 5000 });
    console.log("Clicking tab-emk-toolbar with force...");
    await tab2.click({ force: true });
    await wait(1500);

    const proof1PathLocal = path.join(LOCAL_DIR, "proof_01_emk_segmented_light.png");
    const proof1PathArtifact = path.join(ARTIFACTS_DIR, "proof_01_emk_segmented_light.png");
    await page.screenshot({ path: proof1PathLocal, fullPage: false });
    fs.copyFileSync(proof1PathLocal, proof1PathArtifact);
    console.log("Saved Proof 1 (Light):", proof1PathLocal);

    // ── PROOF 2: Doctor Autonomy Preview - EMK Tab (Dark Mode) ──
    const themeBtn = await page.waitForSelector('button[data-testid="theme-toggle-btn"]', { timeout: 5000 });
    console.log("Switching to Dark theme via theme-toggle-btn with force...");
    await themeBtn.click({ force: true });
    await wait(1500);

    const proof2PathLocal = path.join(LOCAL_DIR, "proof_02_emk_segmented_dark.png");
    const proof2PathArtifact = path.join(ARTIFACTS_DIR, "proof_02_emk_segmented_dark.png");
    await page.screenshot({ path: proof2PathLocal, fullPage: false });
    fs.copyFileSync(proof2PathLocal, proof2PathArtifact);
    console.log("Saved Proof 2 (Dark):", proof2PathLocal);

    // ── PROOF 3 & 4: Mobile Viewport (390x844) - Mobile Chairside Visit ──
    await pcContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html", {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    await wait(2000);

    // Click on mobile tab: "3. Мобильный приём"
    const tab3 = await mobilePage.waitForSelector('button[data-testid="tab-mobile-chairside"]', { timeout: 5000 });
    console.log("Clicking tab-mobile-chairside with force...");
    await tab3.click({ force: true });
    await wait(1500);

    const proof4PathLocal = path.join(LOCAL_DIR, "proof_04_mobile_chairside_light.png");
    const proof4PathArtifact = path.join(ARTIFACTS_DIR, "proof_04_mobile_chairside_light.png");
    await mobilePage.screenshot({ path: proof4PathLocal, fullPage: false });
    fs.copyFileSync(proof4PathLocal, proof4PathArtifact);
    console.log("Saved Proof 4 (Mobile Light):", proof4PathLocal);

    // Switch mobile to dark theme
    const mobileThemeBtn = await mobilePage.waitForSelector('button[data-testid="theme-toggle-btn"]', { timeout: 5000 });
    console.log("Switching mobile to Dark theme with force...");
    await mobileThemeBtn.click({ force: true });
    await wait(1500);

    const proof3PathLocal = path.join(LOCAL_DIR, "proof_03_mobile_chairside_dark.png");
    const proof3PathArtifact = path.join(ARTIFACTS_DIR, "proof_03_mobile_chairside_dark.png");
    await mobilePage.screenshot({ path: proof3PathLocal, fullPage: false });
    fs.copyFileSync(proof3PathLocal, proof3PathArtifact);
    console.log("Saved Proof 3 (Mobile Dark):", proof3PathLocal);

    await mobileContext.close();

    // ── PROOF 5: Main App Odontogram Toolbar in Visit Studio ──
    const appCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    await appCtx.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "dental");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", "demo-chief");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    });

    const appPage = await appCtx.newPage();
    console.log("Opening main app at http://127.0.0.1:5173/?demo=true#visits ...");
    await appPage.goto("http://127.0.0.1:5173/?demo=true#visits", {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    await wait(2500);

    // If still on auth screen, click demo unlock
    const demoBtn = await appPage.$(".auth-demo-btn");
    if (demoBtn) {
      console.log("Clicking .auth-demo-btn...");
      await demoBtn.click();
      await wait(1500);
    }

    // Dismiss any overlays
    await appPage.evaluate(() => {
      const startBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("0-клик старт"));
      if (startBtn) startBtn.click();
      document.querySelectorAll('.fixed.inset-0, .onboarding-modal, [role="dialog"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card').forEach((el) => {
        el.remove();
      });
    });
    await wait(1000);

    const proof5PathLocal = path.join(LOCAL_DIR, "proof_05_main_app_visits_light.png");
    const proof5PathArtifact = path.join(ARTIFACTS_DIR, "proof_05_main_app_visits_light.png");
    await appPage.screenshot({ path: proof5PathLocal, fullPage: false });
    fs.copyFileSync(proof5PathLocal, proof5PathArtifact);
    console.log("Saved Proof 5 (Main App Visits Light):", proof5PathLocal);

    await appCtx.close();
    console.log("=== All Visual Proofs Captured Successfully ===");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
