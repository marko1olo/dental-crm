const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/5ce0fd48-6a85-42b3-af32-59753a8b75e1";
const DOCS_DIR = path.resolve("docs/proofs/inventory");
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

async function captureOne({ browser, auth, orgId, viewport, isMobile, theme, filename, docsName }) {
  console.log(`>>> Capturing ${filename} (${theme}, ${viewport.width}x${viewport.height})...`);
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile: !!isMobile,
  });

  await context.addCookies([
    { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_organization_id", value: orgId, domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();
  await page.addInitScript(({ ct, st, org, user, th }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_organization_id", org);
    localStorage.setItem("dente_active_session_token", st);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_workspace_perspective", "owner");
    localStorage.setItem("dente_user_id", user.id);
    localStorage.setItem("dente_active_staff_user", JSON.stringify(user));
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "network", role: "owner", activeRole: "owner", hasInventoryModule: true }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedSpecialty: "therapist", onboardingDismissed: true }));
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, { ct: auth.clinicToken, st: auth.staffToken, org: orgId, user: auth.user, th: theme });

  await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "commit", timeout: 35000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  if (!isMobile) {
    await page.waitForSelector("button:has-text('Оприходовать накладную'), table", { state: "visible", timeout: 25000 }).catch(() => {});
  } else {
    await page.waitForSelector("button:has-text('Приход'), [data-testid='mobile-inventory-list'], .inventory-mobile-card", { state: "visible", timeout: 25000 }).catch(() => {});
  }
  await page.waitForTimeout(3000);

  // If mobile, wait for table or grouped list cards
  const brainPath = path.join(BRAIN_DIR, filename);
  const docsPath = path.join(DOCS_DIR, docsName);
  await page.screenshot({ path: brainPath, fullPage: false });
  fs.copyFileSync(brainPath, docsPath);
  console.log(`[SUCCESS] Saved ${brainPath} (${(fs.statSync(brainPath).size / 1024).toFixed(1)} KB)`);
  await context.close();
}

async function main() {
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });
  const auth = await loginRes.json();
  const orgId = "01a00000-0000-0000-0000-000000000000";

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-proxy-server", "--disable-gpu"],
  });

  try {
    // 1. PC Light
    await captureOne({
      browser, auth, orgId,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "light",
      filename: "pc_light_1440x900.png",
      docsName: "warehouse_stock_pc_light.png",
    });

    // 2. PC Dark
    await captureOne({
      browser, auth, orgId,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "dark",
      filename: "pc_dark_1440x900.png",
      docsName: "warehouse_stock_pc_dark.png",
    });

    // 3. Mobile Light
    await captureOne({
      browser, auth, orgId,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      theme: "light",
      filename: "mobile_light_390x844.png",
      docsName: "warehouse_waybills_mobile_light.png",
    });

    // 4. Mobile Dark
    await captureOne({
      browser, auth, orgId,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      theme: "dark",
      filename: "mobile_dark_390x844.png",
      docsName: "warehouse_waybills_mobile_dark.png",
    });

    console.log(">>> [ALL 4 PROOFS CAPTURED SUCCESSFULLY]");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
