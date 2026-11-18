const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "orthodontic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doctor", fullName: "Д-р Ортопедов А. В.", role: "doctor" }));
    } catch (_) {}
  });

  const page = await ctx.newPage();
  console.log("Navigating...");
  await page.goto("http://127.0.0.1:5173/?demo=true#orthopedics", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log("URL:", page.url());
  console.log("Title:", await page.title());

  let hasPanel = await page.$('[data-testid="orthopedics-chairside-panel"]');
  console.log("Has chairside panel initially:", !!hasPanel);

  if (!hasPanel) {
    console.log("Dispatching event...");
    await page.evaluate(() => {
      window.location.hash = "#orthopedics";
      window.dispatchEvent(new CustomEvent("dente:open-orthopedics"));
    });
    await page.waitForTimeout(2000);
    hasPanel = await page.$('[data-testid="orthopedics-chairside-panel"]');
    console.log("Has chairside panel after dispatch:", !!hasPanel);
  }

  const html = await page.content();
  console.log("HTML length:", html.length);
  if (!hasPanel) {
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log("Body preview:", bodyText);
  }

  await browser.close();
})();
