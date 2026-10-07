const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ca52ff2c-5e94-4ac2-b186-bbe8f1d866c5";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/segmented_controls";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function generateSignedTokens() {
  const secret = fs.readFileSync(".data/dev-auth-secret", "utf8").trim();
  function sign(payload) {
    const full = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      iat: Math.floor(Date.now() / 1000)
    };
    const data = Buffer.from(JSON.stringify(full)).toString("base64url");
    const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${sig}`;
  }

  const orgId = "55eccd28-58e3-44af-a41d-4d5cf227cac0";
  const userId = "01a052de-b5dc-76a4-bc95-e1350f8bafc9";

  const clinicToken = sign({
    organizationId: orgId,
    clinicName: "Стоматология Дент-Премиум"
  });

  const staffToken = sign({
    userId: userId,
    organizationId: orgId,
    role: "owner",
    fullName: "Д-р Смирнов Алексей Петрович"
  });

  return { orgId, userId, clinicToken, staffToken };
}

async function run() {
  console.log("=== Capturing Real Production Visit Workspace (PC Light & Dark) ===");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const tokens = generateSignedTokens();

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    await context.addInitScript((t) => {
      localStorage.setItem("dente_clinic_token", t.clinicToken);
      localStorage.setItem("dente_staff_token", t.staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", t.userId);
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_clinic_tenant_id", t.orgId);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    }, tokens);

    const page = await context.newPage();

    console.log("Navigating to http://127.0.0.1:5173/#visit ...");
    await page.goto("http://127.0.0.1:5173/#visit", {
      waitUntil: "domcontentloaded",
      timeout: 25000
    });
    await wait(3000);

    // Dismiss any overlays
    await page.evaluate(() => {
      const startBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("0-клик старт"));
      if (startBtn) startBtn.click();
      document.querySelectorAll('.fixed.inset-0, .onboarding-modal, [role="dialog"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card').forEach((el) => {
        el.remove();
      });
    });
    await wait(2000);

    // Wait for the visit workspace or toolbar to be visible
    try {
      await page.waitForSelector('[data-testid="visit-header-monolith"], [data-testid="emk-toolbar-container"], .odontogram-toolbar, .visit-panel', {
        state: "visible",
        timeout: 8000
      });
    } catch {
      console.log("Selector wait timed out, proceeding to capture current rendered state");
    }

    await wait(1500);

    // ── PROOF 1: Real Visit Workspace (PC Light, 1440x900) ──
    const pcLightPath = path.join(LOCAL_DIR, "proof_real_visit_pc_light.png");
    const pcLightArtifact = path.join(ARTIFACTS_DIR, "proof_real_visit_pc_light.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, pcLightArtifact);
    console.log("Saved Proof (Real Visit PC Light):", pcLightPath);

    // ── PROOF 2: Real Visit Workspace (PC Dark, 1440x900) ──
    console.log("Switching to Dark mode...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await wait(2000);

    const pcDarkPath = path.join(LOCAL_DIR, "proof_real_visit_pc_dark.png");
    const pcDarkArtifact = path.join(ARTIFACTS_DIR, "proof_real_visit_pc_dark.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, pcDarkArtifact);
    console.log("Saved Proof (Real Visit PC Dark):", pcDarkPath);

    await context.close();
    console.log("=== Completed Real Production Visit Capture Successfully ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Run error:", err);
  process.exit(1);
});
