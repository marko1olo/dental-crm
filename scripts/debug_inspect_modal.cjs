const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_training_mode_completed", "true");
      localStorage.setItem("dente_training_active", "false");
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

    const page = await ctx.newPage();

    // Mock API
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Захаров Иван Дмитриевич" }],
          appointments: [],
        }),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    console.log("Triggering dente:open-cbct-demo event...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
    });

    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });
    console.log("Modal opened!");
    await page.waitForTimeout(1000);

    // Save instant snapshot
    await page.screenshot({ path: "docs/screenshots/cbct_departments/debug_studio_modal.png" });
    console.log("Saved debug_studio_modal.png");

    // Inspect all buttons in modal
    const modalButtons = await page.$$eval('[data-testid="cbct-studio-modal"] button', (btns) =>
      btns.map((b) => ({
        text: b.innerText.trim().replace(/\n/g, " "),
        testid: b.getAttribute("data-testid"),
        modeTestid: b.getAttribute("data-mode-testid"),
        role: b.getAttribute("role"),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
      }))
    );
    console.log("Buttons in cbct-studio-modal:", JSON.stringify(modalButtons, null, 2));

    // Also inspect nav elements
    const navs = await page.$$eval('[data-testid="cbct-studio-modal"] nav', (navElements) =>
      navElements.map((n) => ({
        ariaLabel: n.getAttribute("aria-label"),
        html: n.outerHTML.slice(0, 300),
      }))
    );
    console.log("Navs in modal:", JSON.stringify(navs, null, 2));

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
