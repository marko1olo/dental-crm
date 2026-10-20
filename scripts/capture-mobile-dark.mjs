import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });
  const auth = await loginRes.json();
  await context.addCookies([
    { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
  ]);
  const page = await context.newPage();
  await page.addInitScript(({ cToken, sToken, doc }) => {
    localStorage.setItem("dente_clinic_token", cToken);
    localStorage.setItem("dente_staff_token", sToken);
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      onboardingDismissed: true,
    }));
  }, { cToken: auth.clinicToken, sToken: auth.staffToken, doc: auth.user });

  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.className = "dark";
    document.documentElement.style.colorScheme = "dark";
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("dark");
    }
  });

  await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', { state: "visible", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  const outPath = path.join(process.cwd(), "docs/proofs/schedule/schedule_mobile_dark_390x844.png");
  await page.screenshot({ path: outPath, fullPage: false });
  console.log("Saved:", outPath);
  await browser.close();
}

main().catch(console.error);
