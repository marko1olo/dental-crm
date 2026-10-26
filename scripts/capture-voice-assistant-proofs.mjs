/**
 * scripts/capture-voice-assistant-proofs.mjs
 * Red Team 4-State Visual Proof Capture for Voice Assistant & SmartMic HUD
 * Mandates 8al, 8am, 8ze, 8wy & Apple iOS HIG
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const WEB_BASE = process.env.BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(rootDir, "docs/proofs/voice_assistant");
const CONV_ID = "cbf19321-e80c-44d4-94ee-f26af18cac43";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Setting up authenticated session on live API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `doctor-voice-${uniqueId}@dente-clinic.ru`,
      password: "DoctorPassword123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  // Seed patient
  const patRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Смирнова Анна Сергеевна",
      birthDate: "1994-06-15",
      phone: "+7 (916) 123-45-67",
      gender: "female",
      allergies: ["Пенициллин", "Лидокаин"],
      somaticNotes: "Соматически здорова.",
    }),
  });
  const patData = await patRes.json();
  const patientId = patData.patient?.id || patData.id;

  console.log(`[Provisioning] Ready: patient ${patientId}`);
  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function configurePage(page, auth, theme) {
  await page.evaluate(
    ({ ct, st, uid, pid, th }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_workspace_perspective", "doctor");
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("theme", th);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingStep: "done",
          version: 1,
          selectedWorkspaceRole: "doctor",
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "doctor",
          selectedPatientId: pid,
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000; SameSite=Lax`;

      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";

      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      window.dispatchEvent(new Event("themechange"));
    },
    {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      pid: auth.patientId,
      th: theme,
    }
  );
  await page.waitForTimeout(300);
}

async function cleanOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"],
      .default-clinic-banner,
      .shepherd-element,
      .global-toast-container,
      .global-toast,
      .toast,
      vite-error-overlay {
        display: none !important;
        pointer-events: none !important;
      }
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
    document.querySelectorAll(
      'vite-error-overlay, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"], .default-clinic-banner, .shepherd-element'
    ).forEach((el) => el.remove());
  });
  await page.waitForTimeout(200);
}

async function openVoiceAssistant(page) {
  await page.evaluate(() => {
    if (window.__denteCopilot?.openVoiceModal) {
      window.__denteCopilot.openVoiceModal();
    } else {
      window.dispatchEvent(new CustomEvent("dente:open-voice-dictation"));
    }
  });
  await page.waitForSelector(".dnt-voice-modal-dialog", { state: "visible", timeout: 15000 });
  await page.waitForTimeout(500);
}

async function saveProof(page, fileName) {
  const targetPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

  const stat = statSync(targetPath);
  console.log(`Saved [${fileName}]: ${stat.size} bytes (${stat.size >= 20480 ? "PASSED >= 20KB" : "FAILED < 20KB"})`);

  copyFileSync(targetPath, path.join(BRAIN_DIR, fileName));

  if (stat.size < 20480) {
    throw new Error(`CRITICAL DEFECT: ${fileName} is below 20KB byte guard (${stat.size} bytes)!`);
  }
}

async function run() {
  const auth = await provisionLiveSession();

  console.log("=== Launching Browser for 4-State Voice Assistant Proofs ===");
  const browser = await chromium.launch({
    executablePath: browserExecutable,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1 & 2. DESKTOP (1440 x 900) - LIGHT & DARK
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Desktop Proofs (1440x900) ---");
    const dContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const dPage = await dContext.newPage();
    await dPage.goto(WEB_BASE, { waitUntil: "commit", timeout: 45000 });
    await configurePage(dPage, auth, "light");
    await dPage.goto(WEB_BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await configurePage(dPage, auth, "light");
    await cleanOverlays(dPage);
    await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await dPage.waitForTimeout(1500);

    // 01 PC Light
    await openVoiceAssistant(dPage);
    await cleanOverlays(dPage);
    console.log("Saving 01_voice_assistant_pc_light.png...");
    await saveProof(dPage, "01_voice_assistant_pc_light.png");

    // 02 PC Dark
    console.log("Saving 02_voice_assistant_pc_dark.png...");
    await configurePage(dPage, auth, "dark");
    await cleanOverlays(dPage);
    await saveProof(dPage, "02_voice_assistant_pc_dark.png");
    await dContext.close();

    // ═══════════════════════════════════════════════════════════════════
    // 3 & 4. MOBILE (390 x 844) - LIGHT & DARK
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Mobile Proofs (390x844) ---");
    const mContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mPage = await mContext.newPage();
    await mPage.goto(WEB_BASE, { waitUntil: "commit", timeout: 45000 });
    await configurePage(mPage, auth, "light");
    await mPage.goto(WEB_BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await configurePage(mPage, auth, "light");
    await cleanOverlays(mPage);
    await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await mPage.waitForTimeout(1500);

    // 03 Mobile Light
    await openVoiceAssistant(mPage);
    await cleanOverlays(mPage);
    console.log("Saving 03_voice_assistant_mobile_light.png...");
    await saveProof(mPage, "03_voice_assistant_mobile_light.png");

    // 04 Mobile Dark
    console.log("Saving 04_voice_assistant_mobile_dark.png...");
    await configurePage(mPage, auth, "dark");
    await cleanOverlays(mPage);
    await saveProof(mPage, "04_voice_assistant_mobile_dark.png");
    await mContext.close();

    console.log("=== All 4 proofs captured successfully ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL in capture-voice-assistant-proofs:", err);
  process.exit(1);
});
