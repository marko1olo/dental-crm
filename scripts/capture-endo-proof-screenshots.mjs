/**
 * scripts/capture-endo-proof-screenshots.mjs
 *
 * Captures 4-State Red Team Visual Proof for Endodontics:
 * QuickBar 1-Click Chairside Protocol & Full Modal Protocol:
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 * Output directory: docs/proofs/endo/
 */

import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, "../docs/proofs/endo");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const saveAndVerifyShot = async (page, filename) => {
  const filePath = path.join(outDir, filename);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  const stat = fs.statSync(filePath);
  if (stat.size < 20480) {
    throw new Error(`[BYTE-GUARD FAILED]: ${filename} is only ${stat.size} bytes (<20KB)`);
  }
  console.log(`[PROOF VERIFIED]: ${filename} (${stat.size} bytes)`);
};

async function main() {
  console.log("=== Launching Playwright for Endodontics 4-State Proofs ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const states = [
    // 1-Click Chairside QuickBar Protocol
    { name: "endo_protocol_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false, isModal: false },
    { name: "endo_protocol_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false, isModal: false },
    { name: "endo_protocol_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true, isModal: false },
    { name: "endo_protocol_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true, isModal: false },

    // Full Modal Protocol
    { name: "endo_modal_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false, isModal: true },
    { name: "endo_modal_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false, isModal: true },
    { name: "endo_modal_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true, isModal: true },
    { name: "endo_modal_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true, isModal: true },
  ];

  try {
    for (const state of states) {
      console.log(`\n[State] Capturing ${state.name} (${state.width}x${state.height}, ${state.theme}, mobile: ${state.isMobile}, modal: ${state.isModal})...`);

      const contextOptions = {
        viewport: { width: state.width, height: state.height },
      };
      if (state.isMobile) {
        Object.assign(contextOptions, devices["iPhone 13"]);
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      const url = `http://127.0.0.1:5173/endo-preview.html?theme=${state.theme}${state.isModal ? "&modal=true" : ""}`;
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      if (state.isModal) {
        await page.waitForSelector('[data-testid="endo-canal-log-modal"]', { timeout: 15000 });
      } else {
        await page.waitForSelector('[data-testid="chairside-endo-quickbar"]', { timeout: 15000 });
      }
      await sleep(500);

      await saveAndVerifyShot(page, state.name);
      await context.close();
    }

    console.log("\n=======================================================");
    console.log(">>> ALL ENDO SCREENSHOTS SUCCESSFULLY CAPTURED! <<<");
    console.log("=======================================================\n");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR capturing endo proof:", err);
  process.exit(1);
});
