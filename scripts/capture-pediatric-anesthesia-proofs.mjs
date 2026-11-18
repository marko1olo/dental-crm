import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pedOutDir = path.resolve(__dirname, "../docs/proofs/pediatric");
const anesthOutDir = path.resolve(__dirname, "../docs/proofs/anesthesia");
fs.mkdirSync(pedOutDir, { recursive: true });
fs.mkdirSync(anesthOutDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveProof(page, outPath) {
  await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
  const stat = fs.statSync(outPath);
  if (stat.size < 20480) {
    throw new Error(`[BYTE-GUARD FAILED]: ${outPath} is only ${stat.size} bytes (<20KB)`);
  }
  console.log(`[PROOF VERIFIED]: ${path.basename(outPath)} (${stat.size} bytes)`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. PEDIATRIC 4-STATE PROOFS
    console.log("=== Capturing Pediatric Studio 4-State Proofs ===");
    const pedStates = [
      { name: "pediatric_studio_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
      { name: "pediatric_studio_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
      { name: "pediatric_studio_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
      { name: "pediatric_studio_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
    ];

    for (const state of pedStates) {
      const contextOptions = { viewport: { width: state.width, height: state.height } };
      if (state.isMobile) Object.assign(contextOptions, devices["iPhone 13"]);
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      await page.goto(`http://127.0.0.1:5173/pediatric-preview.html?theme=${state.theme}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector('[data-testid="pediatric-studio-modal"]', { timeout: 15000 });
      await sleep(600);
      await saveProof(page, path.join(pedOutDir, state.name));
      await context.close();
    }

    // 2. ANESTHESIA QUICKBAR 4-STATE PROOFS
    console.log("=== Capturing Anesthesia QuickBar 4-State Proofs ===");
    const anesthStates = [
      { name: "anesthesia_quickbar_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
      { name: "anesthesia_quickbar_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
      { name: "anesthesia_quickbar_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
      { name: "anesthesia_quickbar_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
    ];

    for (const state of anesthStates) {
      const contextOptions = { viewport: { width: state.width, height: state.height } };
      if (state.isMobile) Object.assign(contextOptions, devices["iPhone 13"]);
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      await page.goto(`http://127.0.0.1:5173/anesthesia-preview.html?theme=${state.theme}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector('[data-testid="anesthesia-quick-bar"]', { timeout: 15000 });
      await sleep(600);
      await saveProof(page, path.join(anesthOutDir, state.name));
      await context.close();
    }

    console.log("=== ALL PEDIATRIC & ANESTHESIA SCREENSHOTS SUCCESSFULLY CAPTURED! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR capturing proofs:", err);
  process.exit(1);
});
