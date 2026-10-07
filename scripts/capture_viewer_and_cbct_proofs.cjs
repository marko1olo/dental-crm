const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_standardized");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function captureScreen(page, filename) {
  const filePath = path.join(targetDir, filename);
  await page.screenshot({ path: filePath, timeout: 30000 });
  const stats = fs.statSync(filePath);
  console.log(`[CAPTURED] Saved: ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function setupTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    }
  }, theme);
  await page.waitForTimeout(600);
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
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
}

async function run() {
  console.log("=== Launching Chromium for DICOM Viewer Ribbon & CBCT Studio Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem(
        "dente_quest_tour_progress_v1",
        JSON.stringify({
          isDismissedPermanently: true,
          isTourActive: false,
          activeTrackId: "solo_doctor",
          currentStepIndex: 999,
          completedStepIds: ["step-1", "step-2", "step-3"],
        })
      );
    });

    const page = await context.newPage();

    console.log("1. Navigating to http://127.0.0.1:5173/?demo=true#imaging...");
    await page.goto("http://127.0.0.1:5173/?demo=true#imaging", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    await suppressOverlays(page);

    // Click 'Снимки' in sidebar if needed
    const снимкиTab = await page.waitForSelector('text=Снимки', { timeout: 5000 }).catch(() => null);
    if (снимкиTab) {
      console.log("Clicking 'Снимки' sidebar item...");
      await снимкиTab.click();
      await page.waitForTimeout(1500);
      await suppressOverlays(page);
    }

    const radBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"], text=Рентген-кабинет', { timeout: 10000 }).catch(() => null);
    if (radBtn) {
      console.log("Clicking Рентген-кабинет...");
      await radBtn.click();
    } else {
      const layersBtn = await page.waitForSelector('button:has(svg.lucide-layers)', { timeout: 5000 }).catch(() => null);
      if (layersBtn) await layersBtn.click();
    }

    console.log("Waiting for radiology-archive-container...");
    await page.waitForSelector('[data-testid="radiology-archive-container"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 1. Capture DICOM Viewer Modal with DicomToolboxRibbon
    console.log("Opening 2D Study Viewer via row button...");
    const viewerBtn = await page.waitForSelector('[data-testid^="btn-open-viewer-"]', { timeout: 10000 }).catch(() => null);
    if (viewerBtn) {
      await viewerBtn.click();
      await page.waitForSelector('[data-testid="dicom-viewer-modal"]', { timeout: 10000 });
      await page.waitForTimeout(1200);

      console.log("Capturing DICOM Viewer & Ribbon (PC Dark)...");
      await setupTheme(page, "dark");
      await captureScreen(page, "dicom_viewer_ribbon_pc_dark.png");

      console.log("Capturing DICOM Viewer & Ribbon (PC Light)...");
      await setupTheme(page, "light");
      await captureScreen(page, "dicom_viewer_ribbon_pc_light.png");

      // Close viewer modal
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }

    // 2. Capture CBCT Studio via row button
    console.log("Opening 3D CBCT Studio via row button...");
    const studioBtn = await page.waitForSelector('[data-testid^="btn-open-studio-"]', { timeout: 10000 }).catch(() => null);
    if (studioBtn) {
      await studioBtn.click();
      await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });
      await page.waitForTimeout(1000);

      const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 5000 }).catch(() => null);
      if (demoBtn) {
        console.log("Loading demo CBCT volume...");
        await demoBtn.click();
        await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }

      console.log("Capturing CBCT Studio (PC Dark)...");
      await setupTheme(page, "dark");
      await captureScreen(page, "cbct_studio_pc_dark.png");

      console.log("Capturing CBCT Studio (PC Light)...");
      await setupTheme(page, "light");
      await captureScreen(page, "cbct_studio_pc_light.png");

      // Close CBCT modal
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }

    console.log("=== COMPLETED VIEWER AND CBCT CAPTURES ===");
    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE SCRIPT:", err);
  process.exit(1);
});
