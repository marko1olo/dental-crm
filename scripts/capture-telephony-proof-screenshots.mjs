/**
 * scripts/capture-telephony-proof-screenshots.mjs
 *
 * DENTE Dental CRM — Telephony, Softphone & Call Center
 * 4-State Red Team Visual Proof Capture (PC & Mobile, Light & Dark).
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDocsDir = path.resolve(__dirname, "../docs/proofs/telephony");
const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8869f260-aa35-4412-b1b2-a760c1c9b3f0";
const WEB_URL = "http://127.0.0.1:5173";

if (!fs.existsSync(outDocsDir)) fs.mkdirSync(outDocsDir, { recursive: true });
if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setTheme(page, theme) {
  await page.evaluate((th) => {
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
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
  }, theme);
  await sleep(400);
}

async function triggerLiveIncomingCall(page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente:telephony-mock-incoming", {
        detail: {
          callId: "call-" + Date.now(),
          phone: "+7 (926) 555-12-34",
          patientName: "Смирнова Екатерина Васильевна",
          patientId: "01a00000-0000-0000-0000-000000000001",
          provider: "mango",
          timestamp: new Date().toISOString(),
          status: "ringing",
          acutePain: true,
        },
      })
    );
  });
  await sleep(1000);
}

async function saveProofFile(page, filename) {
  const pDocs = path.join(outDocsDir, filename);
  const pBrain = path.join(brainDir, filename);
  await page.screenshot({ path: pDocs, fullPage: false });
  fs.copyFileSync(pDocs, pBrain);
  const stat = fs.statSync(pDocs);
  console.log(`  [OK] Saved ${filename} (${Math.round(stat.size / 1024)} KB)`);
  return stat.size;
}

async function setupPage(page, theme = "light") {
  await page.addInitScript(({ th }) => {
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
  }, { th: theme });
}

async function waitForReactMounted(page) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0 && root.innerHTML.length > 100;
    },
    { timeout: 45000 }
  );
  await sleep(1500);
}

async function run() {
  console.log("=== Capturing Telephony 4-State Visual Proofs via Chromium ===");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ==========================================
    // 1. DESKTOP CONTEXT (1440x900)
    // ==========================================
    console.log("\n[PC Desktop 1440x900 Context]");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await setupPage(pcPage, "light");

    console.log("  Navigating to http://127.0.0.1:5173/?demo=true#telephony ...");
    await pcPage.goto(`${WEB_URL}/?demo=true#telephony`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(pcPage);

    // 1.1 PC Light Telephony Studio
    console.log("  [Capturing] 01_telephony_studio_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await sleep(600);
    await saveProofFile(pcPage, "01_telephony_studio_pc_light_1440x900.png");

    // 1.2 PC Dark Telephony Studio
    console.log("  [Capturing] 02_telephony_studio_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await sleep(600);
    await saveProofFile(pcPage, "02_telephony_studio_pc_dark_1440x900.png");

    // 1.3 PC Light Incoming Call Popup
    console.log("  Switching to softphone & incoming call (Light)...");
    await setTheme(pcPage, "light");
    await pcPage.goto(`${WEB_URL}/?demo=true#softphone`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(pcPage);
    await triggerLiveIncomingCall(pcPage);
    await sleep(800);
    console.log("  [Capturing] 05_incoming_call_pc_light_1440x900.png...");
    await saveProofFile(pcPage, "05_incoming_call_pc_light_1440x900.png");

    // 1.4 PC Dark Incoming Call Popup
    console.log("  Switching to Dark & incoming call...");
    await setTheme(pcPage, "dark");
    await sleep(600);
    console.log("  [Capturing] 06_incoming_call_pc_dark_1440x900.png...");
    await saveProofFile(pcPage, "06_incoming_call_pc_dark_1440x900.png");

    await pcContext.close();

    // ==========================================
    // 2. MOBILE CONTEXT (390x844 Apple HIG iPhone 14)
    // ==========================================
    console.log("\n[Mobile 390x844 Apple HIG Context]");
    const mobContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobPage = await mobContext.newPage();
    await setupPage(mobPage, "light");

    console.log("  Navigating mobile to http://127.0.0.1:5173/?demo=true#softphone ...");
    await mobPage.goto(`${WEB_URL}/?demo=true#softphone`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(mobPage);

    // 2.1 Mobile Light Softphone Bottom Sheet
    console.log("  [Capturing] 03_telephony_softphone_mobile_light_390x844.png...");
    await setTheme(mobPage, "light");
    await sleep(600);
    await saveProofFile(mobPage, "03_telephony_softphone_mobile_light_390x844.png");

    // 2.2 Mobile Dark Softphone Bottom Sheet
    console.log("  [Capturing] 04_telephony_softphone_mobile_dark_390x844.png...");
    await setTheme(mobPage, "dark");
    await sleep(600);
    await saveProofFile(mobPage, "04_telephony_softphone_mobile_dark_390x844.png");

    // 2.3 Mobile Light Studio & Incoming Call
    console.log("  Navigating mobile to #telephony (Light)...");
    await setTheme(mobPage, "light");
    await mobPage.goto(`${WEB_URL}/?demo=true#telephony`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(mobPage);
    await triggerLiveIncomingCall(mobPage);
    await sleep(800);
    console.log("  [Capturing] 07_incoming_call_mobile_light_390x844.png...");
    await saveProofFile(mobPage, "07_incoming_call_mobile_light_390x844.png");

    // 2.4 Mobile Dark Studio & Incoming Call
    console.log("  Switching mobile to Dark...");
    await setTheme(mobPage, "dark");
    await sleep(600);
    console.log("  [Capturing] 08_incoming_call_mobile_dark_390x844.png...");
    await saveProofFile(mobPage, "08_incoming_call_mobile_dark_390x844.png");

    await mobContext.close();

    console.log("\n=== ALL 8 TELEPHONY 4-STATE PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
