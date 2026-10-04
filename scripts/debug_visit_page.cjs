const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedPatientId: "pat-1",
      selectedSpecialty: "surgeon",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  });

  const page = await context.newPage();
  page.on("pageerror", err => console.log("[PAGE ERROR]", err.message));
  page.on("console", msg => console.log("[LOG]", msg.text()));

  await page.route("**/api/**", async route => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  console.log("Navigating to http://127.0.0.1:5173/#visit...");
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("--- BODY TEXT START ---");
  console.log(bodyText.slice(0, 1000));
  console.log("--- BODY TEXT END ---");

  const selectors = [
    ".visit-monolithic-header",
    '[data-testid="visit-header-monolith"]',
    '[data-testid="visit-view"]',
    ".app-shell",
    ".specialty-focus-bar",
    '[data-testid="toggle-specialty-protocol-drawer"]',
  ];

  for (const s of selectors) {
    console.log(`Selector "${s}": count =`, await page.locator(s).count());
  }

  await browser.close();
})();
