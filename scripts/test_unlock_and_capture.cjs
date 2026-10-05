const { chromium } = require("playwright");
const fs = require("node:fs");

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
      id: "demo-doctor-chief",
      fullName: "Доктор Демо (Главный врач)",
      role: "owner",
      organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
      email: "doctor@dente-demo.ru"
    }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      version: 1,
    }));
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);

  const demoBtn = await page.$('.auth-demo-btn');
  if (demoBtn) {
    console.log("Clicking .auth-demo-btn...");
    await demoBtn.click();
    await page.waitForTimeout(2500);
  }

  // Switch to clinic tab
  await page.evaluate(() => {
    const clinicTabBtn = Array.from(document.querySelectorAll("button, .settings-subnav-btn")).find(
      (b) => b.textContent && (b.textContent.includes("Клиника") || b.textContent.includes("кабинет"))
    );
    if (clinicTabBtn) clinicTabBtn.click();
  });
  await page.waitForTimeout(1000);

  const shotPath = "docs/screenshots/scale_presets/test_unlocked.png";
  await page.screenshot({ path: shotPath });
  console.log("Screenshot saved:", shotPath, "size:", fs.statSync(shotPath).size);
  await browser.close();
}

run().catch(console.error);
