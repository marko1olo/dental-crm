/**
 * Onboarding VLM Audit - Playwright version
 * Takes 4-state screenshots for onboarding steps 1-7
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5173";
const OUT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21";

const VIEWPORTS = [
  { name: "PC",     width: 1440, height: 900 },
  { name: "Mobile", width: 375,  height: 812 },
];
const THEMES = ["Dark", "Light"];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === "Dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, theme);
  await page.waitForTimeout(300);
}

async function shot(page, name) {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  ✅ ${name}.png`);
}

async function clickNext(page) {
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const text = await buttons.nth(i).textContent();
    if (text && (text.includes("Далее") || text.includes("Next"))) {
      await buttons.nth(i).click({ force: true });
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

async function clickSpec(page, label) {
  // Click a specialization card by label text
  try {
    const cards = page.locator("div").filter({ hasText: label });
    const count = await cards.count();
    if (count > 0) {
      await cards.first().click({ force: true, timeout: 3000 });
      await page.waitForTimeout(200);
    }
  } catch (e) {}
}

async function main() {
  console.log("🔍 Starting Onboarding VLM Audit...\n");

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`\n📱 ${vp.name} ${theme} (${vp.width}x${vp.height})`);
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();

      try {
        // Navigate to root, trigger onboarding by clearing localStorage
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.evaluate(() => {
          for (const k of Object.keys(localStorage)) {
            if (k.toLowerCase().includes("onboard") || k.toLowerCase().includes("workspace") || k.toLowerCase().includes("setup")) {
              localStorage.removeItem(k);
            }
          }
        });
        await setTheme(page, theme);

        // Navigate to onboarding route
        await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await setTheme(page, theme);
        await page.waitForTimeout(1500);

        // STEP 1 - Specializations (multi-select)
        await shot(page, `Onboarding_Step1_${vp.name}_${theme}`);

        // Click Терапия + Педиатрия to test multi-select
        await clickSpec(page, "Терапия");
        await clickSpec(page, "Педиатрия");
        await page.waitForTimeout(300);

        // Move to step 2
        const moved2 = await clickNext(page);
        if (!moved2) { console.log("  ⚠️  Could not click Next for step 2"); }
        await shot(page, `Onboarding_Step2_${vp.name}_${theme}`);

        // Step 3
        await clickNext(page);
        await shot(page, `Onboarding_Step3_${vp.name}_${theme}`);

        // Step 4
        await clickNext(page);
        await shot(page, `Onboarding_Step4_${vp.name}_${theme}`);

        // Step 5 - Staff
        await clickNext(page);
        await page.waitForTimeout(400);
        await shot(page, `Onboarding_Step5_${vp.name}_${theme}`);

        // Step 6 - Legal
        await clickNext(page);
        await shot(page, `Onboarding_Step6_${vp.name}_${theme}`);

        // Step 7 - Migration
        await clickNext(page);
        await shot(page, `Onboarding_Step7_${vp.name}_${theme}`);

      } catch (err) {
        console.error(`  ❌ ${vp.name} ${theme}: ${err.message}`);
        await page.screenshot({ path: path.join(OUT_DIR, `ERROR_Onboarding_${vp.name}_${theme}.png`) });
      }

      await ctx.close();
    }
  }

  await browser.close();
  console.log("\n✅ VLM Audit complete.");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
