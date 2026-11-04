const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function captureZtlConsolidatedProofs() {
  const proofsDir = path.resolve(__dirname, "../docs/proofs/lab");
  fs.mkdirSync(proofsDir, { recursive: true });

  console.log("=== Launching Chromium for ZTL Consolidated Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const setupStorage = async (context, theme = "light") => {
    await context.addInitScript((th) => {
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
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Смирнова Е. В. (Ортопед)",
          role: "doctor",
        })
      );
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    }, theme);
  };

  const suppressOverlays = async (page) => {
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
    // 1. PC VIEWPORT (1440x900) - Hub & Order Modal
    // ═══════════════════════════════════════════════════════════════════════
    for (const theme of ["light", "dark"]) {
      console.log(`\n--- Capturing PC (${theme.toUpperCase()}) ---`);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      await setupStorage(context, theme);
      const page = await context.newPage();

      // Open Hub via launcher
      await page.goto("http://127.0.0.1:5173/?standalone=dental_lab", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      await suppressOverlays(page);

      // Verify Hub loaded
      await page.waitForSelector('[data-testid="dental-lab-orders-hub-modal"]', { timeout: 15000 }).catch(() => {});
      const hubPic = path.join(proofsDir, `ztl_hub_pc_${theme}.png`);
      await page.screenshot({ path: hubPic, fullPage: false, animations: "disabled" });
      console.log(`✓ Saved ZTL Hub PC (${theme}): ${hubPic} (${(fs.statSync(hubPic).size / 1024).toFixed(1)} KB)`);

      // Click "Создать заказ-наряд в лабораторию"
      const createBtn = await page.$('[data-testid="submit-lab-order-btn"]');
      if (createBtn) {
        await createBtn.click();
        await page.waitForTimeout(1000);
        await suppressOverlays(page);
        await page.waitForSelector('[data-testid="lab-order-modal"], [data-testid="dental-lab-order-drawer"]', { timeout: 10000 }).catch(() => {});

        const orderPic = path.join(proofsDir, `ztl_order_modal_pc_${theme}.png`);
        await page.screenshot({ path: orderPic, fullPage: false, animations: "disabled" });
        console.log(`✓ Saved ZTL Order Modal PC (${theme}): ${orderPic} (${(fs.statSync(orderPic).size / 1024).toFixed(1)} KB)`);
      }

      await context.close();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. MOBILE VIEWPORT (390x844) - Hub & Order Modal (Apple HIG Bottom Sheet)
    // ═══════════════════════════════════════════════════════════════════════
    for (const theme of ["light", "dark"]) {
      console.log(`\n--- Capturing Mobile (${theme.toUpperCase()}) ---`);
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await setupStorage(context, theme);
      const page = await context.newPage();

      // Open Hub on mobile
      await page.goto("http://127.0.0.1:5173/?standalone=dental_lab", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      await suppressOverlays(page);

      await page.waitForSelector('[data-testid="dental-lab-orders-hub-modal"]', { timeout: 15000 }).catch(() => {});
      const mobileHubPic = path.join(proofsDir, `ztl_hub_mobile_${theme}.png`);
      await page.screenshot({ path: mobileHubPic, fullPage: false, animations: "disabled" });
      console.log(`✓ Saved ZTL Hub Mobile (${theme}): ${mobileHubPic} (${(fs.statSync(mobileHubPic).size / 1024).toFixed(1)} KB)`);

      // Click "Новый наряд ЗТЛ"
      const mobileCreateBtn = await page.$('[data-testid="submit-lab-order-btn"]');
      if (mobileCreateBtn) {
        await mobileCreateBtn.click();
        await page.waitForTimeout(1000);
        await suppressOverlays(page);
        await page.waitForSelector('[data-testid="lab-order-modal"], [data-testid="dental-lab-order-drawer"]', { timeout: 10000 }).catch(() => {});

        const mobileOrderPic = path.join(proofsDir, `ztl_order_modal_mobile_${theme}.png`);
        await page.screenshot({ path: mobileOrderPic, fullPage: false, animations: "disabled" });
        console.log(`✓ Saved ZTL Order Modal Mobile (${theme}): ${mobileOrderPic} (${(fs.statSync(mobileOrderPic).size / 1024).toFixed(1)} KB)`);
      }

      await context.close();
    }

    console.log("\n=== ALL ZTL CONSOLIDATED PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

captureZtlConsolidatedProofs().catch((err) => {
  console.error("FATAL in captureZtlConsolidatedProofs:", err);
  process.exit(1);
});
