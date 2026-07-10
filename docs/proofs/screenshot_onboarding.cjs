/**
 * Onboarding Wizard 4-state visual audit — FIXED dark mode via emulateMediaFeatures
 */
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:5174/#onboarding-preview";
const OUTPUT_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\ui_audit";
const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1a85de0-5463-4dad-9cfd-a687decd3eb2";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const STATES = [
  { name: "PC_LIGHT",    w: 1440, h: 900,  dark: false },
  { name: "PC_DARK",     w: 1440, h: 900,  dark: true  },
  { name: "MOBILE_LIGHT",w: 390,  h: 844,  dark: false },
  { name: "MOBILE_DARK", w: 390,  h: 844,  dark: true  },
];

const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--force-dark-mode"],
  });

  console.log("=== ONBOARDING WIZARD 4-STATE AUDIT ===\n");

  for (const state of STATES) {
    console.log(`[${state.name}] Capturing...`);
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();

    // Apply dark color scheme BEFORE page load
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: state.dark ? "dark" : "light" }
    ]);

    await page.setViewport({
      width: state.w,
      height: state.h,
      deviceScaleFactor: state.name.startsWith("MOBILE") ? 2 : 1
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await wait(2500);

    // For dark, also set data-theme + CSS body bg as fallback
    if (state.dark) {
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await wait(300);
    }

    // Click first preset card
    await page.evaluate(() => {
      const card = document.getElementById("preset-card-solo_therapist") ||
                   document.querySelector("[id^='preset-card-']");
      if (card) card.click();
    });
    await wait(500);

    const ssPath = path.join(OUTPUT_DIR, `Onboarding_Wizard_${state.name}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    fs.copyFileSync(ssPath, path.join(ARTIFACT_DIR, `Onboarding_Wizard_${state.name}.png`));
    console.log(`[${state.name}] ✔ saved`);
    await ctx.close();
  }

  await browser.close();
  console.log("\n=== DONE ===");
})();
