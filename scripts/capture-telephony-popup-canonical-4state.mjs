import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/telephony";
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

console.log(`[CANONICAL TELEPHONY POPUP 4-STATE CAPTURE] Using Chrome: ${chromePath}`);

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--proxy-server=direct://",
    "--proxy-bypass-list=*",
  ],
});

const configs = [
  {
    key: "01_telephony_incoming_call_pc_light_1440x900.png",
    label: "☀️ 1. PC Light (1440x900) - Incoming Call Popup",
    viewport: { width: 1440, height: 900 },
    theme: "light",
    isMobile: false,
  },
  {
    key: "02_telephony_incoming_call_pc_dark_1440x900.png",
    label: "🌙 2. PC Dark (1440x900) - Incoming Call Popup",
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    isMobile: false,
  },
  {
    key: "03_telephony_incoming_call_mobile_light_390x844.png",
    label: "📱 3. Mobile Light (390x844) - Incoming Call Popup",
    viewport: { width: 390, height: 844 },
    theme: "light",
    isMobile: true,
  },
  {
    key: "04_telephony_incoming_call_mobile_dark_390x844.png",
    label: "🌙 4. Mobile Dark (390x844) - Incoming Call Popup",
    viewport: { width: 390, height: 844 },
    theme: "dark",
    isMobile: true,
  },
];

for (const cfg of configs) {
  console.log(`\n--- Capturing: ${cfg.label} ---`);
  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.isMobile ? 2 : 1,
    isMobile: cfg.isMobile,
    hasTouch: cfg.isMobile,
  });

  const page = await context.newPage();

  await page.addInitScript(({ theme, role }) => {
    localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
    localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
    localStorage.setItem("dente_active_role", role);
    localStorage.setItem("dente_user_role", role);
    localStorage.setItem("dente_theme_mode", theme);
    localStorage.setItem("dente_theme", theme);
    localStorage.setItem("theme", theme);
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: role,
        onboardingDismissed: true,
      }),
    );
  }, { theme: cfg.theme, role: "administrator" });

  const url = "http://127.0.0.1:5173/?demo=true&callExpanded=true#leads";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForTimeout(2000);

  // Apply theme & clean tour overlays
  await page.evaluate(({ theme }) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(theme);
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    }

    document.querySelectorAll(
      ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .tour-backdrop-clickable-zone, .shepherd-element"
    ).forEach((el) => el.remove());
  }, { theme: cfg.theme });

  // Trigger call on telephony store
  const callTriggered = await page.evaluate(() => {
    if (window.__APP_STORE__) {
      window.__APP_STORE__.getState().setSelectedWorkspaceRole("administrator");
    }
    if (window.__denteTelephonyStore) {
      window.__denteTelephonyStore.getState().triggerIncomingCall({
        callId: "call-" + Date.now(),
        phone: "+7 (999) 777-88-99",
        patientName: "Кузнецов Алексей Петрович",
        patientId: "pat-kuznetsov-01",
        provider: "mango",
        timestamp: new Date().toISOString(),
        status: "ringing",
        debtRub: 0,
        balanceRub: 0,
        hasDebt: false,
        hasDms: false,
        acutePain: true,
      });
      return true;
    }
    return false;
  });

  console.log(`  Call triggered: ${callTriggered}`);
  await page.waitForTimeout(1000);

  // If capsule is present, expand it to show the full incoming call popup
  const expandBtn = page.locator('[data-testid="capsule-expand-btn"]').first();
  if (await expandBtn.isVisible().catch(() => false)) {
    console.log("  Clicking capsule-expand-btn...");
    await expandBtn.click();
    await page.waitForTimeout(800);
  }

  const filePath = path.join(DOCS_DIR, cfg.key);
  await page.screenshot({ path: filePath, fullPage: false });
  const stat = fs.statSync(filePath);
  console.log(`✓ Saved: ${cfg.key} (${stat.size} bytes)`);

  await context.close();
}

console.log("\n[ALL 4-STATE TELEPHONY POPUP PROOFS CAPTURED SUCCESSFULLY]");
await browser.close();
