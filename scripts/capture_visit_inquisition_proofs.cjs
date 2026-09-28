const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve(__dirname, "../docs/screenshots/visit_inquisition");
const INQUISITION_LIVE_DIR = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
const BRAIN_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1fe8318d-5b52-49b0-ae26-d5bf469ac2cd\\screenshots";

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(INQUISITION_LIVE_DIR)) fs.mkdirSync(INQUISITION_LIVE_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("dente_theme", t);
    localStorage.setItem("theme", t);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(t);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  if (fs.existsSync(BRAIN_DIR)) {
    fs.copyFileSync(filePath, path.join(BRAIN_DIR, filename));
  }
  if (fs.existsSync(INQUISITION_LIVE_DIR)) {
    fs.copyFileSync(filePath, path.join(INQUISITION_LIVE_DIR, filename));
    if (filename.includes("tab3_diagnostics")) {
      const cleanName = filename.replace("visit_tab3_diagnostics_desktop_", "visit_diagnostics_clean_");
      fs.copyFileSync(filePath, path.join(INQUISITION_LIVE_DIR, cleanName));
      console.log(`Copied clean proof: ${cleanName}`);
    }
  }
  console.log(`Saved screenshot: ${filename} (${fs.statSync(filePath).size} bytes)`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
      })
    );
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    console.log("Navigating to Schedule to select Ivanov and click [В приём]...");
    await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Click [В приём] on first appointment to populate patient context
    const startVisitBtn = await page.$('[data-testid^="appointment-action-start-"]');
    if (startVisitBtn) {
      console.log("Found appointment start button, clicking...");
      await startVisitBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log("No start button found, navigating directly to #visit...");
      await page.goto(`${BASE_URL}/#visit`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
    }

    const themes = ["light", "dark"];
    const tabs = [
      { id: "emk", name: "tab1_emk", selector: '[data-testid="visit-subtab-emk"]' },
      { id: "odontogram", name: "tab2_odontogram", selector: '[data-testid="visit-subtab-odontogram"]' },
      { id: "diagnostics", name: "tab3_diagnostics", selector: '[data-testid="visit-subtab-diagnostics"]' },
      { id: "consents", name: "tab4_consents", selector: '[data-testid="visit-subtab-consents"]' },
    ];

    for (const theme of themes) {
      console.log(`\n=== Testing Theme: ${theme.toUpperCase()} ===`);
      await setTheme(page, theme);

      for (const tab of tabs) {
        console.log(`Activating Tab: ${tab.name} (${tab.id})...`);
        const tabBtn = await page.$(tab.selector);
        if (tabBtn) {
          await tabBtn.click();
          await page.waitForTimeout(800);
        } else {
          console.warn(`Tab button not found: ${tab.selector}`);
        }
        await saveProof(page, `visit_${tab.name}_desktop_${theme}.png`);
      }
    }

    console.log("\nAll Visit tabs visual proofs successfully captured!");
  } catch (err) {
    console.error("Error during visit screenshot capture:", err);
  } finally {
    await browser.close();
  }
}

main();
