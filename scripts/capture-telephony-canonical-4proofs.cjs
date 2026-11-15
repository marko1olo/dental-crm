/**
 * scripts/capture-telephony-canonical-4proofs.cjs
 * Captures clean 4-State Visual Proofs for Telephony & Softphone domain:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

process.env.NO_PROXY = "127.0.0.1,localhost";
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, theme);
  await page.waitForTimeout(400);
}

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`  -> [VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB >= 20KB)`);
  return size;
}

async function main() {
  console.log("=== Launching Playwright for Telephony 4-State Capture ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--no-proxy-server",
      "--proxy-bypass-list=<-loopback>",
    ],
  });

  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:5174/?demo=true#telephony";

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    console.log(`Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });

    console.log("Waiting for telephony studio selector...");
    await page.waitForSelector('[data-testid="telephony-studio-modal-root"], [data-testid="direct-telephony-launcher-root"]', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // -----------------------------------------------------------------
    // 1. DESKTOP (1440x900)
    // -----------------------------------------------------------------
    console.log("\n[1/4] Capturing 01_telephony_pc_light_1440x900.png...");
    await setTheme(page, "light");
    const pcLightPath = path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    verifyProof(pcLightPath);
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_studio_pc_light_1440x900.png"));

    console.log("[2/4] Capturing 02_telephony_pc_dark_1440x900.png...");
    await setTheme(page, "dark");
    const pcDarkPath = path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    verifyProof(pcDarkPath);
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_studio_pc_dark_1440x900.png"));

    // Active Call interaction
    console.log("[Active Call] Clicking call button...");
    const callBtn = page.locator('[data-testid="telephony-call-patient-btn"]').first();
    if (await callBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await callBtn.click();
      await page.waitForTimeout(800);
      const pcCallDarkPath = path.join(OUT_DIR, "02_telephony_call_active_pc_dark_1440x900.png");
      await page.screenshot({ path: pcCallDarkPath, fullPage: false });
      verifyProof(pcCallDarkPath);
    }

    // -----------------------------------------------------------------
    // 2. MOBILE (390x844 Apple HIG)
    // -----------------------------------------------------------------
    console.log("\n--- Switching to Mobile (390x844 Apple HIG) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForSelector('[data-testid="telephony-studio-modal-root"], [data-testid="direct-telephony-launcher-root"]', { timeout: 20000 });
    await page.waitForTimeout(1000);

    console.log("[3/4] Capturing 04_telephony_mobile_dark_390x844.png...");
    await setTheme(page, "dark");
    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png");
    await page.screenshot({ path: mobileDarkPath, fullPage: false });
    verifyProof(mobileDarkPath);
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_studio_mobile_dark_390x844.png"));

    console.log("[4/4] Capturing 03_telephony_mobile_light_390x844.png...");
    await setTheme(page, "light");
    const mobileLightPath = path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png");
    await page.screenshot({ path: mobileLightPath, fullPage: false });
    verifyProof(mobileLightPath);
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_studio_mobile_light_390x844.png"));

    console.log("\n=======================================================");
    console.log("✓ ALL 4-STATE CANONICAL TELEPHONY PROOFS CAPTURED SUCCESSFULLY!");
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL capture error:", err);
  process.exit(1);
});
