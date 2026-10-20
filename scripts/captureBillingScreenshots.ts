import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const screenshotDir = path.resolve(process.cwd(), "screenshots");
  const docsScreenshotDir = path.resolve(process.cwd(), "docs", "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(docsScreenshotDir)) {
    fs.mkdirSync(docsScreenshotDir, { recursive: true });
  }

  const saveBoth = (fileName: string, buffer: Buffer) => {
    const p1 = path.join(screenshotDir, fileName);
    const p2 = path.join(docsScreenshotDir, fileName);
    fs.writeFileSync(p1, buffer);
    fs.writeFileSync(p2, buffer);
    console.log(`Saved: ${fileName} (${buffer.length} bytes)`);
  };

  console.log("Launching Edge Playwright (channel: 'msedge')...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  // 1. PC Light (1440x900) - Cash, SBP, Split
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
    await page.goto("http://127.0.0.1:5173/?sbp=1", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await page.waitForTimeout(600);

    // Save PC Light SBP
    saveBoth("pc_light_sbp_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Cash mode
    await page.click('[data-testid="tab-method-cash"]');
    await page.waitForTimeout(600);
    saveBoth("pc_light_cash_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Split mode
    await page.click('[data-testid="tab-method-split"]');
    await page.waitForTimeout(600);
    saveBoth("pc_light_split_payment.png", await page.screenshot({ fullPage: false }));

    await context.close();
  }

  // 2. PC Dark (1440x900) - Cash, SBP, Split
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
    await page.goto("http://127.0.0.1:5173/?sbp=1", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(600);

    // Save PC Dark SBP
    saveBoth("pc_dark_sbp_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Cash mode
    await page.click('[data-testid="tab-method-cash"]');
    await page.waitForTimeout(600);
    saveBoth("pc_dark_cash_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Split mode
    await page.click('[data-testid="tab-method-split"]');
    await page.waitForTimeout(600);
    saveBoth("pc_dark_split_payment.png", await page.screenshot({ fullPage: false }));

    await context.close();
  }

  // 3. Mobile Light (390x844) - Cash, SBP, Split
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
    await page.goto("http://127.0.0.1:5173/?sbp=1", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await page.waitForTimeout(600);

    // Save Mobile Light SBP
    saveBoth("mobile_light_sbp_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Cash mode
    await page.click('[data-testid="tab-method-cash"]');
    await page.waitForTimeout(600);
    saveBoth("mobile_light_cash_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Split mode
    await page.click('[data-testid="tab-method-split"]');
    await page.waitForTimeout(600);
    saveBoth("mobile_light_split_payment.png", await page.screenshot({ fullPage: false }));

    await context.close();
  }

  // 4. Mobile Dark (390x844) - Cash, SBP, Split
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
    await page.goto("http://127.0.0.1:5173/?sbp=1", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(600);

    // Save Mobile Dark SBP
    saveBoth("mobile_dark_sbp_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Cash mode
    await page.click('[data-testid="tab-method-cash"]');
    await page.waitForTimeout(600);
    saveBoth("mobile_dark_cash_payment.png", await page.screenshot({ fullPage: false }));

    // Switch to Split mode
    await page.click('[data-testid="tab-method-split"]');
    await page.waitForTimeout(600);
    saveBoth("mobile_dark_split_payment.png", await page.screenshot({ fullPage: false }));

    await context.close();
  }

  await browser.close();
  console.log("All 12 billing screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
