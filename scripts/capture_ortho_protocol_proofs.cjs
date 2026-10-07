const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
const DOCS_SCREENSHOTS_DIR = path.resolve(__dirname, "../docs/screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(DOCS_SCREENSHOTS_DIR)) fs.mkdirSync(DOCS_SCREENSHOTS_DIR, { recursive: true });

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log(">>> Setting up authenticated session on live API (Fastify 4100)...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-ortho-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function captureTheme(browser, auth, theme) {
  console.log(`\n--- Starting capture for theme: ${theme} ---`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(({ clinicToken, staffToken, ownerUserId, th }) => {
    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_id", ownerUserId);
    localStorage.setItem("dente_active_user_id", ownerUserId);
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");

    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));

    localStorage.setItem("dente_workspace_perspective", "orthodontic");
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("theme", th);

    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
  }, { ...auth, th: theme });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  console.log(`Navigating to ${BASE_URL}/#visit ...`);
  await page.goto(`${BASE_URL}/#visit`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);

  // Close onboarding overlay if present
  const closeBtn = await page.$('.onboarding-head-close-btn');
  if (closeBtn) {
    console.log("Dismissing onboarding overlay...");
    await closeBtn.click().catch(() => {});
  }

  // Ensure theme and perspective in stores
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    if (window.__usePerspectiveStore) {
      window.__usePerspectiveStore.getState().setPerspective("orthodontic");
    }
  }, theme);
  await page.waitForTimeout(1500);

  // Locate the "Протокол визита" button
  console.log("Looking for 'Протокол визита' button...");
  const protocolBtn = page.locator('button:has-text("Протокол визита")').first();

  if (await protocolBtn.isVisible({ timeout: 5000 })) {
    console.log("Clicking 'Протокол визита' button...");
    await protocolBtn.click();
  } else {
    console.log("'Протокол визита' button not directly visible, checking text on page...");
    const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log("Page text snippet:", text);
    const retryBtn = page.locator('button:has-text("Протокол визита")').first();
    if (await retryBtn.isVisible()) {
      await retryBtn.click();
    }
  }

  // Wait for the modal dialog to appear
  console.log("Waiting for orthodontic-visit-protocol-widget dialog...");
  const widgetModal = page.locator('[data-testid="orthodontic-visit-protocol-widget"]');
  await widgetModal.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(1500);

  const filename = `ortho_protocol_pc_${theme}.png`;
  const primaryPath = path.join(SCREENSHOTS_DIR, filename);
  const docsPath = path.join(DOCS_SCREENSHOTS_DIR, filename);

  await page.screenshot({ path: primaryPath, fullPage: false });
  fs.copyFileSync(primaryPath, docsPath);

  const stats = fs.statSync(primaryPath);
  console.log(`✓ Successfully captured ${filename}: ${stats.size} bytes`);

  await context.close();
}

async function main() {
  console.log("=== CAPTURING ORTHODONTIC PROTOCOL PROOFS (LIGHT & DARK 1440x900) ===");

  const auth = await provisionLiveSession();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    await captureTheme(browser, auth, "light");
    await captureTheme(browser, auth, "dark");
  } finally {
    await browser.close();
  }

  console.log("\n=== ALL CAPTURES COMPLETE ===");
}

main().catch((err) => {
  console.error("FATAL screenshot capture failure:", err);
  process.exit(1);
});
