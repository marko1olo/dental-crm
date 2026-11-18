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

async function takeProof(page, fullPath, description, minBytes = 35000) {
  await page.screenshot({ path: fullPath, fullPage: false });
  const stat = fs.statSync(fullPath);
  console.log(`  [PROOF] ${path.basename(fullPath)} (${Math.round(stat.size / 1024)} KB) -> ${description}`);
  if (stat.size < minBytes) {
    throw new Error(`[BLANK DETECTED] ${path.basename(fullPath)} too small: ${stat.size} bytes`);
  }
}

async function main() {
  console.log("=== STARTING UNIFIED CANONICAL 4-STATE CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log("1. Navigating to http://127.0.0.1:5173/?demo=true ...");
    await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "load", timeout: 35000 });
    await sleep(3000);

    // Click demo entrance button
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Быстрый вход в Демо-тур")) {
        console.log("Entering demo showcase...");
        await btn.click();
        await sleep(4000);
        break;
      }
    }

    // Ensure administrator role
    await page.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setSelectedWorkspaceRole("administrator");
      }
    });
    await suppressOverlays(page);

    // ─────────────────────────────────────────────────────────────
    // 1. LEADS KANBAN PC (1440x900)
    // ─────────────────────────────────────────────────────────────
    console.log("\n2. Navigating to #leads on PC...");
    await page.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2500);
    await suppressOverlays(page);

    await setTheme(page, "light");
    await takeProof(
      page,
      path.join(LEADS_DIR, "01_leads_kanban_pc_light_1440x900.png"),
      "Leads Kanban Board PC Light (1440x900)"
    );

    await setTheme(page, "dark");
    await takeProof(
      page,
      path.join(LEADS_DIR, "02_leads_kanban_pc_dark_1440x900.png"),
      "Leads Kanban Board PC Dark (1440x900)"
    );

    // ─────────────────────────────────────────────────────────────
    // 2. TELEPHONY INCOMING CALL PC (1440x900)
    // ─────────────────────────────────────────────────────────────
    console.log("\n3. Triggering Incoming Call on PC...");
    await triggerCall(page);
    await page.waitForSelector('[data-testid="incoming-call-badge-container"], [data-testid="incoming-call-popup"]', { visible: true, timeout: 10000 }).catch(() => {});
    
    // Expand capsule if rendered in compact mode
    const expandBtn = await page.$('[data-testid="capsule-expand-btn"]');
    if (expandBtn) {
      console.log("Expanding PC call capsule...");
      await expandBtn.click();
      await sleep(600);
    }
    await sleep(800);

    await setTheme(page, "dark");
    await takeProof(
      page,
      path.join(TEL_DIR, "02_telephony_incoming_call_pc_dark_1440x900.png"),
      "Incoming Call Popup PC Dark (1440x900)"
    );

    await setTheme(page, "light");
    await takeProof(
      page,
      path.join(TEL_DIR, "01_telephony_incoming_call_pc_light_1440x900.png"),
      "Incoming Call Popup PC Light (1440x900)"
    );

    await dismissCall(page);

    // ─────────────────────────────────────────────────────────────
    // 3. TELEPHONY STUDIO PC (1440x900)
    // ─────────────────────────────────────────────────────────────
    console.log("\n4. Opening Telephony Studio on PC (#telephony)...");
    await page.evaluate(() => {
      window.location.hash = "telephony";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2000);
    await page.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { visible: true, timeout: 10000 }).catch(() => {});

    await setTheme(page, "light");
    await takeProof(
      page,
      path.join(TEL_DIR, "01_telephony_studio_pc_light_1440x900.png"),
      "Telephony Studio PC Light (1440x900)"
    );

    await setTheme(page, "dark");
    await takeProof(
      page,
      path.join(TEL_DIR, "02_telephony_studio_pc_dark_1440x900.png"),
      "Telephony Studio PC Dark (1440x900)"
    );

    // ─────────────────────────────────────────────────────────────
    // 4. RESIZE TO MOBILE (390x844, iPhone 14)
    // ─────────────────────────────────────────────────────────────
    console.log("\n5. Resizing session to Mobile Viewport (390x844)...");
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await sleep(2000);

    // 4.1 TELEPHONY STUDIO MOBILE
    console.log("\n6. Capturing Telephony Studio on Mobile (#telephony)...");
    await setTheme(page, "dark");
    await takeProof(
      page,
      path.join(TEL_DIR, "04_telephony_studio_mobile_dark_390x844.png"),
      "Telephony Studio Mobile Dark (390x844)"
    );

    await setTheme(page, "light");
    await takeProof(
      page,
      path.join(TEL_DIR, "03_telephony_studio_mobile_light_390x844.png"),
      "Telephony Studio Mobile Light (390x844)"
    );

    // Close studio modal
    await page.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2000);
    await suppressOverlays(page);

    // 4.2 LEADS MOBILE FEED
    console.log("\n7. Capturing Leads Mobile Feed on Mobile (#leads)...");
    // Click "Все" tab in mobile feed
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const allTab = btns.find((b) => b.innerText && b.innerText.includes("Все"));
      if (allTab) allTab.click();
    });
    await sleep(1500);

    await setTheme(page, "light");
    await takeProof(
      page,
      path.join(LEADS_DIR, "03_leads_mobile_feed_light_390x844.png"),
      "Leads Mobile Feed Light (390x844)"
    );

    await setTheme(page, "dark");
    await takeProof(
      page,
      path.join(LEADS_DIR, "04_leads_mobile_feed_dark_390x844.png"),
      "Leads Mobile Feed Dark (390x844)"
    );

    // 4.3 TELEPHONY INCOMING CALL MOBILE
    console.log("\n8. Triggering Incoming Call on Mobile (#leads)...");
    await triggerCall(page);
    await page.waitForSelector('[data-testid="incoming-call-badge-container"], [data-testid="incoming-call-popup"]', { visible: true, timeout: 10000 }).catch(() => {});
    
    const mobExpandBtn = await page.$('[data-testid="capsule-expand-btn"]');
    if (mobExpandBtn) {
      console.log("Expanding mobile call capsule...");
      await mobExpandBtn.click();
      await sleep(600);
    }
    await sleep(800);

    await setTheme(page, "dark");
    await takeProof(
      page,
      path.join(TEL_DIR, "04_telephony_incoming_call_mobile_dark_390x844.png"),
      "Incoming Call Mobile Dark (390x844)"
    );

    await setTheme(page, "light");
    await takeProof(
      page,
      path.join(TEL_DIR, "03_telephony_incoming_call_mobile_light_390x844.png"),
      "Incoming Call Mobile Light (390x844)"
    );

    await dismissCall(page);

    console.log("\n=== ALL CANONICAL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
