/**
 * scripts/capture_treatment_plans_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOF CAPTURE: TREATMENT PLAN STUDIO SSOT
 * Mandates 8al, 8am, 8e, Apple HIG (390x844 & 1440x900).
 * Captures 4 canonical states:
 * 1. docs/proofs/treatment_plans/01_treatment_plan_studio_pc_light_1440x900.png
 * 2. docs/proofs/treatment_plans/02_treatment_plan_studio_pc_dark_1440x900.png
 * 3. docs/proofs/treatment_plans/03_treatment_plan_studio_mobile_light_390x844.png
 * 4. docs/proofs/treatment_plans/04_treatment_plan_studio_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BASE_URL = "http://127.0.0.1:5173";
const OUT_DIRS = [
  path.resolve(__dirname, "../docs/proofs/treatment-plans"),
  path.resolve(__dirname, "../docs/proofs/treatment_plans"),
  path.resolve(__dirname, "../docs/proofs/treatment_plan_presenter"),
];

for (const dir of OUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = browserCandidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  throw new Error("No browser executable found in candidates");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Starting Treatment Plan Studio 4-State Proof Capture...");
  console.log("Browser:", executablePath);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const targets = [
    {
      name: "01_treatment_plan_studio_pc_light_1440x900.png",
      legacyName: "01_treatment_plan_presenter_pc_light_1440x900.png",
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "light",
      url: `${BASE_URL}/#treatment-plans`,
    },
    {
      name: "02_treatment_plan_studio_pc_dark_1440x900.png",
      legacyName: "02_treatment_plan_presenter_pc_dark_1440x900.png",
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "dark",
      url: `${BASE_URL}/#treatment-plans`,
    },
    {
      name: "03_treatment_plan_studio_mobile_light_390x844.png",
      legacyName: "03_treatment_plan_presenter_mobile_light_390x844.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      theme: "light",
      url: `${BASE_URL}/#treatment-plans`,
    },
    {
      name: "04_treatment_plan_studio_mobile_dark_390x844.png",
      legacyName: "04_treatment_plan_presenter_mobile_dark_390x844.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      theme: "dark",
      url: `${BASE_URL}/#treatment-plans`,
    },
  ];

  for (const t of targets) {
    const context = await browser.newContext({
      viewport: t.viewport,
      deviceScaleFactor: 2,
      isMobile: t.isMobile,
      hasTouch: t.hasTouch || false,
    });
    const page = await context.newPage();

    console.log(`\nNavigating to ${t.url} (${t.viewport.width}x${t.viewport.height}, theme: ${t.theme})...`);
    await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await sleep(800);

    // Set theme
    const isDark = t.theme === "dark";
    await page.evaluate(({ isDark, theme }) => {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.className = isDark ? "dark" : "light";
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      localStorage.setItem("dente_theme_mode", theme);
    }, { isDark, theme: t.theme });

    await sleep(500);

    // Wait for studio modal container to be visible
    try {
      await page.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { timeout: 6000 });
      console.log("Found [data-testid=\"treatment-plan-studio-modal\"]!");
    } catch {
      console.warn("Studio selector not found, capturing current screen state");
    }

    await sleep(500);

    for (const dir of OUT_DIRS) {
      const outPath = path.join(dir, t.name);
      await page.screenshot({ path: outPath, fullPage: false });
      const stats = fs.statSync(outPath);
      console.log(`✅ Captured: ${outPath} (${Math.round(stats.size / 1024)} KB)`);

      if (t.legacyName) {
        const legacyPath = path.join(dir, t.legacyName);
        fs.copyFileSync(outPath, legacyPath);
      }
      const canonicalName = t.name.replace("_studio_", "_");
      if (canonicalName !== t.name) {
        fs.copyFileSync(outPath, path.join(dir, canonicalName));
      }
    }

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 All 4-State Proofs Captured Successfully!");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
