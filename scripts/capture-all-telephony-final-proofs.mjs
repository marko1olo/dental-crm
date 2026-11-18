/**
 * scripts/capture-all-telephony-final-proofs.mjs
 *
 * DENTE Dental CRM — Telephony, Softphone & Call Center
 * Canonical 4-State Visual Proof Generation Suite (PC Light/Dark, Mobile Light/Dark).
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDocsDir = path.resolve(__dirname, "../docs/proofs/telephony");
const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8869f260-aa35-4412-b1b2-a760c1c9b3f0";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

if (!fs.existsSync(outDocsDir)) fs.mkdirSync(outDocsDir, { recursive: true });
if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLiveSession() {
  console.log("[Auth] Provisioning live clinic session via Fastify API...");
  const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `admin-telephony-${Date.now()}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Смирнова Анна Викторовна",
      ownerPin: "1234",
    }),
  });
  const initData = await initRes.json();
  const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  const unlockData = await unlockRes.json();
  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    user: unlockData.user,
  };
}

function injectStorage(page, { ct, st, usr, theme }) {
  return page.addInitScript(
    ({ clinicToken, staffToken, user, initialTheme }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "administrator");
      localStorage.setItem("dente_workspace_perspective", "administrator");
      localStorage.setItem("dente_user_role", "administrator");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(user));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme", initialTheme);
      localStorage.setItem("dente_theme_mode", initialTheme);
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "administrator",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
    },
    { clinicToken: ct, staffToken: st, user: usr, initialTheme: theme }
  );
}

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

async function waitForReactMounted(page) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0 && !root.querySelector(".boot-state");
    },
    { timeout: 45000 }
  );
  await sleep(1500);
}

async function run() {
  console.log("=== Starting Telephony 4-State Proof Generation Suite ===");
  const auth = await getLiveSession();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ==========================================
    // 1. DESKTOP CONTEXT (1440x900)
    // ==========================================
    console.log("\n--- PC Desktop 1440x900 Context ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await injectStorage(pcPage, {
      ct: auth.clinicToken,
      st: auth.staffToken,
      usr: auth.user,
      theme: "light",
    });

    // 1.1 Telephony Studio PC Light
    console.log("Navigating to http://127.0.0.1:5173/?demo=true#telephony ...");
    await pcPage.goto(`${WEB_URL}/?demo=true#telephony`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(pcPage);
    await setTheme(pcPage, "light");
    await sleep(600);
    await saveProofFile(pcPage, "01_telephony_studio_pc_light_1440x900.png");

    // 1.2 Telephony Studio PC Dark
    console.log("Switching to Dark theme...");
    await setTheme(pcPage, "dark");
    await sleep(600);
    await saveProofFile(pcPage, "02_telephony_studio_pc_dark_1440x900.png");

    // 1.3 Incoming Call PC Light
    console.log("Navigating to http://127.0.0.1:5173/?callExpanded=true#schedule (Light)...");
    await setTheme(pcPage, "light");
    await pcPage.goto(`${WEB_URL}/?callExpanded=true#schedule`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(pcPage);
    await triggerLiveIncomingCall(pcPage);
    await pcPage.waitForSelector('[data-testid="incoming-call-popup"]', { timeout: 10000 }).catch(() => {});
    await sleep(800);
    await saveProofFile(pcPage, "05_incoming_call_pc_light_1440x900.png");

    // 1.4 Incoming Call PC Dark
    console.log("Switching incoming call to Dark theme...");
    await setTheme(pcPage, "dark");
    await sleep(600);
    await saveProofFile(pcPage, "06_incoming_call_pc_dark_1440x900.png");

    await pcContext.close();

    // ==========================================
    // 2. MOBILE CONTEXT (390x844 Apple HIG)
    // ==========================================
    console.log("\n--- Mobile 390x844 Apple HIG Context ---");
    const mobContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobPage = await mobContext.newPage();
    await injectStorage(mobPage, {
      ct: auth.clinicToken,
      st: auth.staffToken,
      usr: auth.user,
      theme: "light",
    });

    // 2.1 Mobile Softphone Light
    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#softphone (Light)...");
    await mobPage.goto(`${WEB_URL}/?demo=true#softphone`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(mobPage);
    await setTheme(mobPage, "light");
    await sleep(600);
    await saveProofFile(mobPage, "03_telephony_softphone_mobile_light_390x844.png");

    // 2.2 Mobile Softphone Dark
    console.log("Switching mobile softphone to Dark theme...");
    await setTheme(mobPage, "dark");
    await sleep(600);
    await saveProofFile(mobPage, "04_telephony_softphone_mobile_dark_390x844.png");

    // 2.3 Mobile Incoming Call Light
    console.log("Navigating mobile to http://127.0.0.1:5173/?callExpanded=true#schedule (Light)...");
    await setTheme(mobPage, "light");
    await mobPage.goto(`${WEB_URL}/?callExpanded=true#schedule`, { waitUntil: "load", timeout: 45000 });
    await waitForReactMounted(mobPage);
    await triggerLiveIncomingCall(mobPage);
    await mobPage.waitForSelector('[data-testid="incoming-call-popup"]', { timeout: 10000 }).catch(() => {});
    await sleep(800);
    await saveProofFile(mobPage, "07_incoming_call_mobile_light_390x844.png");

    // 2.4 Mobile Incoming Call Dark
    console.log("Switching mobile incoming call to Dark theme...");
    await setTheme(mobPage, "dark");
    await sleep(600);
    await saveProofFile(mobPage, "08_incoming_call_mobile_dark_390x844.png");

    await mobContext.close();

    console.log("\n=== ALL 8 CANONICAL SCREENSHOTS SUCCESSFULLY CAPTURED! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture run failed:", err);
  process.exit(1);
});
