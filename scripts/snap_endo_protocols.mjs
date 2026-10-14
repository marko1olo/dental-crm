import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/endo_protocols");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/bdcaaaaf-f39f-46d6-9b57-12d4121ec2c9");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
  });

  const runs = [
    { name: "pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
    { name: "pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
    { name: "mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
    { name: "mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
    { name: "mobile_sealer_drawer_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true, openSealer: true },
  ];

  for (const run of runs) {
    const ctx = await browser.newContext({
      viewport: { width: run.width, height: run.height },
      isMobile: run.isMobile,
      hasTouch: run.isMobile,
    });

    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error(`[${run.name}] PAGE ERROR:`, err));

    await page.goto("http://127.0.0.1:5173/endo_modal_preview.html", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    await page.evaluate((th) => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_tour_completed", "true");
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(th);
      document.documentElement.setAttribute("data-theme", th);
      document.body.classList.remove("light", "dark");
      document.body.classList.add(th);
    }, run.theme);

    await page.waitForSelector('[data-testid="endo-canal-log-modal"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    if (run.openSealer) {
      const sealerBtn = await page.$('button[aria-label^="Выбрать силер для"]');
      if (sealerBtn) {
        await sealerBtn.click();
        await page.waitForTimeout(600);
      }
    }

    const cdp = await ctx.newCDPSession(page);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    await cdp.detach();

    const p = path.join(targetDir, run.name);
    fs.writeFileSync(p, Buffer.from(data, "base64"));
    fs.copyFileSync(p, path.join(brainDir, run.name));
    const sizeKb = (fs.statSync(p).size / 1024).toFixed(1);
    console.log(`Saved ${run.name} (${sizeKb} KB) to ${p}`);

    await ctx.close();
  }

  await browser.close();
  console.log("ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
