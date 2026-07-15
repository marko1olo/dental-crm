const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";
const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21/.tempmediaStorage";

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setLocalStorage(page, state, overrideOnboarding = false, tokens = null) {
  await page.addInitScript((args) => {
    const { themeStr, overrideOnboarding, tokens } = args;
    localStorage.setItem("dente_theme", themeStr);
    localStorage.setItem("dente_theme_mode", themeStr);
    if (!overrideOnboarding) {
        localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { onboardingCompleted: true }, version: 0 }));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, draftMode: false, savedAt: new Date().toISOString() }));
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, onboardingDismissed: true }));
    } else {
        localStorage.removeItem("dente-workspace-profile");
        localStorage.removeItem("dental-crm:onboarding:v1");
        localStorage.removeItem("dental-crm:web-ui-preferences:v1");
    }
    
    if (tokens) {
      localStorage.setItem("dente_clinic_token", tokens.clinicToken);
      localStorage.setItem("dente_staff_token", tokens.staffToken);
      localStorage.setItem("dente_user", JSON.stringify(tokens.user));
    }
    
    const applyTheme = () => {
        if (!document.body) { requestAnimationFrame(applyTheme); return; }
        if (themeStr === "dark") {
          document.documentElement.classList.add("dark");
          document.body.setAttribute("data-theme", "dark");
          document.body.classList.add("theme-dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.body.setAttribute("data-theme", "light");
          document.body.classList.remove("theme-dark");
        }
    };
    applyTheme();
  }, { themeStr: state.theme, overrideOnboarding, tokens });
}

async function takeScreenshot(page, filename) {
  const p1 = path.join(OUTPUT_DIR, filename);
  const p2 = path.join(ARTIFACTS_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
}

const states = [
  { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light" },
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark" },
  { name: "MOBILE_LIGHT",width: 390,  height: 844,  theme: "light" },
  { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark" }
];

(async () => {
  const { request } = require("playwright");
  const apiContext = await request.newContext();
  let tokens = null;
  try {
    const res = await apiContext.post("http://127.0.0.1:5173/api/auth/dev-login");
    const data = await res.json();
    if (data.ok) {
      tokens = { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user };
      console.log("Successfully fetched dev-login tokens.");
    } else {
      console.error("Failed to fetch dev-login tokens", data);
    }
  } catch (e) {
    console.error("Error fetching dev-login tokens", e);
  }

  const browser = await chromium.launch({ headless: true });
  
  for (const state of states) {
    console.log(`\n--- TESTING STATE: ${state.name} ---`);
    
    // Test 1: Onboarding
    const ctxOnboarding = await browser.newContext({ viewport: { width: state.width, height: state.height }, colorScheme: state.theme });
    const pgOnboarding = await ctxOnboarding.newPage();
    await setLocalStorage(pgOnboarding, state, true, tokens);
    await pgOnboarding.goto("http://127.0.0.1:5173/");
    await wait(6000);
    await takeScreenshot(pgOnboarding, `audit_onboarding_${state.name}.png`);
    await ctxOnboarding.close();

    const context1 = await browser.newContext({ viewport: { width: state.width, height: state.height }, colorScheme: state.theme });
    const page1 = await context1.newPage();
    await setLocalStorage(page1, state, false, tokens);

    console.log("Navigating to Schedule for Race Condition...");
    await page1.goto("http://127.0.0.1:5173/#schedule");
    await wait(8000); // Give Vite time to compile the large app

    // Test 2: Command Palette (Cmd+K)
    console.log("Triggering Command Palette...");
    await page1.keyboard.press('Control+K');
    await wait(500);
    await takeScreenshot(page1, `audit_cmd_k_${state.name}.png`);
    await page1.keyboard.press('Escape');
    await wait(500);

    // Test 3: Voice Mode
    console.log("Triggering Voice Mode...");
    await page1.keyboard.press('Control+M');
    await wait(1000);
    await takeScreenshot(page1, `audit_voice_mode_${state.name}.png`);
    await page1.keyboard.press('Escape');
    await wait(500);

    // Test 4: Cash Shift
    console.log("Opening Cash Shift Widget...");
    await page1.goto("http://127.0.0.1:5173/#dashboard");
    await wait(1500);
    // Since CashShiftWidget is just rendered inside #dashboard, let's just screenshot it. 
    await takeScreenshot(page1, `audit_cash_shift_${state.name}.png`);

    // Kanban
    console.log("Testing Kanban...");
    await page1.goto("http://127.0.0.1:5173/#leads");
    await wait(3000);
    await takeScreenshot(page1, `audit_kanban_${state.name}.png`);

    // Family Wallet
    console.log("Testing Family Wallet...");
    await page1.goto("http://127.0.0.1:5173/#finance");
    await wait(3000);
    await takeScreenshot(page1, `audit_finance_wallet_${state.name}.png`);

    // Scanner
    console.log("Testing Scanner...");
    await page1.goto("http://127.0.0.1:5173/#scanner");
    await wait(3000);
    await takeScreenshot(page1, `audit_scanner_${state.name}.png`);
    
    // Odontogram
    console.log("Testing Odontogram...");
    await page1.goto("http://127.0.0.1:5173/#patients/1");
    await wait(2000);
    await takeScreenshot(page1, `audit_odontogram_${state.name}.png`);

    // 2-Context WS Sync / 409 Conflict Test (simulated)
    console.log("Testing 2-Context WS Sync / Conflict...");
    const context2 = await browser.newContext({ viewport: { width: state.width, height: state.height }, colorScheme: state.theme });
    const page2 = await context2.newPage();
    await setLocalStorage(page2, state, false, tokens);
    await page2.goto("http://127.0.0.1:5173/#schedule");
    await wait(5000);
    // Take a screenshot of the schedule to verify dual context running
    await takeScreenshot(page1, `audit_dual_context_p1_${state.name}.png`);
    await takeScreenshot(page2, `audit_dual_context_p2_${state.name}.png`);

    await context2.close();
    await context1.close();
  }

  await browser.close();
  console.log("=== VLM AUDIT SCREENSHOTS GENERATED ===");
})();
