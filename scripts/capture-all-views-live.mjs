/**
 * Live 4-state visual audit screenshot engine for DENTE.
 * Reuses active authenticated browser context to ensure complete React hydration.
 */

import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0284cf50-cf45-4b19-be4c-f6f53b03120f\\real_crm_shots";

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `audit-view-${uniqueId}@dente-audit.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  console.log(`[AUTH] Creating clinic: ${loginEmail}`);
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматология Дент-Люкс ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Смирнов Алексей Петрович",
      ownerPin,
    }),
  });

  if (!initRes.ok) throw new Error(`setup/init failed: ${await initRes.text()}`);
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
  });

  if (!unlockRes.ok) throw new Error(`staff/unlock failed: ${await unlockRes.text()}`);
  const unlockData = await unlockRes.json();

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  // Seed patient
  let patientId = null;
  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Кузнецова Елена Павловна",
        phone: "+7 (999) 777-66-55",
        birthDate: "1994-03-22",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.id;
      console.log(`[SEED] Created patient: ${patientId}`);
    }
  } catch (err) {
    console.log(`[SEED WARN] ${err.message}`);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    patientId,
  };
}

async function applyTheme(page, mode) {
  await page.evaluate((themeMode) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(themeMode);
    }
    const root = document.documentElement;
    const isDark =
      themeMode === "dark" ||
      themeMode === "night" ||
      themeMode === "ocean" ||
      themeMode === "emerald" ||
      themeMode === "cyber_xray";
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    root.setAttribute("data-theme", themeMode);
    localStorage.setItem("dente_theme_mode", themeMode);
  }, mode);
  await new Promise(r => setTimeout(r, 500));
}

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`[SAVED] ${name}.png`);
  return p;
}

const VIEWS = ["schedule", "visit", "finance", "imaging", "settings"];
const THEMES = [
  "light",
  "dark",
  "night",
  "calm_teal",
  "contrast",
  "sakura",
  "ocean",
  "emerald",
  "cyber_xray",
  "warm_sand",
];

async function main() {
  const auth = await provisionTestClinic();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  try {
    // ─── DESKTOP CAPTURES (1440×900) ─────────────────────────────────────────
    console.log("\n=== STARTING DESKTOP CAPTURES (1440×900) ===");
    const deskPage = await browser.newPage();
    await deskPage.setViewport({ width: 1440, height: 900 });

    await deskPage.evaluateOnNewDocument((ct, st, pid) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        selectedPatientId: pid,
        onboardingDismissed: true,
      }));
    }, auth.clinicToken, auth.staffToken, auth.patientId);

    await deskPage.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 10000 });
    await new Promise(r => setTimeout(r, 2500));

    // Check if retry button is visible
    const retryDesk = await deskPage.$(".boot-retry-button");
    if (retryDesk) {
      console.log("[RETRY] Clicking boot-retry-button on desktop...");
      await retryDesk.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    for (const view of VIEWS) {
      await deskPage.evaluate((v) => { window.location.hash = `#${v}`; }, view);
      for (const theme of THEMES) {
        await applyTheme(deskPage, theme);
        await new Promise(r => setTimeout(r, 600));
        await screenshot(deskPage, `${view}_desktop_${theme}`);
      }
    }

    await deskPage.close();

    // ─── MOBILE CAPTURES (390×844) ───────────────────────────────────────────
    console.log("\n=== STARTING MOBILE CAPTURES (390×844) ===");
    const mobPage = await browser.newPage();
    await mobPage.setViewport({ width: 390, height: 844 });

    await mobPage.evaluateOnNewDocument((ct, st, pid) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        selectedPatientId: pid,
        onboardingDismissed: true,
      }));
    }, auth.clinicToken, auth.staffToken, auth.patientId);

    await mobPage.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 10000 });
    await new Promise(r => setTimeout(r, 2500));

    // Check if retry button is visible
    const retryMob = await mobPage.$(".boot-retry-button");
    if (retryMob) {
      console.log("[RETRY] Clicking boot-retry-button on mobile...");
      await retryMob.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    for (const view of VIEWS) {
      await mobPage.evaluate((v) => { window.location.hash = `#${v}`; }, view);
      for (const theme of THEMES) {
        await applyTheme(mobPage, theme);
        await new Promise(r => setTimeout(r, 600));
        await screenshot(mobPage, `${view}_mobile_${theme}`);
      }
    }

    await mobPage.close();

  } finally {
    await browser.close();
  }

  console.log("\n[SUCCESS] All visual theme states captured cleanly.");
}

main().catch(err => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
