const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/audit_radiology_cbct");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function captureScreen(page, filename) {
  const filePath = path.join(targetDir, filename);
  await page.screenshot({ path: filePath, timeout: 30000 });
  console.log(`[CAPTURED] Saved: ${filePath}`);
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
  await page.waitForTimeout(500);
}

async function run() {
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
    // 1. PC CONTEXT (1440x900)
    console.log("=== Launching PC Context (1440x900) ===");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await pcContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const pcPage = await pcContext.newPage();
    pcPage.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warn") {
        console.log(`[PC CONSOLE ${msg.type()}]:`, msg.text());
      }
    });
    pcPage.on("pageerror", (err) => console.log(`[PC PAGE ERROR]:`, err.message));

    console.log("Navigating PC to http://127.0.0.1:5173/?cbct=demo...");
    await pcPage.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("Waiting for cbct-studio-modal to mount...");
    let modal = await pcPage.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 45000 }).catch(() => null);
    if (!modal) {
      console.log("Dispatching fallback event dente:open-cbct-demo...");
      await pcPage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-cbct-demo")));
      modal = await pcPage.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 45000 }).catch(() => null);
    }

    if (!modal) {
      const bodySnippet = await pcPage.evaluate(() => document.body.innerText.slice(0, 300));
      console.error("Modal not found! Body snippet:", bodySnippet);
    } else {
      console.log("Modal found!");
    }

    // Check if demo volume load button exists
    const demoBtn = await pcPage.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 5000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking load demo volume button...");
      await demoBtn.click();
    }

    console.log("Waiting for volume slices decode...");
    await pcPage.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await pcPage.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await pcPage.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 45000 }).catch(() => {});
    await pcPage.waitForTimeout(4000);

    // PC Light
    console.log("Setting PC Light theme...");
    await setupTheme(pcPage, "light");
    await captureScreen(pcPage, "pc_light_1440x900.png");

    // PC Dark
    console.log("Setting PC Dark theme...");
    await setupTheme(pcPage, "dark");
    await captureScreen(pcPage, "pc_dark_1440x900.png");

    await pcContext.close();

    // 2. MOBILE CONTEXT (390x844)
    console.log("\n=== Launching Mobile Context (390x844) ===");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const mobilePage = await mobileContext.newPage();
    mobilePage.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warn") {
        console.log(`[MOBILE CONSOLE ${msg.type()}]:`, msg.text());
      }
    });
    mobilePage.on("pageerror", (err) => console.log(`[MOBILE PAGE ERROR]:`, err.message));

    console.log("Navigating Mobile to http://127.0.0.1:5173/?cbct=demo...");
    await mobilePage.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });

    modal = await mobilePage.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 45000 }).catch(() => null);
    if (!modal) {
      console.log("Dispatching fallback event dente:open-cbct-demo on mobile...");
      await mobilePage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-cbct-demo")));
      modal = await mobilePage.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 45000 }).catch(() => null);
    }

    const mobileDemoBtn = await mobilePage.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 5000 }).catch(() => null);
    if (mobileDemoBtn) {
      console.log("Clicking mobile load demo volume button...");
      await mobileDemoBtn.click();
    }

    console.log("Waiting for mobile volume slices decode...");
    await mobilePage.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await mobilePage.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await mobilePage.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 45000 }).catch(() => {});
    await mobilePage.waitForTimeout(4000);

    // Mobile Light
    console.log("Setting Mobile Light theme...");
    await setupTheme(mobilePage, "light");
    await captureScreen(mobilePage, "mobile_light_390x844.png");

    // Mobile Dark
    console.log("Setting Mobile Dark theme...");
    await setupTheme(mobilePage, "dark");
    await captureScreen(mobilePage, "mobile_dark_390x844.png");

    await mobileContext.close();
    console.log("\n=== All 4 proofs successfully captured! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
