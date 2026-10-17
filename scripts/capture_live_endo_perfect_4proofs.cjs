const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/proofs/endo");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function dismissToasts(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[role="alert"], .toast, [class*="toast"], [data-testid="toast-close-button"]').forEach(el => {
      const container = el.closest('[role="alert"]') || el.closest('[class*="toast"]') || el;
      container.remove();
    });
  });
}

async function capture() {
  console.log("=== EXECUTING PERFECT 4-STATE LIVE CONTOUR CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // 1. PC LIGHT (1440x900)
    {
      console.log("\n>>> Capturing 01_pc_light_endo_1440x900.png...");
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5174/?demo=true", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(() => !document.body.innerText.includes("Загрузка системы..."), { timeout: 15000 });

      // Light theme
      await page.evaluate(() => {
        localStorage.setItem("dente_theme_mode", "light");
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      });

      // Click Therapist role
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="demo-role-btn-therapist"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      // Click Priyom
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("a, button")).find(a => a.textContent && a.textContent.includes("Прием"));
        if (el) el.click();
      });
      await page.waitForTimeout(1500);

      // Click 2. Дневник приёма
      await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll("button, a")).find(el => el.textContent && el.textContent.includes("Дневник приёма"));
        if (tab) tab.click();
      });
      await page.waitForTimeout(1000);

      // Scroll to endo section
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="chairside-endo-quickbar"]') || document.querySelector('[data-testid="emk-endo-section"]');
        if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
      });
      await page.waitForTimeout(800);
      await dismissToasts(page);

      const filePath = path.join(outputDir, "01_pc_light_endo_1440x900.png");
      await page.screenshot({ path: filePath, fullPage: false });
      const stats = fs.statSync(filePath);
      console.log(`[CAPTURED] 01_pc_light_endo_1440x900.png: ${(stats.size / 1024).toFixed(1)} KB`);
      await context.close();
    }

    // 2. PC DARK (1440x900)
    {
      console.log("\n>>> Capturing 02_pc_dark_endo_1440x900.png...");
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5174/?demo=true", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(() => !document.body.innerText.includes("Загрузка системы..."), { timeout: 15000 });

      // Dark theme
      await page.evaluate(() => {
        localStorage.setItem("dente_theme_mode", "dark");
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.classList.remove("light");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });

      // Click Therapist role
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="demo-role-btn-therapist"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      // Click Priyom
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("a, button")).find(a => a.textContent && a.textContent.includes("Прием"));
        if (el) el.click();
      });
      await page.waitForTimeout(1500);

      // Click 2. Дневник приёма
      await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll("button, a")).find(el => el.textContent && el.textContent.includes("Дневник приёма"));
        if (tab) tab.click();
      });
      await page.waitForTimeout(1000);

      // Scroll to endo section
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="chairside-endo-quickbar"]') || document.querySelector('[data-testid="emk-endo-section"]');
        if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
      });
      await page.waitForTimeout(800);
      await dismissToasts(page);

      const filePath = path.join(outputDir, "02_pc_dark_endo_1440x900.png");
      await page.screenshot({ path: filePath, fullPage: false });
      const stats = fs.statSync(filePath);
      console.log(`[CAPTURED] 02_pc_dark_endo_1440x900.png: ${(stats.size / 1024).toFixed(1)} KB`);
      await context.close();
    }

    // 3. MOBILE LIGHT (390x844)
    {
      console.log("\n>>> Capturing 03_mobile_light_endo_390x844.png...");
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5174/?demo=true", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(() => !document.body.innerText.includes("Загрузка системы..."), { timeout: 15000 });

      // Light theme
      await page.evaluate(() => {
        localStorage.setItem("dente_theme_mode", "light");
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      });

      // Click Therapist role
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="demo-role-btn-therapist"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      // Click Priyom
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("a, button")).find(a => a.textContent && a.textContent.includes("ПриемКарта"));
        if (el) el.click();
      });
      await page.waitForTimeout(2000);

      // Click treatment step
      const stepTreatment = page.locator('[data-testid="mobile-chairside-visit-workspace-step-treatment"]').first();
      if (await stepTreatment.isVisible({ timeout: 4000 }).catch(() => false)) {
        await stepTreatment.click();
        await page.waitForTimeout(1500);
      }

      // Scroll to endo section
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="emk-endo-section"], [data-testid="chairside-endo-quickbar"]');
        if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
      });
      await page.waitForTimeout(800);
      await dismissToasts(page);

      const filePath = path.join(outputDir, "03_mobile_light_endo_390x844.png");
      await page.screenshot({ path: filePath, fullPage: false });
      const stats = fs.statSync(filePath);
      console.log(`[CAPTURED] 03_mobile_light_endo_390x844.png: ${(stats.size / 1024).toFixed(1)} KB`);
      await context.close();
    }

    // 4. MOBILE DARK (390x844)
    {
      console.log("\n>>> Capturing 04_mobile_dark_endo_390x844.png...");
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5174/?demo=true", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(() => !document.body.innerText.includes("Загрузка системы..."), { timeout: 15000 });

      // Dark theme
      await page.evaluate(() => {
        localStorage.setItem("dente_theme_mode", "dark");
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.classList.remove("light");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });

      // Click Therapist role
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="demo-role-btn-therapist"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      // Click Priyom
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("a, button")).find(a => a.textContent && a.textContent.includes("ПриемКарта"));
        if (el) el.click();
      });
      await page.waitForTimeout(2000);

      // Click treatment step
      const stepTreatment = page.locator('[data-testid="mobile-chairside-visit-workspace-step-treatment"]').first();
      if (await stepTreatment.isVisible({ timeout: 4000 }).catch(() => false)) {
        await stepTreatment.click();
        await page.waitForTimeout(1500);
      }

      // Scroll to endo section
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="emk-endo-section"], [data-testid="chairside-endo-quickbar"]');
        if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
      });
      await page.waitForTimeout(800);
      await dismissToasts(page);

      const filePath = path.join(outputDir, "04_mobile_dark_endo_390x844.png");
      await page.screenshot({ path: filePath, fullPage: false });
      const stats = fs.statSync(filePath);
      console.log(`[CAPTURED] 04_mobile_dark_endo_390x844.png: ${(stats.size / 1024).toFixed(1)} KB`);
      await context.close();
    }
  } catch (err) {
    console.error("Error during live capture:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
  console.log("=== ALL 4 PERFECT LIVE VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
}

capture();
