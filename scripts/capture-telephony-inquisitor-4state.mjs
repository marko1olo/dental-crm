import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/telephony";
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const edgePath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

if (!edgePath) {
  console.error("Browser executable not found!");
  process.exit(1);
}

console.log(`[INQUISITOR 4-STATE CAPTURE] Browser: ${edgePath}`);

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

const configs = [
  {
    key: "01_telephony_toast_pc_light_1440.png",
    label: "☀️ 1. PC Light (1440x900) - Telephony Toast",
    viewport: { width: 1440, height: 900 },
    theme: "light",
    view: "schedule",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "02_telephony_toast_pc_dark_1440.png",
    label: "🌙 2. PC Dark (1440x900) - Telephony Toast",
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    view: "schedule",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "03_telephony_toast_mobile_light_390.png",
    label: "📱 3. Mobile Light (390x844) - Telephony Toast",
    viewport: { width: 390, height: 844 },
    theme: "light",
    view: "schedule",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
  {
    key: "04_telephony_toast_mobile_dark_390.png",
    label: "🌙 4. Mobile Dark (390x844) - Telephony Toast",
    viewport: { width: 390, height: 844 },
    theme: "dark",
    view: "schedule",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
  {
    key: "05_omnichannel_chat_pc_light_1440.png",
    label: "☀️ 5. Omnichannel Chat PC Light (1440x900)",
    viewport: { width: 1440, height: 900 },
    theme: "light",
    view: "communications?section=omnichannel",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "06_omnichannel_chat_pc_dark_1440.png",
    label: "🌙 6. Omnichannel Chat PC Dark (1440x900)",
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    view: "communications?section=omnichannel",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "07_omnichannel_chat_mobile_light_390.png",
    label: "📱 7. Omnichannel Chat Mobile Light (390x844)",
    viewport: { width: 390, height: 844 },
    theme: "light",
    view: "communications?section=omnichannel",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
  {
    key: "08_omnichannel_chat_mobile_dark_390.png",
    label: "🌙 8. Omnichannel Chat Mobile Dark (390x844)",
    viewport: { width: 390, height: 844 },
    theme: "dark",
    view: "communications?section=omnichannel",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
];

for (const cfg of configs) {
  console.log(`\n--- Capturing: ${cfg.label} ---`);
  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.deviceScaleFactor,
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
  }, { theme: cfg.theme, role: "reception" });

  const url = `http://127.0.0.1:5173/?demo=true#${cfg.view}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 35000 });

  // Wait for React to mount the shell
  await page.waitForSelector(".app-shell", { timeout: 30000 });

  // Apply theme classes
  await page.evaluate(({ theme }) => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    const isDark = theme === "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    }

    // Clean any tour popups/overlays
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  }, { theme: cfg.theme });

  if (cfg.view.startsWith("schedule")) {
    // Trigger incoming call
    await page.evaluate(() => {
      if (window.__denteTelephonyStore) {
        window.__denteTelephonyStore.getState().triggerIncomingCall({
          callId: "call-live-101",
          phone: "+7 (926) 555-12-34",
          patientName: "Смирнова Екатерина Васильевна",
          patientId: "pat-101",
          provider: "mango",
          status: "ringing",
          timestamp: new Date().toISOString(),
          callStartedAt: Date.now() - 15000,
        });
      }
    });

    // Wait for the toast to be rendered in the DOM
    await page.waitForSelector('[data-testid="telephony-toast"]', { timeout: 10000 }).catch((e) => {
      console.warn("Telephony toast selector not found within 10s:", e.message);
    });
    await page.waitForTimeout(600);
  } else if (cfg.view.startsWith("communications")) {
    // Click omnichannel tab if on desktop
    await page.evaluate(() => {
      const omniTab = document.querySelector('button[data-testid="communications-tab-omnichannel"]');
      if (omniTab) omniTab.click();
    });

    await page.waitForSelector('[data-testid="omnichannel-chat-root"]', { timeout: 10000 }).catch((e) => {
      console.warn("Omnichannel chat root selector not found within 10s:", e.message);
    });
    await page.waitForTimeout(800);
  }

  const filePath = path.join(DOCS_DIR, cfg.key);
  await page.screenshot({ path: filePath, fullPage: false });
  const stat = fs.statSync(filePath);
  console.log(`✓ Saved: ${cfg.key} (${stat.size} bytes)`);

  await context.close();
}

console.log("\n[ALL RED TEAM PROOFS CAPTURED SUCCESSFULLY]");
await browser.close();
