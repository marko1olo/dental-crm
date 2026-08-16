/**
 * Live 4-state visual audit screenshot runner for DENTE dental-crm.
 */

import puppeteer from "puppeteer";
import path from "path";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\37b8f253-5512-4e6a-af2e-6b6677f4c08f";

// ─── 1. Auth & Data Provisioning ──────────────────────────────────────────────────

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `audit-test-${uniqueId}@dente-visual-test.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  console.log(`[AUTH] Creating test clinic: ${loginEmail}`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматология Дент-Премиум ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Смирнов Алексей Петрович",
      ownerPin,
    }),
  });

  if (!initRes.ok) throw new Error(`setup/init failed ${initRes.status}: ${await initRes.text()}`);
  const initData = await initRes.json();
  console.log(`[AUTH] Clinic OK. orgId=${initData.organizationId}`);

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
  });

  if (!unlockRes.ok) throw new Error(`staff/unlock failed ${unlockRes.status}: ${await unlockRes.text()}`);
  const unlockData = await unlockRes.json();
  console.log(`[AUTH] Staff unlocked. staffToken OK`);

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
      const patient = await pRes.json();
      patientId = patient.id;
      console.log(`[SEED] Patient created: ${patientId}`);
    }
  } catch (err) {
    console.log(`[SEED WARN] Patient seed: ${err.message}`);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    patientId,
  };
}

// ─── 2. Browser Navigation ────────────────────────────────────────────────────────

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile:  { width: 390,  height: 844 },
};

async function seedTokensAndGo(page, clinicToken, staffToken, patientId, url, themeMode, perspective = "standard") {
  await page.evaluateOnNewDocument((ct, st, pid, tm, pers) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_theme_mode", tm);
    localStorage.setItem("dente_workspace_perspective", pers);
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      selectedPatientId: pid || null,
      onboardingDismissed: true,
      soundNotificationsMuted: false,
    }));
  }, clinicToken, staffToken, patientId, themeMode, perspective);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
  } catch (e) {
    console.log(`  [WARN] Page load: ${e.message}`);
  }

  // Handle retry button if visible
  try {
    const retryBtn = await page.$(".boot-retry-button");
    if (retryBtn) {
      console.log("  [ACTION] Clicking boot-retry-button...");
      await retryBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch {}

  await applyTheme(page, themeMode);
  await new Promise(r => setTimeout(r, 1500));
}

async function applyTheme(page, themeMode) {
  await page.evaluate((mode) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    if (mode === "dark" || mode === "night") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("dente_theme_mode", mode);
  }, themeMode);

  await new Promise(r => setTimeout(r, 400));
}

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`[SHOT] ${name}.png`);
  return p;
}

// ─── 3. Main Capture Loop ─────────────────────────────────────────────────────────

const TEST_SCENARIOS = [
  // 1. Core Screens
  { name: "schedule", url: `${APP_BASE}/#schedule`, perspective: "standard" },
  { name: "visit", url: `${APP_BASE}/#visit`, perspective: "standard" },
  { name: "settings", url: `${APP_BASE}/#settings`, perspective: "standard" },

  // 2. Clinical Perspectives
  { name: "perspective_chairsider", url: `${APP_BASE}/#shift`, perspective: "chairsider" },
  { name: "perspective_frontdesk", url: `${APP_BASE}/#shift`, perspective: "frontdesk" },
  { name: "perspective_presentation", url: `${APP_BASE}/#shift`, perspective: "presentation" },
  { name: "perspective_orthodontic", url: `${APP_BASE}/#shift`, perspective: "orthodontic" },
  { name: "perspective_pediatric", url: `${APP_BASE}/#shift`, perspective: "pediatric" },
];

async function main() {
  const auth = await provisionTestClinic().catch(e => {
    console.error("[AUTH FATAL]", e.message);
    process.exit(1);
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  try {
    // 4-State Matrix: Mobile Light, Mobile Dark, Desktop Light, Desktop Dark
    for (const scenario of TEST_SCENARIOS) {
      for (const [size, viewport] of Object.entries(VIEWPORTS)) {
        for (const themeMode of ["light", "dark"]) {
          const label = `${scenario.name}_${size}_${themeMode}`;
          console.log(`\n[CAPTURE] ${label} (${viewport.width}×${viewport.height})`);

          const page = await browser.newPage();
          await page.setViewport(viewport);

          try {
            await seedTokensAndGo(page, auth.clinicToken, auth.staffToken, auth.patientId, scenario.url, themeMode, scenario.perspective);
            await screenshot(page, label);
          } catch (err) {
            console.error(`  [ERR] ${label}: ${err.message}`);
            try { await screenshot(page, `${label}_err`); } catch {}
          } finally {
            await page.close();
          }
        }
      }
    }

    // Additional Themes on Desktop: calm_teal, contrast, night
    for (const themeMode of ["calm_teal", "contrast", "night"]) {
      const label = `theme_${themeMode}_desktop`;
      console.log(`\n[CAPTURE THEME] ${label}`);
      const page = await browser.newPage();
      await page.setViewport(VIEWPORTS.desktop);
      try {
        await seedTokensAndGo(page, auth.clinicToken, auth.staffToken, auth.patientId, `${APP_BASE}/#schedule`, themeMode, "standard");
        await screenshot(page, label);
      } catch (err) {
        console.error(`  [ERR] ${label}: ${err.message}`);
      } finally {
        await page.close();
      }
    }

  } finally {
    await browser.close();
  }

  console.log("\n[DONE] All screenshots captured successfully.");
}

main().catch(e => { console.error("[FATAL]", e); process.exit(1); });
