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
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
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
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
        })
      );
    });
  };

  const suppressTour = async (page) => {
    try {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays";
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .shepherd-element {
            display: none !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
      });
    } catch (_) {}
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
      waitUntil: "commit",
      timeout: 30000,
    });

    console.log("Waiting for lab view and kanban button selector...");
    await desktopPage.waitForSelector('[data-testid="lab-orders-view-kanban-btn"]', { timeout: 45000 });
    await suppressTour(desktopPage);

    // Switch to Kanban view
    console.log("Switching to Kanban view...");
    await desktopPage.click('[data-testid="lab-orders-view-kanban-btn"]');
    await desktopPage.waitForSelector('[data-testid="canonical-4-stage-kanban-board"], .ztl-kanban-board', {
      timeout: 15000,
    });
    await desktopPage.waitForTimeout(1000);

    // ─── 1.1 PC Light Kanban ───
    await desktopPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
    }).catch(() => {});
    await suppressTour(desktopPage);
    await desktopPage.waitForTimeout(600);

    const pcLightPath = path.join(proofsDir, "lab_orders_kanban_pc_light.png");
    await desktopPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`✓ Saved PC Light Kanban: ${pcLightPath} (${(pcLightSize / 1024).toFixed(1)} KB)`);
    if (pcLightSize < 20000) throw new Error("PC Light Kanban screenshot is too small (<20KB)");

    // ─── 1.2 PC Dark Kanban ───
    await desktopPage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_theme", "dark");
    }).catch(() => {});
    await suppressTour(desktopPage);
    await desktopPage.waitForTimeout(600);

    const pcDarkPath = path.join(proofsDir, "lab_orders_kanban_pc_dark.png");
    await desktopPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`✓ Saved PC Dark Kanban: ${pcDarkPath} (${(pcDarkSize / 1024).toFixed(1)} KB)`);
    if (pcDarkSize < 20000) throw new Error("PC Dark Kanban screenshot is too small (<20KB)");

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
      waitUntil: "commit",
      timeout: 30000,
    });

    console.log("Waiting for mobile lab container...");
    await mobilePage.waitForSelector('.mobile-lab-container, [data-testid="mobile-lab-orders-timeline-view"]', {
      timeout: 45000,
    });
    await suppressTour(mobilePage);

    // Open DentalLabOrderDrawer via event dispatch or button
    console.log("Triggering opening of DentalLabOrderDrawer on mobile...");
    await mobilePage.click('[data-testid="mobile-lab-add-order-btn"]').catch(() => {
      return mobilePage.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente-open-lab-order-drawer"));
      });
    });

    // Wait for drawer to be visible
    await mobilePage.waitForSelector('[data-testid="dental-lab-order-drawer"]', {
      timeout: 15000,
    });
    await mobilePage.waitForTimeout(800);

    // ─── 2.1 Mobile Light Order Drawer ───
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
    }).catch(() => {});
    await suppressTour(mobilePage);
    await mobilePage.waitForTimeout(600);

    const mobileLightPath = path.join(proofsDir, "lab_order_drawer_mobile_light.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false, animations: "disabled" });
    const mobileLightSize = fs.statSync(mobileLightPath).size;
    console.log(`✓ Saved Mobile Light Order Drawer: ${mobileLightPath} (${(mobileLightSize / 1024).toFixed(1)} KB)`);
    if (mobileLightSize < 20000) throw new Error("Mobile Light Drawer screenshot is too small (<20KB)");

    // ─── 2.2 Mobile Dark Order Drawer ───
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_theme", "dark");
    }).catch(() => {});
    await suppressTour(mobilePage);
    await mobilePage.waitForTimeout(600);

    const mobileDarkPath = path.join(proofsDir, "lab_order_drawer_mobile_dark.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
    const mobileDarkSize = fs.statSync(mobileDarkPath).size;
    console.log(`✓ Saved Mobile Dark Order Drawer: ${mobileDarkPath} (${(mobileDarkSize / 1024).toFixed(1)} KB)`);
    if (mobileDarkSize < 20000) throw new Error("Mobile Dark Drawer screenshot is too small (<20KB)");

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
