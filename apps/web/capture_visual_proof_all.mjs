import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const outDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c02d32cf-96d4-45f7-878a-2939cc087f31";
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const configs = [
  { name: "pc-light", width: 1440, height: 900, isMobile: false, theme: "light" },
  { name: "pc-dark", width: 1440, height: 900, isMobile: false, theme: "dark" },
  { name: "mobile-light", width: 390, height: 844, isMobile: true, theme: "light" },
  { name: "mobile-dark", width: 390, height: 844, isMobile: true, theme: "dark" },
];

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  for (const cfg of configs) {
    console.log(`=== Processing configuration: ${cfg.name} ===`);
    const context = await browser.newContext({
      viewport: { width: cfg.width, height: cfg.height },
      isMobile: cfg.isMobile,
      hasTouch: cfg.isMobile,
    });

    const page = await context.newPage();

    await page.addInitScript((theme) => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_theme", theme);
        localStorage.setItem("dente_staff_role", "owner");
        localStorage.setItem("dente_active_workspace_role", "owner");
        sessionStorage.setItem("dente_demo_showcase", "true");
      } catch {}
    }, cfg.theme);

    // 1. Capture Cashbox 54-FZ
    console.log(`Navigating to cashbox (${cfg.name})...`);
    await page.goto("http://127.0.0.1:5173/?cashbox=1", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.evaluate((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
    }, cfg.theme);
    await page.waitForTimeout(2500);

    const cashboxPath = path.join(outDir, `${cfg.name}.png`);
    await page.screenshot({ path: cashboxPath, fullPage: false });
    console.log(`Saved: ${cashboxPath}`);

    // 2. Capture Doctor Payroll T-51 Net Revenue
    console.log(`Navigating to payroll (${cfg.name})...`);
    await page.goto("http://127.0.0.1:5173/?payroll=1", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.evaluate((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
    }, cfg.theme);
    await page.waitForTimeout(2500);

    const payrollPath = path.join(outDir, `${cfg.name}-payroll.png`);
    await page.screenshot({ path: payrollPath, fullPage: false });
    console.log(`Saved: ${payrollPath}`);

    await context.close();
  }

  await browser.close();
  console.log("All 4-state visual proofs captured successfully!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
