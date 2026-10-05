import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const APP_URL = "http://127.0.0.1:5173/?demo=true";
const TARGET_DIR = path.resolve("apps/web/public/screenshots/telephony_flow");
const BRAIN_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31";

fs.mkdirSync(TARGET_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Pre-seed storage before navigation
  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_active_role", "reception");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "reception"]));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
  });

  console.log("Navigating to http://127.0.0.1:5173/");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // If login or role selection is visible, handle it
  const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
  if ((await quickDemoBtn.count()) > 0) {
    console.log("Clicking quick demo entry...");
    await quickDemoBtn.click();
    await page.waitForTimeout(1000);

    const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
    if ((await enterRoleBtn.count()) > 0) {
      console.log("Clicking enter demo tour...");
      await enterRoleBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // Ensure tour spotlight overlays are purged
  await page.evaluate(() => {
    localStorage.setItem(
      "dente_tour_v1",
      JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        activeTrackId: "solo_doctor",
        currentStepIndex: 0,
        tracksProgress: {
          solo_doctor: { completed: true, stepIndex: 4 },
          reception_admin: { completed: true, stepIndex: 4 },
          imaging_diagnostics: { completed: true, stepIndex: 4 },
        },
      })
    );
    document
      .querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .doctor-clinical-training-tour, [data-tour-step]'
      )
      .forEach((el) => el.remove());
  });

  console.log("Checking telephony store presence...");
  const hasStore = await page.evaluate(() => {
    return Boolean(
      (window).__denteTelephonyStore ||
      (window).useTelephonyStore
    );
  });
  console.log("Has telephony store:", hasStore);

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
