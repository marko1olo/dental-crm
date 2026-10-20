import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const proofDir = path.resolve(process.cwd(), "docs/proofs/finance");
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }

  console.log("Launching Edge Playwright (channel: 'msedge')...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const baseUrl = "http://127.0.0.1:5173/?fast_checkout=1";

  // 1. PC Light (1440x900)
  {
    console.log("Capturing PC Light (1440x900)...");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    await context.addInitScript(() => {
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.fast-checkout-modal-container', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await page.waitForTimeout(1000);

    const pcLightPath = path.join(proofDir, "pc_light_fast_checkout.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // Also capture Cash Register Tender panel in PC Light
    console.log("Capturing PC Light Cash Register (1440x900)...");
    const cashBtn = page.locator('[data-testid="simple-cash-btn"]');
    if (await cashBtn.count() > 0) {
      await cashBtn.click();
      await page.waitForSelector('[data-testid="cash-tender-panel"]', { timeout: 5000 });
      await page.waitForTimeout(500);
    }
    const pcLightCashPath = path.join(proofDir, "pc_light_cash_register.png");
    await page.screenshot({ path: pcLightCashPath, fullPage: false });
    console.log(`Saved: ${pcLightCashPath} (${fs.statSync(pcLightCashPath).size} bytes)`);

    await context.close();
  }

  // 2. PC Dark (1440x900)
  {
    console.log("Capturing PC Dark (1440x900)...");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    await context.addInitScript(() => {
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.fast-checkout-modal-container', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(1000);

    const pcDarkPath = path.join(proofDir, "pc_dark_fast_checkout.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);
    await context.close();
  }

  // 3. Mobile Light (390x844)
  {
    console.log("Capturing Mobile Light (390x844)...");
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
    });
    await context.addInitScript(() => {
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.fast-checkout-modal-container', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await page.waitForTimeout(1000);

    const mobileLightPath = path.join(proofDir, "mobile_light_fast_checkout.png");
    await page.screenshot({ path: mobileLightPath, fullPage: false });
    console.log(`Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);
    await context.close();
  }

  // 4. Mobile Dark (390x844)
  {
    console.log("Capturing Mobile Dark (390x844)...");
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
    });
    await context.addInitScript(() => {
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.fast-checkout-modal-container', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(1000);

    const mobileDarkPath = path.join(proofDir, "mobile_dark_fast_checkout.png");
    await page.screenshot({ path: mobileDarkPath, fullPage: false });
    console.log(`Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);
    await context.close();
  }

  await browser.close();
  console.log("All 4 live checkout proofs captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
