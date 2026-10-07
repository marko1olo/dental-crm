const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const CONV_ID = "398399b7-64b3-4f29-a67e-259e00f77dbc";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clean clinic session via API...");
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `doctor-patientsview-${uniqueId}@dente.local`,
      password: "Password123!",
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

  let firstPatientId = null;

  try {
    const patientsToCreate = [
      {
        fullName: "Волков Сергей Александрович",
        phone: "+7 (916) 123-45-67",
        birthDate: "1984-05-12",
        notes: "Кариес 1.6, соматически здоров, ДМС Ресо-Мед",
      },
      {
        fullName: "Соколова Анна Михайловна",
        phone: "+7 (925) 888-99-00",
        birthDate: "1991-09-24",
        notes: "Ортодонтическое лечение, элайнеры",
      },
      {
        fullName: "Морозов Игорь Владимирович",
        phone: "+7 (903) 555-12-34",
        birthDate: "1976-11-03",
        notes: "Периодонтит 3.6, аллергия на сульфаниламиды",
      },
    ];

    for (let i = 0; i < patientsToCreate.length; i++) {
      const pRes = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers,
        body: JSON.stringify(patientsToCreate[i]),
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (i === 0) firstPatientId = pData.id;
        console.log(`[Provisioning] Created patient ${i + 1}: ${pData.id} (${pData.fullName})`);
      }
    }
  } catch (e) {
    console.warn("[Provisioning] Warning seeding patients:", e.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId: firstPatientId,
  };
}

async function run() {
  console.log("=== CAPTURING DECOMPOSED PATIENTSVIEW PC SCREENSHOTS VIA EDGE PLAYWRIGHT ===");

  const auth = await provisionSession();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  const page = await context.newPage();

  console.log("[Playwright-Edge] Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });

  await page.evaluate(({ ct, st, uid, pid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_session_token", st);
    localStorage.setItem("dente_active_user_id", uid);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");

    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");

    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));

    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      onboardingDismissed: true,
      onboardingStep: "done",
      version: 1,
    }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedPatientId: pid,
      onboardingDismissed: true,
      onboardingStep: "done",
    }));

    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка CRM") && (document.querySelector(".workspace-shell") || document.querySelector("nav") || text.includes("ДЕНТЕ"));
  }, { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Navigate to Patients view via hash
  console.log("[Playwright-Edge] Navigating to Patients View (#patients)...");
  await page.evaluate(() => {
    window.location.hash = "patients";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForTimeout(1000);

  await page.waitForSelector("#patients, .patients-panel", { timeout: 20000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector("#patients, .patients-panel");
    if (!panel) return false;
    const isBusy = panel.getAttribute("aria-busy") === "true";
    const text = panel.innerText || "";
    return !isBusy && !text.includes("загрузка") && (text.includes("Волков") || text.includes("Создать нового") || document.querySelector(".patient-card, table, tr, article, input[type='search']"));
  }, { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Clean up any remaining overlays/toasts
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const captured = [];

  // Capture LIGHT MODE
  console.log("[Playwright-Edge] Capturing proof_patients_registry_pc_light.png...");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.setItem("dente_theme_mode", "light");
  });
  await page.waitForTimeout(500);

  const lightName = "proof_patients_registry_pc_light.png";
  const lightDocs = path.join(OUT_DIR, lightName);
  const lightBrain = path.join(BRAIN_DIR, lightName);
  await page.screenshot({ path: lightDocs, fullPage: false });
  fs.copyFileSync(lightDocs, lightBrain);
  const lightStats = fs.statSync(lightDocs);
  const lightHash = crypto.createHash("md5").update(fs.readFileSync(lightDocs)).digest("hex");
  captured.push({ name: lightName, size: lightStats.size, md5: lightHash, path: lightDocs });
  console.log(`[Captured] ${lightName} -> ${lightStats.size} bytes (MD5: ${lightHash})`);

  // Capture DARK MODE
  console.log("[Playwright-Edge] Capturing proof_patients_registry_pc_dark.png...");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    localStorage.setItem("dente_theme_mode", "dark");
  });
  await page.waitForTimeout(500);

  const darkName = "proof_patients_registry_pc_dark.png";
  const darkDocs = path.join(OUT_DIR, darkName);
  const darkBrain = path.join(BRAIN_DIR, darkName);
  await page.screenshot({ path: darkDocs, fullPage: false });
  fs.copyFileSync(darkDocs, darkBrain);
  const darkStats = fs.statSync(darkDocs);
  const darkHash = crypto.createHash("md5").update(fs.readFileSync(darkDocs)).digest("hex");
  captured.push({ name: darkName, size: darkStats.size, md5: darkHash, path: darkDocs });
  console.log(`[Captured] ${darkName} -> ${darkStats.size} bytes (MD5: ${darkHash})`);

  await context.close();
  await browser.close();

  // Validate results
  for (const c of captured) {
    if (c.size < 40000) {
      throw new Error(`[BURDEN OF PROOF ERROR] Screenshot ${c.name} is under 40KB (${c.size} bytes)!`);
    }
  }
  if (captured[0].md5 === captured[1].md5) {
    throw new Error("[BURDEN OF PROOF ERROR] Light and Dark screenshots have identical MD5 hashes!");
  }

  console.log("=== ALL PATIENTSVIEW SCREENSHOTS CAPTURED AND VERIFIED SUCCESSFULLY ===");
  console.log(JSON.stringify(captured, null, 2));
}

run().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
