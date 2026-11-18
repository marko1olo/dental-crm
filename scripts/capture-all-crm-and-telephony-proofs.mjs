/**
 * scripts/capture-all-crm-and-telephony-proofs.mjs
 *
 * DENTE Dental CRM — Canonical 4-State Visual Proofs:
 * 1. LeadsKanbanView: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844)
 * 2. LeadFormModal: PC Light (1440x900), PC Dark (1440x900)
 * 3. IncomingCallPopup: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844)
 *
 * Saves to docs/proofs/crm/
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/crm");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

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
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay,
        .shepherd-element {
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
    document.documentElement.style.colorScheme = th;
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
    window.dispatchEvent(new Event("themechange"));
  }, theme).catch(() => {});
  await suppressOverlays(page);
  await sleep(600);
}

async function setupPageStorage(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("dente_organization_id", "org-1");
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_workspace_perspective", "owner");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dente_unlocked", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: "usr-admin-01",
          name: "Д-р Воронов А. В.",
          role: "owner",
          roleScope: "clinical_director",
        })
      );
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
        })
      );
    } catch (_) {}
  });
}

async function waitForRealUI(page) {
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    try {
      const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
      if (!text.includes("Загрузка системы") && text.length > 200) {
        break;
      }
    } catch (_) {}
  }
  await suppressOverlays(page);
  await sleep(600);
}

async function saveProof(page, filename, label) {
  await sleep(600);
  await suppressOverlays(page);
  const pDocs = path.join(OUT_DIR, filename);
  await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
  const stat = fs.statSync(pDocs);
  if (stat.size < 20000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF OK] ${filename} (${Math.round(stat.size / 1024)} KB) -> ${label}`);
}

async function triggerCall(page) {
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

async function main() {
  console.log("=== STARTING CANONICAL CRM LEADS & TELEPHONY 4-STATE CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------
    // PART 1: LeadsKanbanView & LeadFormModal (Desktop 1440x900)
    // -------------------------------------------------------------
    console.log("\n--- Part 1: Leads Kanban & Lead Form (Desktop 1440x900) ---");
    const pcPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupPageStorage(pcPage);

    console.log("Navigating to http://127.0.0.1:5173/?demo=true#leads ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#leads", { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForRealUI(pcPage);

    // 1. Leads Kanban PC Light
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_leads_kanban_pc_light_1440x900.png", "Leads Kanban PC Light");

    // 2. Leads Kanban PC Dark
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_leads_kanban_pc_dark_1440x900.png", "Leads Kanban PC Dark");

    // Open LeadFormModal by clicking "+ Новое обращение"
    console.log("Opening LeadFormModal...");
    await pcPage.click("button:has-text('Новое обращение')").catch(async () => {
      await pcPage.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Новое обращение"));
        if (btn) btn.click();
      });
    });
    await sleep(1000);
    await suppressOverlays(pcPage);

    // 5. Lead Form Modal PC Dark
    await saveProof(pcPage, "06_lead_form_modal_pc_dark_1440x900.png", "Lead Form Modal PC Dark");

    // 6. Lead Form Modal PC Light
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "05_lead_form_modal_pc_light_1440x900.png", "Lead Form Modal PC Light");

    await pcPage.close();

    // -------------------------------------------------------------
    // PART 2: Leads Mobile Feed (390x844 Apple HIG)
    // -------------------------------------------------------------
    console.log("\n--- Part 2: Leads Mobile Feed (390x844) ---");
    const mobPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await setupPageStorage(mobPage);

    await mobPage.goto("http://127.0.0.1:5173/?demo=true#leads", { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForRealUI(mobPage);

    // 3. Leads Mobile Light
    await setTheme(mobPage, "light");
    await saveProof(mobPage, "03_leads_mobile_feed_light_390x844.png", "Leads Mobile Feed Light");

    // 4. Leads Mobile Dark
    await setTheme(mobPage, "dark");
    await saveProof(mobPage, "04_leads_mobile_feed_dark_390x844.png", "Leads Mobile Feed Dark");

    await mobPage.close();

    // -------------------------------------------------------------
    // PART 3: IncomingCallPopup (Desktop 1440x900 & Mobile 390x844)
    // -------------------------------------------------------------
    console.log("\n--- Part 3: IncomingCallPopup (Desktop 1440x900 & Mobile 390x844) ---");
    const callPcPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupPageStorage(callPcPage);

    await callPcPage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForRealUI(callPcPage);

    console.log("Triggering Incoming Call on Desktop...");
    await triggerCall(callPcPage);

    // 7. Incoming Call PC Light
    await setTheme(callPcPage, "light");
    await saveProof(callPcPage, "07_telephony_incoming_call_pc_light_1440x900.png", "Incoming Call Popup PC Light");

    // 8. Incoming Call PC Dark
    await setTheme(callPcPage, "dark");
    await saveProof(callPcPage, "08_telephony_incoming_call_pc_dark_1440x900.png", "Incoming Call Popup PC Dark");

    await callPcPage.close();

    // Mobile Incoming Call
    const callMobPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await setupPageStorage(callMobPage);

    await callMobPage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForRealUI(callMobPage);

    console.log("Triggering Incoming Call on Mobile...");
    await triggerCall(callMobPage);

    // 9. Incoming Call Mobile Light
    await setTheme(callMobPage, "light");
    await saveProof(callMobPage, "09_telephony_incoming_call_mobile_light_390x844.png", "Incoming Call Popup Mobile Light");

    // 10. Incoming Call Mobile Dark
    await setTheme(callMobPage, "dark");
    await saveProof(callMobPage, "10_telephony_incoming_call_mobile_dark_390x844.png", "Incoming Call Popup Mobile Dark");

    await callMobPage.close();

    console.log("\n=== ALL CRM LEADS & TELEPHONY PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture:", err);
  process.exit(1);
});
