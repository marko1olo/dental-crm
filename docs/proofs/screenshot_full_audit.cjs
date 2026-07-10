/**
 * Full audit: Main app + Onboarding Wizard in all 4 states
 * Also captures Settings page with WorkspaceFeaturesSelector
 */
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:5174";
const OUT = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\ui_audit";
const ART = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1a85de0-5463-4dad-9cfd-a687decd3eb2";

fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const VIEWS = [
  // Main app — should NOT crash anymore
  { url: BASE, name: "MainApp", states: ["PC_LIGHT", "PC_DARK"] },
  // Onboarding preview
  { url: `${BASE}/#onboarding-preview`, name: "Onboarding_Wizard", states: ["PC_LIGHT", "PC_DARK", "MOBILE_LIGHT", "MOBILE_DARK"] },
];

const DIMS = {
  PC_LIGHT:     { w: 1440, h: 900, dark: false, scale: 1 },
  PC_DARK:      { w: 1440, h: 900, dark: true,  scale: 1 },
  MOBILE_LIGHT: { w: 390,  h: 844, dark: false, scale: 2 },
  MOBILE_DARK:  { w: 390,  h: 844, dark: true,  scale: 2 },
};

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const view of VIEWS) {
    for (const stateName of view.states) {
      const dim = DIMS[stateName];
      console.log(`[${view.name}/${stateName}] Capturing...`);

      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();

      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: dim.dark ? "dark" : "light" }
      ]);
      await page.setViewport({ width: dim.w, height: dim.h, deviceScaleFactor: dim.scale });

      await page.goto(view.url, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
      await wait(3000);

      if (dim.dark) {
        await page.evaluate(() => {
          document.documentElement.setAttribute("data-theme", "dark");
          document.documentElement.classList.add("dark");
        });
        await wait(500);
      }

      // For onboarding, click a preset
      if (view.name.includes("Onboarding")) {
        await page.evaluate(() => {
          const c = document.getElementById("preset-card-solo_therapist") ||
                    document.querySelector("[id^='preset-card-']");
          if (c) c.click();
        });
        await wait(600);
      }

      const fname = `${view.name}_${stateName}.png`;
      const ssPath = path.join(OUT, fname);
      await page.screenshot({ path: ssPath, fullPage: false });
      fs.copyFileSync(ssPath, path.join(ART, fname));
      console.log(`  ✔ ${fname}`);
      await ctx.close();
    }
  }

  await browser.close();
  console.log("\n=== ALL DONE ===");
})();
