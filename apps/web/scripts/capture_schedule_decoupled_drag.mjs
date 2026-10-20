import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ad253760-f20c-4a8c-bcf0-f219e68d2c2a";
const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/schedule");

for (const dir of [BRAIN_DIR, PROOFS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    const isDark = th === "dark";
    document.documentElement.classList.remove(isDark ? "light" : "dark");
    document.documentElement.classList.add(th);
    document.documentElement.setAttribute("data-theme", th);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await wait(600);
}

async function capture() {
  console.log("=== CAPTURING REAL SCHEDULE DECOUPLED DRAG SCREENSHOTS ===");

  let auth = null;
  try {
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
    });
    if (loginRes.ok) {
      auth = await loginRes.json();
      console.log("[LOGIN] API authenticated successfully.");
    }
  } catch (e) {
    console.log("[LOGIN] API fetch fallback:", e.message);
  }

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const executablePath = fs.existsSync(edgePath)
    ? edgePath
    : fs.existsSync(chromePath)
      ? chromePath
      : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : { channel: "msedge" }),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    if (auth?.clinicToken && auth?.staffToken) {
      await context.addCookies([
        { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
        { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
      ]);
    }

    const page = await context.newPage();

    const doc = auth?.user || { id: "doc-1", name: "Доктор Терапевт", role: "doctor" };
    const cToken = auth?.clinicToken || "demo-clinic-token";
    const sToken = auth?.staffToken || "demo-staff-token";

    await page.addInitScript(
      ({ cToken, sToken, doc }) => {
        localStorage.setItem("dente_clinic_token", cToken);
        localStorage.setItem("dente_staff_token", sToken);
        localStorage.setItem("dente_workspace_perspective", "doctor");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({ dismissed: true, step: "done" }),
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "doctor",
            selectedSpecialty: "therapist",
            onboardingDismissed: true,
          }),
        );
      },
      { cToken, sToken, doc },
    );

    console.log("[NAV] Loading http://127.0.0.1:5173/#schedule ...");
    await page.goto(`${APP_BASE}/#schedule`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    const loginBtn = page.locator('button:has-text("Войти в систему")');
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("[AUTH] Clicking login submit button...");
      await loginBtn.click();
      await wait(2000);
      await page.goto(`${APP_BASE}/#schedule`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    }

    console.log("Waiting for schedule layout...");
    await page
      .waitForSelector(
        '.schedule-filter-strip, .schedule-grid-container, [data-testid="schedule-grid"]',
        { state: "visible", timeout: 35000 },
      )
      .catch(() => console.log("Schedule grid container selector wait timeout (proceeding)"));

    await wait(2000);

    // Dismiss any modals / overlays
    const dismissBtn = page
      .locator('button:has-text("Скрыть"), button[aria-label="Закрыть"]')
      .first();
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click().catch(() => {});
      await wait(500);
    }

    // 1. PC LIGHT (1440x900)
    console.log("1. Capturing Schedule PC Light (1440x900)...");
    await applyTheme(page, "light");
    await wait(1000);
    const lightPath = path.join(BRAIN_DIR, "schedule_pc_light_1440x900.png");
    await page.screenshot({ path: lightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(
      lightPath,
      path.join(PROOFS_DIR, "schedule_decoupled_drag_pc_light_1440x900.png"),
    );
    const lightSize = fs.statSync(lightPath).size;
    console.log(`[PROOF] Saved schedule_pc_light_1440x900.png: ${(lightSize / 1024).toFixed(1)} KB`);

    // 2. PC DARK (1440x900)
    console.log("2. Capturing Schedule PC Dark (1440x900)...");
    await applyTheme(page, "dark");
    await wait(1000);
    const darkPath = path.join(BRAIN_DIR, "schedule_pc_dark_1440x900.png");
    await page.screenshot({ path: darkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(
      darkPath,
      path.join(PROOFS_DIR, "schedule_decoupled_drag_pc_dark_1440x900.png"),
    );
    const darkSize = fs.statSync(darkPath).size;
    console.log(`[PROOF] Saved schedule_pc_dark_1440x900.png: ${(darkSize / 1024).toFixed(1)} KB`);

    console.log("=== CAPTURE COMPLETE ===");
  } finally {
    await browser.close();
  }
}

capture().catch((e) => {
  console.error("Capture fatal error:", e);
  process.exit(1);
});
