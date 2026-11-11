/**
 * scripts/capture-ortho-canonical-4proofs.cjs
 *
 * 4-State Red Team Visual Proofs for Orthodontics & Cephalometrics:
 * 1. 01_ortho_studio_pc_light_1440x900.png (and ortho_pc_light_1440x900.png)
 * 2. 02_ortho_studio_pc_dark_1440x900.png (and ortho_pc_dark_1440x900.png)
 * 3. 03_ortho_studio_mobile_light_390x844.png (and ortho_mobile_light_390x844.png)
 * 4. 04_ortho_studio_mobile_dark_390x844.png (and ortho_mobile_dark_390x844.png)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.join(__dirname, "../docs/proofs/orthodontics");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function applyTheme(page, theme) {
  const isDark = theme === "dark";
  await page.evaluate(({ dark, th }) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, { dark: isDark, th: theme });
  await page.waitForTimeout(400);
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
    });
  } catch (_) {}
}

async function captureScreenshot(page, filename, altFilename = null) {
  const filePath = path.join(PROOFS_DIR, filename);
  const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
  fs.writeFileSync(filePath, buffer);
  if (altFilename) {
    fs.writeFileSync(path.join(PROOFS_DIR, altFilename), buffer);
  }
  const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
  console.log(`[SAVED] ${filename} (${sizeKB} KB)`);
  if (sizeKB < 20) {
    throw new Error(`Screenshot ${filename} size is < 20 KB: ${sizeKB} KB`);
  }
  return sizeKB;
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const baseUrl = "http://127.0.0.1:5173";
    const cephUrl = `${baseUrl}/?view=ceph-studio&demo=true`;

    // -------------------------------------------------------------
    // 1. CEPHALOMETRICS TRG 4-STATE CANONICAL PROOFS
    // -------------------------------------------------------------
    console.log("=== 1. CAPTURING CEPHALOMETRICS TRG 4-STATE PROOFS ===");

    // 1.1 PC Dark (1440x900)
    {
      console.log("\n[1/4] Capturing PC Dark (1440x900)...");
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: "dark",
      });
      const page = await ctx.newPage();
      await page.goto(cephUrl, { waitUntil: "commit" });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      await suppressOverlays(page);
      await applyTheme(page, "dark");

      // Click template to place landmarks
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find((b) => b.textContent && b.textContent.includes("Анатомический шаблон"));
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      await captureScreenshot(page, "02_ortho_studio_pc_dark_1440x900.png", "ortho_pc_dark_1440x900.png");
      await ctx.close();
    }

    // 1.2 PC Light (1440x900)
    {
      console.log("\n[2/4] Capturing PC Light (1440x900)...");
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
      });
      const page = await ctx.newPage();
      await page.goto(cephUrl, { waitUntil: "commit" });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      await suppressOverlays(page);
      await applyTheme(page, "light");

      // Click template to place landmarks
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find((b) => b.textContent && b.textContent.includes("Анатомический шаблон"));
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      await captureScreenshot(page, "01_ortho_studio_pc_light_1440x900.png", "ortho_pc_light_1440x900.png");
      await ctx.close();
    }

    // 1.3 Mobile Dark (390x844)
    {
      console.log("\n[3/4] Capturing Mobile Dark (390x844)...");
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: "dark",
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await page.goto(cephUrl, { waitUntil: "commit" });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      await suppressOverlays(page);
      await applyTheme(page, "dark");

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find((b) => b.textContent && b.textContent.includes("Анатомический шаблон"));
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      await captureScreenshot(page, "04_ortho_studio_mobile_dark_390x844.png", "ortho_mobile_dark_390x844.png");
      await ctx.close();
    }

    // 1.4 Mobile Light (390x844)
    {
      console.log("\n[4/4] Capturing Mobile Light (390x844)...");
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: "light",
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await page.goto(cephUrl, { waitUntil: "commit" });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      await suppressOverlays(page);
      await applyTheme(page, "light");

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find((b) => b.textContent && b.textContent.includes("Анатомический шаблон"));
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);

      await captureScreenshot(page, "03_ortho_studio_mobile_light_390x844.png", "ortho_mobile_light_390x844.png");
      await ctx.close();
    }

  } finally {
    await browser.close();
  }

  console.log("\n=======================================================");
  console.log(">>> ALL 4-STATE ORTHODONTICS PROOFS CAPTURED SUCCESSFULLY <<<");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
