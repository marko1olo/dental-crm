const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const TEL_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/telephony");
const LEADS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/leads");

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
      document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach(el => el.remove());
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

async function triggerCall(page) {
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

async function dismissCall(page) {
  await page.evaluate(() => {
    if (window.__denteTelephonyStore) {
      window.__denteTelephonyStore.getState().dismissCall();
    }
  });
  await sleep(600);
}

async function main() {
  console.log("=== STARTING TARGETED LIVE OVERLAY CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log("1. Navigating to http://127.0.0.1:5173/?demo=true ...");
    await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded", timeout: 35000 });
    await sleep(3000);

    // Click demo entrance button
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Быстрый вход в Демо-тур")) {
        console.log("Found demo button, entering...");
        await btn.click();
        await sleep(4000);
        break;
      }
    }

    // Switch to #leads
    console.log("2. Switching to #leads route...");
    await page.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(3000);
    await suppressOverlays(page);

    // ─────────────────────────────────────────────────────────────
    // PC INCOMING CALL OVER LEADS BOARD
    // ─────────────────────────────────────────────────────────────
    console.log("3. Triggering incoming call on live PC screen...");
    await triggerCall(page);

    // Expand capsule if needed
    const expandBtn = await page.$('[data-testid="capsule-expand-btn"]');
    if (expandBtn) {
      console.log("Expanding PC call capsule...");
      await expandBtn.click();
      await sleep(600);
    }
    await sleep(800);

    console.log("Capturing 01_telephony_incoming_call_pc_light_1440x900.png...");
    await setTheme(page, "light");
    await suppressOverlays(page);
    const pcLight = path.join(TEL_DIR, "01_telephony_incoming_call_pc_light_1440x900.png");
    await page.screenshot({ path: pcLight, fullPage: false });
    console.log(`  [OK] Saved ${path.basename(pcLight)} (${fs.statSync(pcLight).size} bytes)`);

    console.log("Capturing 02_telephony_incoming_call_pc_dark_1440x900.png...");
    await setTheme(page, "dark");
    await suppressOverlays(page);
    const pcDark = path.join(TEL_DIR, "02_telephony_incoming_call_pc_dark_1440x900.png");
    await page.screenshot({ path: pcDark, fullPage: false });
    console.log(`  [OK] Saved ${path.basename(pcDark)} (${fs.statSync(pcDark).size} bytes)`);

    await dismissCall(page);

    // ─────────────────────────────────────────────────────────────
    // RESIZE TO MOBILE (390x844)
    // ─────────────────────────────────────────────────────────────
    console.log("4. Resizing to Mobile (390x844)...");
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await sleep(2000);
    await suppressOverlays(page);

    // Click "Все" tab in mobile feed
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const allTab = btns.find((b) => b.innerText && b.innerText.includes("Все"));
      if (allTab) allTab.click();
    });
    await sleep(1500);

    // Mobile Leads Feed Light & Dark
    console.log("Capturing 03_leads_mobile_feed_light_390x844.png...");
    await setTheme(page, "light");
    await suppressOverlays(page);
    const mobLeadLight = path.join(LEADS_DIR, "03_leads_mobile_feed_light_390x844.png");
    await page.screenshot({ path: mobLeadLight, fullPage: false });
    console.log(`  [OK] Saved ${path.basename(mobLeadLight)} (${fs.statSync(mobLeadLight).size} bytes)`);

    console.log("Capturing 04_leads_mobile_feed_dark_390x844.png...");
    await setTheme(page, "dark");
    await suppressOverlays(page);
    const mobLeadDark = path.join(LEADS_DIR, "04_leads_mobile_feed_dark_390x844.png");
    await page.screenshot({ path: mobLeadDark, fullPage: false });
    console.log(`  [OK] Saved ${path.basename(mobLeadDark)} (${fs.statSync(mobLeadDark).size} bytes)`);

    // Mobile Incoming Call Light & Dark
    console.log("5. Triggering incoming call on mobile...");
    await triggerCall(page);
    const mobExpBtn = await page.$('[data-testid="capsule-expand-btn"]');
    if (mobExpBtn) {
      console.log("Expanding mobile call capsule...");
      await mobExpBtn.click();
      await sleep(600);
    }
    await sleep(800);

    console.log("Capturing 03_telephony_incoming_call_mobile_light_390x844.png...");
    await setTheme(page, "light");
    await suppressOverlays(page);
    const mobCallLight = path.join(TEL_DIR, "03_telephony_incoming_call_mobile_light_390x844.png");
    await page.screenshot({ path: mobCallLight, fullPage: false });
    console.log(`  [OK] Saved ${path.basename(mobCallLight)} (${fs.statSync(mobCallLight).size} bytes)`);

    console.log("Capturing 04_telephony_incoming_call_mobile_dark_390x844.png...");
    await setTheme(page, "dark");
    await suppressOverlays(page);
    const mobCallDark = path.join(TEL_DIR, "04_telephony_incoming_call_mobile_dark_390x844.png");
    await page.screenshot({ path: mobCallDark, fullPage: false });
    console.log(`  [OK] Saved ${path.basename(mobCallDark)} (${fs.statSync(mobCallDark).size} bytes)`);

    await dismissCall(page);

    console.log("=== TARGETED CAPTURE COMPLETE ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
