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
  console.log("=== Launching Chromium for Standardized Radiology Proofs ===");
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

    // Click "Рентген-кабинет"
    console.log("Opening RadiologyModule modal...");
    const radBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"], text=Рентген-кабинет', { timeout: 10000 }).catch(() => null);
    if (radBtn) {
      await radBtn.click();
      console.log("Clicked Рентген-кабинет button!");
    } else {
      console.log("Рентген-кабинет button not found directly, looking for alternative button...");
      const layersBtn = await page.waitForSelector('button:has(svg.lucide-layers)', { timeout: 5000 }).catch(() => null);
      if (layersBtn) await layersBtn.click();
    }

    // Wait for radiology archive container
    console.log("Waiting for radiology-archive-container...");
    await page.waitForSelector('[data-testid="radiology-archive-container"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 1. Capture Radiology Archive Light
    console.log("Capturing Radiology Archive (PC Light)...");
    await setupTheme(page, "light");
    await captureScreen(page, "radiology_archive_pc_light.png");

    // 2. Capture Radiology Archive Dark
    console.log("Capturing Radiology Archive (PC Dark)...");
    await setupTheme(page, "dark");
    await captureScreen(page, "radiology_archive_pc_dark.png");

    // 3. Open StudyPatientBindControlModal via exact row button
    console.log("Opening StudyPatientBindControlModal via row control button...");
    const controlBtn = await page.waitForSelector('[data-testid^="btn-control-binding-"]', { timeout: 10000 }).catch(() => null);
    if (controlBtn) {
      await controlBtn.click();
      await page.waitForSelector('[data-testid="study-bind-control-modal"]', { timeout: 10000 });
      await page.waitForTimeout(800);

      console.log("Capturing StudyPatientBindControlModal (PC Dark)...");
      await setupTheme(page, "dark");
      await captureScreen(page, "study_patient_bind_control_modal_pc_dark.png");

      console.log("Capturing StudyPatientBindControlModal (PC Light)...");
      await setupTheme(page, "light");
      await captureScreen(page, "study_patient_bind_control_modal_pc_light.png");

      // Close modal
      const cancelBindBtn = await page.waitForSelector('button:has-text("Отмена")', { timeout: 5000 }).catch(() => null);
      if (cancelBindBtn) await cancelBindBtn.click();
      await page.waitForTimeout(600);
    }

    // 4. Open Referral Modal from Archive
    console.log("Opening Referral Modal...");
    const refBtn = await page.waitForSelector('button:has-text("Направление")', { timeout: 10000 }).catch(() => null);
    if (refBtn) {
      await refBtn.click();
      await page.waitForSelector('[data-testid="referral-tab-bar"]', { timeout: 10000 });
      await page.waitForTimeout(800);

      // Capture Referral Modal Light
      console.log("Capturing Referral Modal (PC Light)...");
      await setupTheme(page, "light");
      await captureScreen(page, "radiology_referral_modal_pc_light.png");

      // Capture Referral Modal Dark
      console.log("Capturing Referral Modal (PC Dark)...");
      await setupTheme(page, "dark");
      await captureScreen(page, "radiology_referral_modal_pc_dark.png");

      // Close Referral Modal
      const closeRef = await page.waitForSelector('button:has-text("Отмена")', { timeout: 5000 }).catch(() => null);
      if (closeRef) await closeRef.click();
      await page.waitForTimeout(600);
    }

    // 5. Close RadiologyModule modal and open DICOM Import Manager modal
    console.log("Closing Radiology Module modal...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    // Open DICOM Import Manager Modal from КТ Томограф button
    console.log("Opening DICOM Import Manager Modal...");
    const dicomBadge = await page.waitForSelector('button:has-text("КТ Томограф")', { timeout: 10000 }).catch(() => null);
    if (dicomBadge) {
      await dicomBadge.click();
      await page.waitForSelector('[data-testid="dicom-tab-bar"]', { timeout: 10000 });
      await page.waitForTimeout(800);

      // Capture DICOM Import Manager Light
      console.log("Capturing DICOM Import Manager (PC Light)...");
      await setupTheme(page, "light");
      await captureScreen(page, "dicom_import_manager_pc_light.png");

      // Capture DICOM Import Manager Dark
      console.log("Capturing DICOM Import Manager (PC Dark)...");
      await setupTheme(page, "dark");
      await captureScreen(page, "dicom_import_manager_pc_dark.png");

      // Close DICOM Import Modal
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
    }

    // 5. Navigate to CBCT Demo to capture DicomToolboxRibbon & Studio
    console.log("Navigating to http://127.0.0.1:5173/?demo=true&cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?demo=true&cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });
    let cbctModal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 30000 }).catch(() => null);
    if (!cbctModal) {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-cbct-demo")));
      cbctModal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 30000 }).catch(() => null);
    }

    if (cbctModal) {
      const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 5000 }).catch(() => null);
      if (demoBtn) {
        await demoBtn.click();
      }
      await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);

      console.log("Capturing CBCT Studio & Dicom Ribbon (PC Dark)...");
      await setupTheme(page, "dark");
      await captureScreen(page, "cbct_studio_ribbon_pc_dark.png");

      console.log("Capturing CBCT Studio & Dicom Ribbon (PC Light)...");
      await setupTheme(page, "light");
      await captureScreen(page, "cbct_studio_ribbon_pc_light.png");
    }

    console.log("=== ALL RADIOLOGY PROOFS CAPTURED SUCCESSFULLY ===");
    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE SCRIPT:", err);
  process.exit(1);
});
