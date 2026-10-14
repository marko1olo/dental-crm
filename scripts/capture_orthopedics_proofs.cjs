/**
 * scripts/capture_orthopedics_proofs.cjs
 *
 * Captures 4 canonical screenshots for Red Team Visual Proof:
 * 1. PC Light (1440×900)
 * 2. PC Dark (1440×900)
 * 3. Mobile Light (390×844)
 * 4. Mobile Dark (390×844)
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const OUTPUT_DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/orthopedics"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/orthopedics"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/cb3d0143-96e7-411d-ae3c-ff4169fe9aa5"),
];

for (const dir of OUTPUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function saveProof(page, filename, description) {
  const primaryPath = path.join(OUTPUT_DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = fs.statSync(primaryPath);
  if (stat.size < 25000) {
    throw new Error(`[DEFECT DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

  for (let i = 1; i < OUTPUT_DIRS.length; i++) {
    const targetPath = path.join(OUTPUT_DIRS[i], filename);
    fs.copyFileSync(primaryPath, targetPath);
  }
}

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    const url = "http://127.0.0.1:5173/ortho_warranty_preview.html";

    // 1. PC Light (1440x900)
    console.log("Capturing 1. PC Light (1440x900)...");
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await suppressOverlays(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await sleep(800);
    await saveProof(page, "pc-light.png", "PC Light 1440x900 Chairside Orthopedics & ZTL Presets");

    // 2. PC Dark (1440x900)
    console.log("Capturing 2. PC Dark (1440x900)...");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await sleep(800);
    await saveProof(page, "pc-dark.png", "PC Dark 1440x900 Chairside Orthopedics & ZTL Presets");

    // 3. Mobile Light (390x844)
    console.log("Capturing 3. Mobile Light (390x844)...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await sleep(800);
    await saveProof(page, "mobile-light.png", "Mobile Light 390x844 Apple HIG Grouped Cards & VITA Swatches");

    // 4. Mobile Dark (390x844)
    console.log("Capturing 4. Mobile Dark (390x844)...");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await sleep(800);
    await saveProof(page, "mobile-dark.png", "Mobile Dark 390x844 Apple HIG Grouped Cards & VITA Swatches");

    // 5. Bonus: Passport A4 Modal (PC & Mobile)
    console.log("Capturing 5. Passport A4 Modal...");
    // Open passport modal
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="open-orthopedic-passport-btn"]');
      if (btn) btn.click();
    });
    await sleep(800);
    await saveProof(page, "mobile-passport-bottomsheet.png", "Mobile 390x844 Orthopedic Passport A4 Bottom Sheet");

    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      const btn = document.querySelector('[data-testid="banner-orthopedic-passport-btn"]') || document.querySelector('[data-testid="open-orthopedic-passport-btn"]');
      if (btn && !document.querySelector('[data-testid="orthopedic-passport-modal"]')) {
        btn.click();
      }
    });
    await sleep(800);
    await saveProof(page, "pc-passport-a4-modal.png", "PC 1440x900 Orthopedic Passport A4 & Warranty Sheet");

    console.log("[ALL SCREENSHOTS CAPTURED CLEANLY]");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
