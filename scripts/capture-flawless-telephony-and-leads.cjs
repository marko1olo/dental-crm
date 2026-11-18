const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const LEADS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/leads");
const TEL_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/telephony");

if (!fs.existsSync(LEADS_DIR)) fs.mkdirSync(LEADS_DIR, { recursive: true });
if (!fs.existsSync(TEL_DIR)) fs.mkdirSync(TEL_DIR, { recursive: true });

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

async function triggerMockCall(page) {
  await page.evaluate(() => {
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
  await sleep(1000);
}

async function takeScreenshot(page, fullPath, minBytes = 35000) {
  await page.screenshot({ path: fullPath, fullPage: false });
  const stat = fs.statSync(fullPath);
  console.log(`  [SAVED] ${path.basename(fullPath)} (${Math.round(stat.size / 1024)} KB)`);
  if (stat.size < minBytes) {
    throw new Error(`[BLANK DETECTED] ${path.basename(fullPath)} is too small: ${stat.size} bytes`);
  }
}

async function main() {
  console.log("=== STARTING CANONICAL TELEPHONY & LEADS SCREENSHOT CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // -------------------------------------------------------------
    // PHASE 1: DESKTOP CONTEXT (1440x900)
    // -------------------------------------------------------------
    console.log("\n--- Phase 1: Desktop Context (1440x900) ---");
    const pcPage = await browser.newPage();
    await pcPage.setViewport({ width: 1440, height: 900 });

    console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "load", timeout: 35000 });
    await sleep(2500);

    // Click demo entrance if present
    const buttons = await pcPage.$$("button");
    for (const btn of buttons) {
      const text = await pcPage.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Быстрый вход в Демо-тур")) {
        console.log("Entering demo showcase...");
        await btn.click();
        await sleep(3500);
        break;
      }
    }

    // Wait for workspace shell
    await pcPage.waitForSelector(".workspace-shell, nav, header", { visible: true, timeout: 20000 }).catch(() => {});
    await suppressOverlays(pcPage);

    // 1.1 LEADS KANBAN PC
    console.log("Navigating to #leads...");
    await pcPage.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2500);
    await suppressOverlays(pcPage);

    console.log("Capturing 01_leads_kanban_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await takeScreenshot(pcPage, path.join(LEADS_DIR, "01_leads_kanban_pc_light_1440x900.png"));

    console.log("Capturing 02_leads_kanban_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await takeScreenshot(pcPage, path.join(LEADS_DIR, "02_leads_kanban_pc_dark_1440x900.png"));

    // 1.2 TELEPHONY INCOMING CALL PC
    console.log("Triggering incoming call on live PC screen...");
    await triggerMockCall(pcPage);
    await pcPage.waitForSelector('[data-testid="incoming-call-badge-container"], [data-testid="incoming-call-popup"]', { visible: true, timeout: 10000 }).catch(() => {});
    await sleep(1000);

    console.log("Capturing 01_telephony_incoming_call_pc_dark_1440x900.png...");
    await takeScreenshot(pcPage, path.join(TEL_DIR, "02_telephony_incoming_call_pc_dark_1440x900.png"));

    console.log("Capturing 01_telephony_incoming_call_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await takeScreenshot(pcPage, path.join(TEL_DIR, "01_telephony_incoming_call_pc_light_1440x900.png"));

    // Dismiss active call
    await pcPage.evaluate(() => {
      if (window.__denteTelephonyStore) {
        window.__denteTelephonyStore.getState().dismissCall();
      }
    });
    await sleep(800);

    // 1.3 TELEPHONY STUDIO MODAL PC
    console.log("Opening Telephony Studio (#telephony)...");
    await pcPage.evaluate(() => {
      window.location.hash = "telephony";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2000);
    await pcPage.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { visible: true, timeout: 10000 }).catch(() => {});

    console.log("Capturing 01_telephony_studio_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await takeScreenshot(pcPage, path.join(TEL_DIR, "01_telephony_studio_pc_light_1440x900.png"));

    console.log("Capturing 02_telephony_studio_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await takeScreenshot(pcPage, path.join(TEL_DIR, "02_telephony_studio_pc_dark_1440x900.png"));

    await pcPage.close();

    // -------------------------------------------------------------
    // PHASE 2: MOBILE CONTEXT (390x844, iPhone 14)
    // -------------------------------------------------------------
    console.log("\n--- Phase 2: Mobile Context (390x844) ---");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#leads ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#leads", { waitUntil: "load", timeout: 35000 });
    await sleep(3000);

    // Click demo entrance if needed
    const mobBtns = await mobilePage.$$("button");
    for (const btn of mobBtns) {
      const text = await mobilePage.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Быстрый вход в Демо-тур")) {
        console.log("Entering demo showcase on mobile...");
        await btn.click();
        await sleep(3500);
        break;
      }
    }

    // Ensure on leads hash
    await mobilePage.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2500);
    await suppressOverlays(mobilePage);

    // Click "Все" tab in mobile feed to ensure hydrated cards are in view
    await mobilePage.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll("button"));
      const allTab = allButtons.find((b) => b.innerText && b.innerText.includes("Все"));
      if (allTab) allTab.click();
    });
    await sleep(1500);

    // 2.1 LEADS MOBILE FEED
    console.log("Capturing 03_leads_mobile_feed_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await takeScreenshot(mobilePage, path.join(LEADS_DIR, "03_leads_mobile_feed_light_390x844.png"));

    console.log("Capturing 04_leads_mobile_feed_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await takeScreenshot(mobilePage, path.join(LEADS_DIR, "04_leads_mobile_feed_dark_390x844.png"));

    // 2.2 TELEPHONY INCOMING CALL MOBILE
    console.log("Triggering incoming call on mobile...");
    await triggerMockCall(mobilePage);
    await mobilePage.waitForSelector('[data-testid="incoming-call-badge-container"], [data-testid="incoming-call-popup"]', { visible: true, timeout: 10000 }).catch(() => {});
    await sleep(1000);

    console.log("Capturing 04_telephony_incoming_call_mobile_dark_390x844.png...");
    await takeScreenshot(mobilePage, path.join(TEL_DIR, "04_telephony_incoming_call_mobile_dark_390x844.png"));

    console.log("Capturing 03_telephony_incoming_call_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await takeScreenshot(mobilePage, path.join(TEL_DIR, "03_telephony_incoming_call_mobile_light_390x844.png"));

    // Dismiss active call
    await mobilePage.evaluate(() => {
      if (window.__denteTelephonyStore) {
        window.__denteTelephonyStore.getState().dismissCall();
      }
    });
    await sleep(800);

    // 2.3 TELEPHONY STUDIO MOBILE
    console.log("Opening Telephony Studio on mobile (#telephony)...");
    await mobilePage.evaluate(() => {
      window.location.hash = "telephony";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2000);
    await mobilePage.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { visible: true, timeout: 10000 }).catch(() => {});

    console.log("Capturing 03_telephony_studio_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await takeScreenshot(mobilePage, path.join(TEL_DIR, "03_telephony_studio_mobile_light_390x844.png"));

    console.log("Capturing 04_telephony_studio_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await takeScreenshot(mobilePage, path.join(TEL_DIR, "04_telephony_studio_mobile_dark_390x844.png"));

    await mobilePage.close();

    console.log("\n=== ALL CANONICAL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE:", err);
  process.exit(1);
});
