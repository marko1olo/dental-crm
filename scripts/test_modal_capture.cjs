const { chromium } = require("playwright");

async function main() {
  console.log("1. Launching Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
    ],
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

    page.on("console", (msg) => console.log("[PAGE LOG]", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.log("[PAGE UNCAUGHT ERROR]", err.message));

    // Abort external fonts to prevent hanging on document.fonts.ready in offline/sandbox
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    // Mock minimal auth & dashboard
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман" }],
          appointments: [],
        }),
      });
    });

    console.log("2. Navigating directly to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });
    console.log("3. DOM Content Loaded!");

    console.log("4. Waiting for cbct-studio-modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 35000 });
    console.log("5. CBCT Studio modal opened!");
    await page.waitForTimeout(3000);
    console.log("Taking screenshot...");
    await page.screenshot({ path: "docs/screenshots/cbct_departments/debug_modal_opened.png", animations: "disabled", timeout: 60000 });
    console.log("Screenshot successfully saved!");
    const buttons = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="cbct-studio-modal"]');
      if (!modal) return "No modal found";
      const btns = Array.from(modal.querySelectorAll("button")).map(b => ({
        testId: b.getAttribute("data-testid"),
        text: b.textContent?.trim().slice(0, 30),
        className: b.className
      }));
      return btns;
    });
    console.log("Found buttons in modal:", JSON.stringify(buttons, null, 2));

    await page.screenshot({ path: "docs/screenshots/cbct_departments/test_01_endo_dark.png" });
    console.log("11. Saved test_01_endo_dark.png successfully!");

  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

main().catch(console.error);
