/**
 * scripts/capture-documents-live-4state.mjs
 * Live 4-state visual audit screenshot runner for Documents & UKEP.
 * Fastify API (http://127.0.0.1:4100) + Vite Frontend (http://127.0.0.1:5173) + PostgreSQL 18.
 */

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("docs/proofs/documents");
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `docs-audit-${uniqueId}@dente-test.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  console.log(`[AUTH] Creating test clinic in live database: ${loginEmail}`);
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматология Дент-Премиум ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin,
    }),
  });

  if (!initRes.ok) {
    throw new Error(`setup/init failed ${initRes.status}: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
  });

  if (!unlockRes.ok) {
    throw new Error(`staff/unlock failed ${unlockRes.status}: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();
  const staffToken = unlockData.staffToken;

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": staffToken,
  };

  // Create patient
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Павлов Сергей Александрович",
      phone: "+7 (916) 123-45-67",
      birthDate: "1988-04-12",
      gender: "male",
    }),
  });
  if (!pRes.ok) {
    throw new Error(`patient create failed ${pRes.status}: ${await pRes.text()}`);
  }
  const patient = await pRes.json();

  // Create document
  const docRes = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId: patient.id,
      kind: "informed_consent",
      title: "Информированное добровольное согласие на терапевтическое лечение",
      customFields: {},
    }),
  });
  if (docRes.ok) {
    console.log("[SEED] Informed consent document seeded in PostgreSQL.");
  } else {
    console.warn(`[SEED WARN] Document creation returned ${docRes.status}: ${await docRes.text()}`);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken,
    patientId: patient.id,
    patientFullName: patient.fullName,
  };
}

async function applyTheme(page, mode) {
  await page.evaluate((theme) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("dente_theme_mode", theme);
    window.dispatchEvent(new CustomEvent("dente:theme-change", { detail: { theme } }));
  }, mode);
}

async function hideOverlays(page) {
  await page.evaluate(() => {
    const overlays = document.querySelectorAll(
      '#webpack-dev-server-client-overlay, vite-error-overlay, [class*="react-devtools"], [id*="react-devtools"]'
    );
    for (const el of overlays) el.remove();
  });
}

async function snap(page, fileName) {
  const filePath = path.join(OUT_DIR, fileName);
  await hideOverlays(page);
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: filePath, fullPage: false });
  const stat = statSync(filePath);
  console.log(`[CAPTURED] ${fileName}: ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB)`);
  if (stat.size < 20480) {
    console.warn(`[WARNING] ${fileName} is smaller than 20KB!`);
  }
}

async function main() {
  console.log("[1/3] Provisioning live clinic and test patient...");
  const creds = await provisionTestClinic();
  console.log(`[AUTH] Ready with clinicToken=${creds.clinicToken.slice(0, 10)}...`);

  console.log("[2/3] Launching Puppeteer browser...");
  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  };
  if (browserExecutable) {
    launchOptions.executablePath = browserExecutable;
  }
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    // Init script to inject localStorage
    await page.evaluateOnNewDocument(
      (ct, st, pid, pfname) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_session_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_user_role", "owner");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1"] }));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
          })
        );
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
          })
        );
      },
      creds.clinicToken,
      creds.staffToken,
      creds.patientId,
      creds.patientFullName
    );

    // ─── PC Viewport (1440x900) ──────────────────────────────────────────
    console.log("[3/3] Capturing 4-State Visual Proofs...");
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Documents Catalog PC Light
    await page.goto(`${APP_BASE}/#documents`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await applyTheme(page, "light");
    await snap(page, "01_documents_catalog_pc_light_1440x900.png");

    // 2. Documents Catalog PC Dark
    await applyTheme(page, "dark");
    await snap(page, "02_documents_catalog_pc_dark_1440x900.png");

    // 3. UKEP Signing Modal PC Light
    await page.goto(`${APP_BASE}/#ukep?patientId=${creds.patientId}&patientFullName=${encodeURIComponent(creds.patientFullName)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.waitForSelector('[data-testid="ukep-signing-modal"]', { timeout: 10000 }).catch(() => {});
    await applyTheme(page, "light");
    await snap(page, "05_documents_ukep_modal_pc_light_1440x900.png");

    // 4. UKEP Signing Modal PC Dark
    await applyTheme(page, "dark");
    await snap(page, "06_documents_ukep_modal_pc_dark_1440x900.png");

    // ─── Mobile Viewport (390x844) ────────────────────────────────────────
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // 5. Documents Catalog Mobile Light
    await page.goto(`${APP_BASE}/#documents`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await applyTheme(page, "light");
    await snap(page, "03_documents_catalog_mobile_light_390x844.png");

    // 6. Documents Catalog Mobile Dark
    await applyTheme(page, "dark");
    await snap(page, "04_documents_catalog_mobile_dark_390x844.png");

    // 7. UKEP Signing Modal Mobile Light
    await page.goto(`${APP_BASE}/#ukep?patientId=${creds.patientId}&patientFullName=${encodeURIComponent(creds.patientFullName)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.waitForSelector('[data-testid="ukep-signing-modal"]', { timeout: 10000 }).catch(() => {});
    await applyTheme(page, "light");
    await snap(page, "07_documents_ukep_modal_mobile_light_390x844.png");

    // 8. UKEP Signing Modal Mobile Dark
    await applyTheme(page, "dark");
    await snap(page, "08_documents_ukep_modal_mobile_dark_390x844.png");

    console.log("[SUCCESS] All 4-State Visual Proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL] Capture failed:", err);
  process.exit(1);
});
