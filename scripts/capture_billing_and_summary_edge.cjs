const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\b56f04d4-3d70-4c64-a6ca-c14d053ba13e";
const DOCS_DIR = path.resolve("docs/screenshots/billing_and_summary_redesign");

async function main() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  console.log("1. Authenticating with Fastify API...");
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const auth = await loginRes.json();
  if (!auth.ok) throw new Error("Authentication failed: " + JSON.stringify(auth));
  console.log("Logged in as:", auth.user?.fullName);

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    for (const theme of ["light", "dark"]) {
      console.log(`\n=== Capturing for theme: ${theme.toUpperCase()} ===`);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });

      await context.addInitScript(({ clinicToken, staffToken, user, themeMode }) => {
        localStorage.setItem("dente_clinic_token", clinicToken);
        localStorage.setItem("dente_staff_token", staffToken);
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
        localStorage.setItem("dente_theme_mode", themeMode);
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "doctor",
          onboardingDismissed: true,
          onboardingStep: "done",
        }));
        if (themeMode === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, themeMode: theme });

      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);

      // Clean distracting overlays
      await page.evaluate((themeMode) => {
        document.querySelectorAll('vite-error-overlay, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container').forEach(el => el.remove());
        if (themeMode === "dark") {
          document.documentElement.classList.add("dark");
          document.body.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.body.classList.remove("dark");
        }
      }, theme);

      // 1. Capture Billing Widget with Discount Popover open
      console.log(`[${theme}] Ensuring EMK tab is active for billing widget...`);
      const emkTab = page.locator('[data-testid="visit-subtab-emk"]');
      if (await emkTab.count() > 0 && await emkTab.isVisible()) {
        await emkTab.click({ force: true });
        await page.waitForTimeout(800);
      }
      console.log(`[${theme}] Locating billing widget...`);
      const billingWidget = page.locator('[data-testid="visit-service-billing-widget"]');
      await billingWidget.waitFor({ state: "visible", timeout: 15000 });
      await billingWidget.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const discountChip = page.locator('[data-testid="chip-doctor-discount"]');
      console.log(`[${theme}] Clicking discount chip to open popover...`);
      await discountChip.click({ force: true });
      await page.waitForTimeout(500);

      const discountBar = page.locator('[data-testid="doctor-discount-bar"]');
      await discountBar.waitFor({ state: "visible", timeout: 5000 });

      const billingShotName = `billing_cockpit_pc_${theme}.png`;
      const billingPathDocs = path.join(DOCS_DIR, billingShotName);
      const billingPathArtifact = path.join(ARTIFACT_DIR, billingShotName);
      await page.screenshot({ path: billingPathDocs });
      fs.copyFileSync(billingPathDocs, billingPathArtifact);
      console.log(`[${theme}] Saved ${billingShotName} (${fs.statSync(billingPathDocs).size} bytes)`);

      // 2. Open VisitSummaryModal and Dropup
      console.log(`[${theme}] Navigating to Odontogram tab to open VisitSummaryModal...`);
      const odontogramTab = page.locator('[data-testid="visit-subtab-odontogram"]');
      await odontogramTab.scrollIntoViewIfNeeded();
      await odontogramTab.click({ force: true });
      await page.waitForTimeout(2000);

      console.log(`[${theme}] Dispatching open-visit-summary-modal event...`);
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-visit-summary-modal"));
      });
      await page.waitForTimeout(1000);

      const summaryModal = page.locator('[data-testid="visit-summary-modal"]');
      await summaryModal.waitFor({ state: "visible", timeout: 10000 });

      console.log(`[${theme}] Opening Documents & Certificates Dropup...`);
      const docsDropupBtn = page.locator('[data-testid="summary-docs-dropup-btn"]');
      await docsDropupBtn.click({ force: true });
      await page.waitForTimeout(500);

      const summaryShotName = `visit_summary_modal_pc_${theme}.png`;
      const summaryPathDocs = path.join(DOCS_DIR, summaryShotName);
      const summaryPathArtifact = path.join(ARTIFACT_DIR, summaryShotName);
      await page.screenshot({ path: summaryPathDocs });
      fs.copyFileSync(summaryPathDocs, summaryPathArtifact);
      console.log(`[${theme}] Saved ${summaryShotName} (${fs.statSync(summaryPathDocs).size} bytes)`);

      await context.close();
    }
  } finally {
    await browser.close();
    console.log("ALL 4 SCREENSHOTS SUCCESSFULLY CAPTURED!");
  }
}

main().catch(err => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
