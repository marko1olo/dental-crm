const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function captureLabProofs() {
  const proofsDir = path.resolve(__dirname, "../docs/proofs/lab");
  fs.mkdirSync(proofsDir, { recursive: true });

  console.log("=== Launching Playwright for Dental Lab SSOT Proofs ===");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const setupStorage = async (context) => {
    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
        })
      );
    });
  };

  const suppressTour = async (page) => {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .shepherd-element {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    });
  };

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. PC KANBAN PROOFS (1440x900)
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing PC Kanban (1440x900) ---");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await setupStorage(desktopContext);

    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto("http://127.0.0.1:5173/?demo=true#lab", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for hydration
    for (let i = 0; i < 30; i++) {
      await desktopPage.waitForTimeout(500);
      const isReady = await desktopPage.evaluate(() => {
        const hasBoot = !!document.querySelector(".boot-state");
        const hasContent = !!document.querySelector('[data-testid="dental-lab-orders-view"]');
        return !hasBoot && hasContent;
      });
      if (isReady) break;
    }

    await suppressTour(desktopPage);

    // Switch to Kanban view
    console.log("Switching to Kanban view...");
    const kanbanBtn = desktopPage.locator('[data-testid="lab-orders-view-kanban-btn"]');
    if (await kanbanBtn.count()) {
      await kanbanBtn.click();
      await desktopPage.waitForTimeout(600);
    } else {
      console.warn("Kanban button not found by testid, checking alternative...");
    }

    // Wait for Kanban container
    await desktopPage.waitForSelector('[data-testid="lab-orders-kanban-container"], .ztl-kanban-board', {
      timeout: 10000,
    });

    // ─── 1.1 PC Light Kanban ───
    await desktopPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await desktopPage.waitForTimeout(500);

    const pcLightPath = path.join(proofsDir, "lab_orders_kanban_pc_light.png");
    await desktopPage.screenshot({ path: pcLightPath, fullPage: false });
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`✓ Saved PC Light Kanban: ${pcLightPath} (${(pcLightSize / 1024).toFixed(1)} KB)`);
    if (pcLightSize < 30000) throw new Error("PC Light Kanban screenshot is too small (<30KB)");

    // ─── 1.2 PC Dark Kanban ───
    await desktopPage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await desktopPage.waitForTimeout(500);

    const pcDarkPath = path.join(proofsDir, "lab_orders_kanban_pc_dark.png");
    await desktopPage.screenshot({ path: pcDarkPath, fullPage: false });
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`✓ Saved PC Dark Kanban: ${pcDarkPath} (${(pcDarkSize / 1024).toFixed(1)} KB)`);
    if (pcDarkSize < 30000) throw new Error("PC Dark Kanban screenshot is too small (<30KB)");

    await desktopContext.close();

    // ═══════════════════════════════════════════════════════════════════════
    // 2. MOBILE DENTAL LAB ORDER DRAWER PROOFS (390x844)
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Mobile Order Drawer (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await setupStorage(mobileContext);

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#lab", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    for (let i = 0; i < 30; i++) {
      await mobilePage.waitForTimeout(500);
      const isReady = await mobilePage.evaluate(() => {
        const hasBoot = !!document.querySelector(".boot-state");
        const hasMobileTimeline = !!document.querySelector(".mobile-lab-container");
        return !hasBoot && hasMobileTimeline;
      });
      if (isReady) break;
    }

    await suppressTour(mobilePage);

    // Open DentalLabOrderDrawer via event dispatch
    console.log("Triggering opening of DentalLabOrderDrawer on mobile...");
    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-lab-order-drawer"));
    });

    // Wait for drawer to be visible
    await mobilePage.waitForSelector('[data-testid="dental-lab-order-drawer"]', {
      timeout: 10000,
    });
    await mobilePage.waitForTimeout(600);

    // ─── 2.1 Mobile Light Order Drawer ───
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await mobilePage.waitForTimeout(500);

    const mobileLightPath = path.join(proofsDir, "lab_order_drawer_mobile_light.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    const mobileLightSize = fs.statSync(mobileLightPath).size;
    console.log(`✓ Saved Mobile Light Order Drawer: ${mobileLightPath} (${(mobileLightSize / 1024).toFixed(1)} KB)`);
    if (mobileLightSize < 30000) throw new Error("Mobile Light Drawer screenshot is too small (<30KB)");

    // ─── 2.2 Mobile Dark Order Drawer ───
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await mobilePage.waitForTimeout(500);

    const mobileDarkPath = path.join(proofsDir, "lab_order_drawer_mobile_dark.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    const mobileDarkSize = fs.statSync(mobileDarkPath).size;
    console.log(`✓ Saved Mobile Dark Order Drawer: ${mobileDarkPath} (${(mobileDarkSize / 1024).toFixed(1)} KB)`);
    if (mobileDarkSize < 30000) throw new Error("Mobile Dark Drawer screenshot is too small (<30KB)");

    await mobileContext.close();
    console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

captureLabProofs().catch((err) => {
  console.error("FATAL in captureLabProofs:", err);
  process.exit(1);
});
