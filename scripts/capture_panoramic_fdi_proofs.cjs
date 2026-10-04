const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function take(page, name) {
  const p = path.join(targetDir, name);
  await page.screenshot({ path: p, timeout: 30000 });
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED] ${name} (${sz} KB)`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const page = await ctx.newPage();
    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });

    // Click demo volume load button
    console.log("Looking for demo button...");
    const demoBtn = await page.waitForSelector('button:has-text("Демо-исследование"), [data-testid="cbct-btn-load-demo-empty"]', { timeout: 10000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking Демо-исследование button...");
      await demoBtn.click();
    }

    console.log("Waiting 6s for demo slices to decode...");
    await page.waitForTimeout(6000);

    // Switch to Panorama workspace
    console.log("Switching to Panorama workspace...");
    const panoTab = await page.waitForSelector('[data-testid="cbct-nav-tab-panorama"]', { timeout: 10000 });
    await panoTab.click();
    await page.waitForTimeout(3000);

    // 1. Capture Dark Panorama with FDI ribbon
    await take(page, "02_panoramic_fdi_ribbon_mandible_dark.png");

    // 2. Click FDI tooth 46
    console.log("Clicking FDI tooth 46...");
    const tooth46 = await page.$('button[data-testid="cbct-fdi-tooth-46"]');
    if (tooth46) {
      await tooth46.click();
      await page.waitForTimeout(2000);
      await take(page, "03_panoramic_fdi_tooth_46_selected_dark.png");
    }

    // 3. Switch jaw to Maxilla via FDI ribbon tab
    console.log("Switching to Maxilla tab in FDI ribbon...");
    const maxillaTab = await page.$('[data-testid="cbct-fdi-tab-maxilla"]');
    if (maxillaTab) {
      await maxillaTab.click();
      await page.waitForTimeout(2000);
      await take(page, "04_panoramic_fdi_maxilla_switched_dark.png");
    }

    // 4. Click Maxilla tooth 16
    console.log("Clicking maxillary tooth 16...");
    const tooth16 = await page.$('button[data-testid="cbct-fdi-tooth-16"]');
    if (tooth16) {
      await tooth16.click();
      await page.waitForTimeout(2000);
      await take(page, "05_panoramic_fdi_tooth_16_selected_dark.png");
    }

    console.log("Done successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

main();
