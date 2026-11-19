/**
 * scripts/capture-schedule-canonical-4states.mjs
 * Red Team 4-State Visual Proof Capture with Live Fastify Auth & Session Hydration.
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CONV_ID = process.env.CONVERSATION_ID || "35df0a2e-cbd8-4a53-a5e5-77ef67f3bad0";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/schedule");

if (!existsSync(OUT_DOCS)) mkdirSync(OUT_DOCS, { recursive: true });
if (!existsSync(BRAIN_DIR)) mkdirSync(BRAIN_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupDataAndAuth() {
  console.log("[LOGIN] Authenticating via Fastify API (admin@clinic.ru)...");
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: HTTP ${loginRes.status} ${await loginRes.text()}`);
  }
  const auth = await loginRes.json();
  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": auth.clinicToken,
    "Authorization": `Bearer ${auth.staffToken}`,
  };

  const dashRes = await fetch(`${API_BASE}/api/dashboard`, { headers });
  const dashboard = await dashRes.json();
  const patients = dashboard.patients || [];
  const doctor = (dashboard.clinicSettings?.staff || []).find((s) => s.role === "doctor") || auth.user;

  console.log(`[LOGIN] Auth successful! ClinicToken: ${auth.clinicToken?.slice(0, 10)}... Doctor: ${doctor.fullName}`);
  return { auth, doctor, patientId: patients[0]?.id || null };
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.innerHTML = `
        .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"],
        .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"],
        .global-toast-container, vite-error-overlay, .shepherd-element {
          display: none !important;
          pointer-events: none !important;
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
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
    } catch (_) {}
  }, theme);
  await sleep(400);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await sleep(500);

  const docsPath = path.join(OUT_DOCS, filename);
  const brainPath = path.join(BRAIN_DIR, filename);

  await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });
  copyFileSync(docsPath, brainPath);

  const stats = statSync(docsPath);
  console.log(`  [OK] ${filename} (${(stats.size / 1024).toFixed(1)} KB) -> ${description}`);
}

async function main() {
  console.log("=== STARTING CANONICAL 4-STATE SCHEDULE PROOF CAPTURE ===");
  const { auth, doctor, patientId } = await setupDataAndAuth();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ----------------------------------------------------
    // PHASE 1: Desktop Schedule Suite (1440x900)
    // ----------------------------------------------------
    console.log("\n>>> PHASE 1: Desktop Suite (1440x900)");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    await pcContext.addCookies([
      { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
    ]);

    const pcPage = await pcContext.newPage();
    pcPage.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
    pcPage.on("pageerror", (err) => console.error("[BROWSER UNCAUGHT]:", err));
    pcPage.on("requestfailed", (req) => console.error("[REQ FAILED]:", req.method(), req.url(), req.failure()?.errorText));
    pcPage.on("response", (res) => {
      if (res.status() >= 400) console.warn(`[HTTP ${res.status()}]:`, res.url());
    });

    await pcPage.addInitScript(({ cToken, sToken, pId, doc }) => {
      localStorage.setItem("dente_clinic_token", cToken);
      localStorage.setItem("dente_staff_token", sToken);
      localStorage.setItem("dente_active_session_token", sToken);
      localStorage.setItem("dente_user_id", doc?.id || "doc-1");
      localStorage.setItem("dente_user_name", doc?.fullName || "Доктор");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_workspace_perspective", "doctor");
      localStorage.setItem("dente_active_view", "schedule");
      localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "doctor",
        selectedSpecialty: "therapist",
        selectedPatientId: pId,
        onboardingDismissed: true,
      }));
    }, { cToken: auth.clinicToken, sToken: auth.staffToken, pId: patientId, doc: doctor });

    console.log("Navigating to Schedule: http://127.0.0.1:5173/#schedule");
    await pcPage.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    console.log("Waiting for boot state (.boot-state) to clear...");
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await sleep(2000);
    const currentUrl = pcPage.url();
    const pageText = await pcPage.evaluate(() => document.body ? document.body.innerText : "");
    const rootHtml = await pcPage.evaluate(() => document.getElementById("root")?.innerHTML || "no root");
    console.log("Current URL:", currentUrl);
    console.log("Root HTML preview (500 chars):", rootHtml.slice(0, 500));
    console.log("Page text preview (300 chars):", pageText.slice(0, 300));

    console.log("Waiting for schedule view (#schedule, [data-testid='schedule-view'])...");
    try {
      await pcPage.waitForSelector('[data-testid="schedule-view"], #schedule, .schedule-panel', {
        state: "visible",
        timeout: 35000,
      });
    } catch (e) {
      console.warn("waitForSelector timed out! Taking diagnostic screenshot...");
      await pcPage.screenshot({ path: path.join(OUT_DOCS, "diagnostic_schedule_fail.png") });
      throw e;
    }
    await sleep(1500);

    // 1. PC Light
    console.log("Capturing ☀️ PC Light (1440x900)...");
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "schedule_pc_light_1440x900.png", "Desktop Schedule Grid Light Mode");
    copyFileSync(path.join(OUT_DOCS, "schedule_pc_light_1440x900.png"), path.join(OUT_DOCS, "pc_light_1440x900.png"));
    copyFileSync(path.join(OUT_DOCS, "schedule_pc_light_1440x900.png"), path.join(OUT_DOCS, "01_schedule_grid_pc_light_1440x900.png"));

    // 2. PC Dark
    console.log("Capturing 🌙 PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "schedule_pc_dark_1440x900.png", "Desktop Schedule Grid Dark Mode");
    copyFileSync(path.join(OUT_DOCS, "schedule_pc_dark_1440x900.png"), path.join(OUT_DOCS, "pc_dark_1440x900.png"));
    copyFileSync(path.join(OUT_DOCS, "schedule_pc_dark_1440x900.png"), path.join(OUT_DOCS, "02_schedule_grid_pc_dark_1440x900.png"));

    // ----------------------------------------------------
    // PHASE 2: Mobile Apple HIG Agenda View (390x844)
    // ----------------------------------------------------
    console.log("\n>>> PHASE 2: Mobile Suite (390x844 Apple HIG)");
    await pcPage.setViewportSize({ width: 390, height: 844 });
    await sleep(2000);

    // 3. Mobile Light (390x844)
    console.log("Capturing 📱 Mobile Light (390x844)...");
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "schedule_mobile_light_390x844.png", "Mobile Schedule Agenda Light Mode");
    copyFileSync(path.join(OUT_DOCS, "schedule_mobile_light_390x844.png"), path.join(OUT_DOCS, "mobile_light_390x844.png"));
    copyFileSync(path.join(OUT_DOCS, "schedule_mobile_light_390x844.png"), path.join(OUT_DOCS, "03_schedule_agenda_mobile_light_390x844.png"));

    // 4. Mobile Dark (390x844)
    console.log("Capturing 🌙 Mobile Dark (390x844)...");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "schedule_mobile_dark_390x844.png", "Mobile Schedule Agenda Dark Mode");
    copyFileSync(path.join(OUT_DOCS, "schedule_mobile_dark_390x844.png"), path.join(OUT_DOCS, "mobile_dark_390x844.png"));
    copyFileSync(path.join(OUT_DOCS, "schedule_mobile_dark_390x844.png"), path.join(OUT_DOCS, "04_schedule_agenda_mobile_dark_390x844.png"));

    await pcContext.close();

    console.log("\n=== ALL 4 CANONICAL SCHEDULE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Schedule Capture:", err);
  process.exit(1);
});
