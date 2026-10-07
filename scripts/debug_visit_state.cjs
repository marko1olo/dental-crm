const { chromium } = require("playwright");
const fs = require("node:fs");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(() => {
    localStorage.setItem("dente_auth_token", "live-inquisition-token");
    localStorage.setItem("dente_clinic_token", "live-clinic-token");
    localStorage.setItem("dente_staff_token", "live-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_id", "doc-1");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
  });

  const page = await context.newPage();
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));

  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const testIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-testid]")).map(el => el.getAttribute("data-testid"));
  });
  console.log("Found TestIDs:", testIds);

  await page.screenshot({ path: "apps/web/public/screenshots/stage_handoff/debug_visit.png" });
  await browser.close();
}

run().catch(console.error);
