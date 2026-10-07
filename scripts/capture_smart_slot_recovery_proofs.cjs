const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function capture() {
  const outDir = path.resolve(__dirname, "../docs/screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("1. Launching Chromium (1440x900)...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. PC LIGHT CAPTURE
    console.log("2. Capturing PC Light (1440x900)...");
    const lightContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const lightPage = await lightContext.newPage();

    await lightPage.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-token");
      localStorage.setItem("dente_staff_token", "demo-token");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_active_role", "owner");
      document.documentElement.setAttribute("data-theme", "light");
    });

    console.log("Navigating with commit...");
    await lightPage.goto("http://127.0.0.1:5173/?smart_slot=demo", {
      waitUntil: "commit",
      timeout: 30000,
    });
    console.log("Waiting 2500ms for React hydration...");
    await lightPage.waitForTimeout(2500);

    console.log("Waiting for popover selector...");
    await lightPage.waitForSelector('[data-testid="smart-slot-recovery-popover"]', {
      timeout: 20000,
    });
    await lightPage.waitForTimeout(500);

    const lightPath = path.join(outDir, "smart_slot_recovery_pc_light.png");
    await lightPage.screenshot({ path: lightPath, fullPage: false });
    console.log(`✓ Saved PC Light screenshot: ${lightPath}`);
    await lightContext.close();

    // 2. PC DARK CAPTURE
    console.log("3. Capturing PC Dark (1440x900)...");
    const darkContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    const darkPage = await darkContext.newPage();

    await darkPage.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-token");
      localStorage.setItem("dente_staff_token", "demo-token");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_role", "owner");
      document.documentElement.setAttribute("data-theme", "dark");
    });

    console.log("Navigating dark with commit...");
    await darkPage.goto("http://127.0.0.1:5173/?smart_slot=demo", {
      waitUntil: "commit",
      timeout: 30000,
    });
    console.log("Waiting 2500ms for React hydration...");
    await darkPage.waitForTimeout(2500);

    console.log("Waiting for popover selector in dark mode...");
    await darkPage.waitForSelector('[data-testid="smart-slot-recovery-popover"]', {
      timeout: 20000,
    });
    await darkPage.waitForTimeout(500);

    const darkPath = path.join(outDir, "smart_slot_recovery_pc_dark.png");
    await darkPage.screenshot({ path: darkPath, fullPage: false });
    console.log(`✓ Saved PC Dark screenshot: ${darkPath}`);
    await darkContext.close();

    console.log("\n[SUCCESS] Both screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
