import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEL_DIR = path.resolve(__dirname, "../docs/proofs/telephony");
const LEADS_DIR = path.resolve(__dirname, "../docs/proofs/leads");

if (!existsSync(TEL_DIR)) mkdirSync(TEL_DIR, { recursive: true });
if (!existsSync(LEADS_DIR)) mkdirSync(LEADS_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .shepherd-element,
        .default-clinic-banner,
        [role="status"] {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await sleep(600);
}

async function setupPageSession(page, role = "administrator") {
  await page.addInitScript(({ role }) => {
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_workspace_perspective", role);
    localStorage.setItem("dente_user_role", role);
    localStorage.setItem("dente_active_role", role);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode_v1", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: role,
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({ mode: "clinic", role: role, activeRole: role })
    );
  }, { role });
}

async function triggerCall(page) {
  await page.evaluate(() => {
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
    }
  });
  await sleep(1200);
}

async function waitForRealUI(page) {
  console.log("  Waiting for real UI...");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 50;
  }, { timeout: 25000 }).catch(() => {});
  await suppressOverlays(page);
  await sleep(1000);
}

async function main() {
  console.log("=== Launching Chrome Playwright for Telephony & Leads Proofs ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP CONTEXT (1440x900)
    // -------------------------------------------------------------
    console.log("\n[1/2] Desktop Context 1440x900...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });

    const pcPage = await pcContext.newPage();
    await setupPageSession(pcPage, "administrator");

    console.log("  Navigating PC to http://127.0.0.1:5173/?demo=true&callExpanded=true#leads ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true&callExpanded=true#leads", { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);
    await waitForRealUI(pcPage);

    // Ensure demo entrance if needed
    const demoBtn = await pcPage.$("button:has-text('Быстрый вход в Демо-тур')");
    if (demoBtn) {
      console.log("  Clicking demo entrance button...");
      await demoBtn.click();
      await sleep(3000);
      await waitForRealUI(pcPage);
    }

    // Set role to administrator and trigger call
    console.log("  Triggering Incoming Call Event on Desktop with administrator role...");
    await triggerCall(pcPage);
    await pcPage.waitForSelector('[data-testid="incoming-call-badge-container"], [data-testid="incoming-call-popup"]', { state: "visible", timeout: 10000 }).catch(() => {});
    
    // Check if capsule expand button needs a click
    const expandBtn = await pcPage.$('[data-testid="capsule-expand-btn"]');
    if (expandBtn) {
      console.log("  Expanding call capsule to full popup...");
      await expandBtn.click();
      await sleep(600);
    }
    await sleep(800);

    // 01_telephony_incoming_call_pc_light_1440x900.png
    console.log("  Capturing 01_telephony_incoming_call_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await suppressOverlays(pcPage);
    const pcLightPath = path.join(TEL_DIR, "01_telephony_incoming_call_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    console.log(`  [OK] Saved 01_telephony_incoming_call_pc_light_1440x900.png (${Math.round(statSync(pcLightPath).size / 1024)} KB)`);

    // 02_telephony_incoming_call_pc_dark_1440x900.png
    console.log("  Capturing 02_telephony_incoming_call_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await suppressOverlays(pcPage);
    const pcDarkPath = path.join(TEL_DIR, "02_telephony_incoming_call_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    console.log(`  [OK] Saved 02_telephony_incoming_call_pc_dark_1440x900.png (${Math.round(statSync(pcDarkPath).size / 1024)} KB)`);

    await pcContext.close();

    // -------------------------------------------------------------
    // 2. MOBILE CONTEXT (390x844, iPhone 14)
    // -------------------------------------------------------------
    console.log("\n[2/2] Mobile Context 390x844...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });

    const mobilePage = await mobileContext.newPage();
    await setupPageSession(mobilePage, "administrator");

    console.log("  Navigating mobile to http://127.0.0.1:5173/?demo=true&callExpanded=true#leads ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true&callExpanded=true#leads", { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);
    await waitForRealUI(mobilePage);

    // Ensure demo entrance if needed
    const mobDemoBtn = await mobilePage.$("button:has-text('Быстрый вход в Демо-тур')");
    if (mobDemoBtn) {
      console.log("  Clicking mobile demo entrance button...");
      await mobDemoBtn.click();
      await sleep(3000);
      await waitForRealUI(mobilePage);
    }

    // Trigger Incoming Call on Mobile
    console.log("  Triggering Incoming Call Event on Mobile with administrator role...");
    await triggerCall(mobilePage);
    await mobilePage.waitForSelector('[data-testid="incoming-call-badge-container"], [data-testid="incoming-call-popup"]', { state: "visible", timeout: 10000 }).catch(() => {});
    
    const mobExpandBtn = await mobilePage.$('[data-testid="capsule-expand-btn"]');
    if (mobExpandBtn) {
      console.log("  Expanding mobile call capsule...");
      await mobExpandBtn.click();
      await sleep(600);
    }
    await sleep(800);

    // 03_telephony_incoming_call_mobile_light_390x844.png
    console.log("  Capturing 03_telephony_incoming_call_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await suppressOverlays(mobilePage);
    const mobileCallLightPath = path.join(TEL_DIR, "03_telephony_incoming_call_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileCallLightPath, fullPage: false });
    console.log(`  [OK] Saved 03_telephony_incoming_call_mobile_light_390x844.png (${Math.round(statSync(mobileCallLightPath).size / 1024)} KB)`);

    // 04_telephony_incoming_call_mobile_dark_390x844.png
    console.log("  Capturing 04_telephony_incoming_call_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await suppressOverlays(mobilePage);
    const mobileCallDarkPath = path.join(TEL_DIR, "04_telephony_incoming_call_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileCallDarkPath, fullPage: false });
    console.log(`  [OK] Saved 04_telephony_incoming_call_mobile_dark_390x844.png (${Math.round(statSync(mobileCallDarkPath).size / 1024)} KB)`);

    // Dismiss active call on mobile to capture clean leads mobile feed
    console.log("  Dismissing incoming call for leads feed captures...");
    await mobilePage.evaluate(() => {
      if (window.__denteTelephonyStore) {
        window.__denteTelephonyStore.getState().dismissCall();
      }
    });
    await sleep(800);

    // Click "Все" tab in mobile feed
    console.log("  Selecting 'Все' leads tab on mobile feed...");
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const allTab = btns.find((b) => b.innerText && b.innerText.includes("Все"));
      if (allTab) allTab.click();
    });
    await sleep(1000);

    // 03_leads_mobile_feed_light_390x844.png
    console.log("  Capturing 03_leads_mobile_feed_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await suppressOverlays(mobilePage);
    const leadsMobLightPath = path.join(LEADS_DIR, "03_leads_mobile_feed_light_390x844.png");
    await mobilePage.screenshot({ path: leadsMobLightPath, fullPage: false });
    console.log(`  [OK] Saved 03_leads_mobile_feed_light_390x844.png (${Math.round(statSync(leadsMobLightPath).size / 1024)} KB)`);

    // 04_leads_mobile_feed_dark_390x844.png
    console.log("  Capturing 04_leads_mobile_feed_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await suppressOverlays(mobilePage);
    const leadsMobDarkPath = path.join(LEADS_DIR, "04_leads_mobile_feed_dark_390x844.png");
    await mobilePage.screenshot({ path: leadsMobDarkPath, fullPage: false });
    console.log(`  [OK] Saved 04_leads_mobile_feed_dark_390x844.png (${Math.round(statSync(leadsMobDarkPath).size / 1024)} KB)`);

    await mobileContext.close();

    console.log("\n=== ALL CANONICAL PROOFS RECAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Playwright screenshot capture:", err);
  process.exit(1);
});
