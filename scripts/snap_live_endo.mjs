import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b36b11d2-6adf-48f9-8341-ec798abe11e7");
const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"]
  });

  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((th) => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
      localStorage.setItem("dente_tour_completed", "true");
    }, theme);

    const page = await ctx.newPage();
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const endoTab = await page.$('[data-testid="cbct-nav-tab-endo"], button:has-text("Эндодонтия")');
    if (endoTab) {
      await endoTab.click();
      await page.waitForTimeout(2000);
    }

    const cdp = await ctx.newCDPSession(page);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    await cdp.detach();

    for (const name of [`04_endo_studio_${theme}.png`, `04_endo_workspace_${theme}.png`]) {
      const p = path.join(targetDir, name);
      fs.writeFileSync(p, Buffer.from(data, "base64"));
      fs.copyFileSync(p, path.join(brainDir, name));
      fs.copyFileSync(p, path.join(parentBrainDir, name));
      console.log(`Saved ${name} (${(fs.statSync(p).size / 1024).toFixed(1)} KB)`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log("ALL DONE!");
}

main().catch(err => {
  console.error("SNAP ERROR:", err);
  process.exit(1);
});
