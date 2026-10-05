const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_active_patient_id", "pat-1");
  });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const btn = await page.waitForSelector('[data-testid="topbar-open-cbct-demo-btn"]', { timeout: 10000 });
  console.log("Found topbar-open-cbct-demo-btn! Clicking...");
  await btn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test_modal_click.png" });
  console.log("Screenshot saved to test_modal_click.png");
  const modal = await page.$('[data-testid="cbct-studio-modal"]');
  console.log("Modal found:", !!modal);
  await browser.close();
})();
