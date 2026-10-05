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
  await page.route("**/api/**", async (route) => {
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const openBtn = await page.waitForSelector('[data-testid="imaging-open-3d-mpr"]');
  await openBtn.click();
  await page.waitForSelector('[data-testid="cbct-studio-modal"]');
  await page.waitForTimeout(1000);

  const demoBtn = await page.$('[data-testid="cbct-btn-load-demo-empty"]');
  if (demoBtn) {
    console.log("Clicking load demo button...");
    await demoBtn.click();
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: "probe_after_click.png" });
  console.log("Screenshot saved to probe_after_click.png");

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).map((b) => ({
      text: b.innerText.trim(),
      testId: b.getAttribute("data-testid"),
      modeTestId: b.getAttribute("data-mode-testid"),
      classes: b.className,
    }));
  });
  console.log("Total buttons found:", buttons.length);
  const relevant = buttons.filter((b) => b.testId || b.modeTestId || b.text.includes("Эндо") || b.text.includes("MPR"));
  console.log("Relevant buttons:", JSON.stringify(relevant, null, 2));

  await browser.close();
})();
