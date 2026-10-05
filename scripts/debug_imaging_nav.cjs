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
    localStorage.setItem("dente_tour_completed", "true");
  });

  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "networkidle", timeout: 35000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "debug_imaging_nav.png" });
  console.log("Current URL:", page.url());
  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-testid]")).map(el => el.getAttribute("data-testid"));
  });
  console.log("Test IDs found:", elements.slice(0, 30));
  await browser.close();
})();
