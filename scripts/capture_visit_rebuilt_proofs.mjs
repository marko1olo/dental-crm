import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Authenticating via real Fastify API on 4100...");
  let clinicToken = "demo-clinic-token";
  let staffToken = "demo-staff-token";
  let orgId = "org_dental_1";

  try {
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });

    if (loginRes.ok) {
      const auth = await loginRes.json();
      clinicToken = auth.clinicToken;
      staffToken = auth.staffToken;
      orgId = auth.organizationId || "org_dental_1";
      console.log("Auth success: orgId =", orgId);
    }
  } catch (err) {
    console.log("Fastify auth skipped or offline, using fallback credentials:", err.message);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  for (const theme of ["light", "dark"]) {
    console.log(`\n=== Capturing Rebuilt Visit 1440x900 screenshots for theme: ${theme} ===`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(({ cTok, sTok, oId, th }) => {
      localStorage.setItem("dente_clinic_token", cTok);
      localStorage.setItem("dente_staff_token", sTok);
      localStorage.setItem("dente_active_session_token", sTok);
      localStorage.setItem("dente_organization_id", oId);
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
    }, { cTok: clinicToken, sTok: staffToken, oId: orgId, th: theme });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`[PAGE ERROR ${theme}]:`, err.stack || err.message));
    page.on("console", (msg) => {
      console.log(`[CONSOLE ${theme} ${msg.type()}]:`, msg.text());
    });

    console.log(`Navigating to #visit (${theme})...`);
    await page.goto(`${APP_BASE}/?demo=true#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    console.log(`Waiting for app boot on #visit (${theme})...`);
    await page.waitForFunction(() => {
      const text = document.body ? document.body.innerText : "";
      return !text.includes("Загрузка системы...") && text.length > 50;
    }, { timeout: 25000 }).catch((e) => console.log("Boot wait notice:", e.message));
    await wait(2500);

    // Применяем тему
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }, theme);
    await wait(1500);

    // Переключаемся на вкладку 2. Дневник приёма
    const emkTabBtn = page.locator('[data-testid="visit-subtab-emk"]');
    if (await emkTabBtn.count() > 0 && await emkTabBtn.first().isVisible()) {
      console.log(`Switching to subtab 2. Дневник приёма (${theme})...`);
      await emkTabBtn.first().click();
      await wait(1500);
    }

    // Проверяем наличие тостов
    const toasts = await page.locator('.global-toast, [data-testid="global-toast"]').allInnerTexts().catch(() => []);
    console.log(`Visible toasts (${theme}):`, toasts);

    // Снимок экрана приёма
    const visitRebuiltPath = `proof_visit_rebuilt_${theme}_1440x900.png`;
    await page.screenshot({ path: visitRebuiltPath, fullPage: false });
    console.log(`Captured: ${visitRebuiltPath}`);

    await context.close();
  }

  await browser.close();
  console.log("\nAll proofs captured successfully!");
}

run().catch((err) => {
  console.error("Proof capture error:", err);
  process.exit(1);
});
