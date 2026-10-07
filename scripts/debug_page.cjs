const { chromium } = require("playwright");
const fs = require("node:fs");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
  });
  const login = await loginRes.json();

  await context.addInitScript(
    ({ token, staff, user }) => {
      localStorage.setItem("dente_clinic_token", token);
      localStorage.setItem("dente_staff_token", staff);
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_current_doctor_id", user.id);
      localStorage.setItem("dente_active_staff_user", JSON.stringify(user));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", onboardingDismissed: true }));
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({
          state: {
            clinicName: "Стоматология ДЕНТЕ Премиум",
            organizationId: "00000000-0000-0000-0000-000000000001",
            currentDoctor: { id: user.id, fullName: user.fullName, role: user.role },
            flags: { disableTour: true },
          },
        })
      );
    },
    { token: login.clinicToken, staff: login.staffToken, user: login.user }
  );

  const page = await context.newPage();
  console.log("Navigating to http://127.0.0.1:5173/#patients...");
  await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log("Current URL:", url);

  const buttons = await page.$$eval("button", (btns) => btns.map((b) => ({ text: b.textContent.trim(), testId: b.getAttribute("data-testid") })));
  console.log("Visible buttons count:", buttons.length);
  console.log("Buttons sample:", JSON.stringify(buttons.slice(0, 15), null, 2));

  await page.screenshot({ path: "docs/screenshots/patient_intake_inquisition/debug_rendered.png" });
  console.log("Saved debug_rendered.png");

  await browser.close();
}

main().catch(console.error);
