const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session imaging-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Лучевая диагностика)",
      email: `imaging-proof-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Смирнов Андрей Васильевич",
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

  // Seed Real Patient
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Иванов Сергей Павлович",
      birthDate: "1985-06-20",
      gender: "male",
      phone: "+7 (916) 333-22-11",
      allergies: "Без отягощенного аллергоанамнеза",
      chronicDiseases: "Здоров",
    }),
  });

  if (!pRes.ok) {
    throw new Error(`Patient create failed: ${await pRes.text()}`);
  }
  const pData = await pRes.json();
  const patientId = pData.patient?.id || pData.id;
  console.log(`[Provisioning] Created patient: ${patientId}`);

  // Seed Real Imaging Studies with FDI Tooth Codes into PostgreSQL
  const testStudies = [
    {
      patientId,
      kind: "periapical",
      title: "Прицельный снимок RVG #16 (Эндодонтия)",
      toothCode: "16",
      region: "posterior",
      sourceKind: "sensor_bridge",
      sourceName: "Vatech EzSensor HD",
      storagePath: "/data/pacs/sample_study_16.dcm",
      capturedAt: new Date(Date.now() - 3600000).toISOString(),
      aiSummary: "Разрежение костной ткани у дистального корня #16 d=2.4 мм",
    },
    {
      patientId,
      kind: "periapical",
      title: "Контрольный снимок RVG #26 (Обтурация)",
      toothCode: "26",
      region: "posterior",
      sourceKind: "folder_watch",
      sourceName: "Горячая папка Vatech",
      storagePath: "/data/pacs/sample_study_26.dcm",
      capturedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      patientId,
      kind: "opg",
      title: "Ортопантомограмма (ОПТГ цифровая первичная)",
      toothCode: null,
      region: "maxilla_mandible",
      sourceKind: "pacs",
      sourceName: "Sirona Orthophos XG",
      storagePath: "/data/pacs/sample_study_opg.dcm",
      capturedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      patientId,
      kind: "cbct",
      title: "КЛКТ 3D сегмент #46 (Планирование имплантации)",
      toothCode: "46",
      region: "mandible",
      sourceKind: "dicom_file",
      sourceName: "Planmeca ProMax 3D",
      storagePath: "/data/pacs/sample_study_46.dcm",
      capturedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  for (const study of testStudies) {
    const sRes = await fetch(`${API_BASE}/api/imaging/studies`, {
      method: "POST",
      headers,
      body: JSON.stringify(study),
    });
    if (!sRes.ok) {
      console.warn(`[Provisioning] Failed to create study ${study.title}: ${await sRes.text()}`);
    } else {
      const sJson = await sRes.json();
      console.log(`[Provisioning] Created study ${sJson.id} (${study.title})`);
    }
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function main() {
  const repoProofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/imaging");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d6b1394c-e20c-43e0-a0aa-d92c53cc347c");
  if (!fs.existsSync(repoProofDir)) fs.mkdirSync(repoProofDir, { recursive: true });
  if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

  const auth = await provisionClinicalSession();
  console.log("[Provisioning] Auth ready:", auth.ownerUserId);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(
    ({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");

      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: uid,
          name: "Д-р Смирнов А. В.",
          fullName: "Д-р Смирнов Андрей Васильевич",
          role: "owner",
          specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingStep: "done",
          onboardingDraftMode: false,
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({
          dismissed: true,
          step: "done",
          completed: true,
          onboardingDismissed: true,
          onboardingStep: "done",
          onboardingDraftMode: false,
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedSpecialty: "therapist",
          selectedPatientId: pid,
          onboardingDismissed: true,
          onboardingStep: "done",
          onboardingDraftMode: false,
          soundNotificationsMuted: false,
        })
      );
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({
          state: {
            clinicName: "Клиника ДЕНТЕ (Лучевая диагностика)",
            currentDoctor: { id: uid, fullName: "Д-р Смирнов А. В.", role: "owner" },
            flags: { disableTour: true },
          },
        })
      );
    },
    {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      pid: auth.patientId,
    }
  );

  const page = await context.newPage();

  console.log(`[Browser] Navigating to ${WEB_BASE}/#imaging...`);
  await page.goto(`${WEB_BASE}/#imaging`, { waitUntil: "domcontentloaded", timeout: 60000 });

  console.log("[Browser] Waiting for boot state to detach...");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});

  console.log("[Browser] Waiting for app-shell...");
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });

  await page.evaluate(() => {
    const nav = document.querySelector('a[href="#imaging"]');
    if (nav) nav.click();
    else window.location.hash = "#imaging";
  });

  console.log("[Browser] Waiting for imaging header/toolbar to mount...");
  await page.waitForSelector('.imaging-unified-toolbar, [data-testid="imaging-unified-toolbar"]', { timeout: 30000 });
  await page.waitForSelector('.imaging-patient-strip', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  async function applyTheme(isDark) {
    await page.evaluate((dark) => {
      const mode = dark ? "dark" : "light";
      localStorage.setItem("dente_theme_mode", mode);
      localStorage.setItem("dente_theme", mode);
      localStorage.setItem("theme", mode);
      document.documentElement.setAttribute("data-theme", mode);
      document.body.setAttribute("data-theme", mode);
      document.documentElement.dataset.theme = mode;
      if (dark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark");
        document.body.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      }
    }, isDark);
    await page.waitForTimeout(500);
  }

  const results = [];

  async function captureAndSave(filename, viewport, isDark) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(400);

    // Ensure we are on #imaging
    await page.evaluate(() => {
      if (window.location.hash !== "#imaging") {
        window.location.hash = "#imaging";
      }
    });

    await applyTheme(isDark);

    // Wait until boot state detached and imaging view visible
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
    await page.waitForSelector(".imaging-unified-toolbar, .imaging-viewport-container, .imaging-patient-strip, .mobile-radiology-viewport", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const repoPath = path.join(repoProofDir, filename);
    const brainPath = path.join(brainDir, filename);

    await page.screenshot({ path: repoPath, fullPage: false });
    fs.copyFileSync(repoPath, brainPath);

    const fileBuffer = fs.readFileSync(repoPath);
    const size = fileBuffer.length;
    const md5 = crypto.createHash("md5").update(fileBuffer).digest("hex");

    results.push({
      filename,
      size,
      md5,
      viewport: `${viewport.width}x${viewport.height}`,
      theme: isDark ? "dark" : "light",
      repoPath,
      brainPath,
    });
    console.log(`[CAPTURED] ${filename} (${viewport.width}x${viewport.height}, ${isDark ? "Dark" : "Light"}): ${size} bytes, MD5: ${md5}`);
  }

  console.log("[Browser] Waiting for imaging study rows to load...");
  await page.waitForSelector('.imaging-row, [data-testid="imaging-row"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // 1. Desktop Light (1440x900)
  console.log("\n=== 1. Desktop Light (1440x900) ===");
  await captureAndSave("imaging_pc_light.png", { width: 1440, height: 900 }, false);

  // 2. Desktop Dark (1440x900)
  console.log("\n=== 2. Desktop Dark (1440x900) ===");
  await captureAndSave("imaging_pc_dark.png", { width: 1440, height: 900 }, true);

  // 3. Mobile Dark (390x844)
  console.log("\n=== 3. Mobile Dark (390x844) ===");
  await captureAndSave("imaging_mobile_dark.png", { width: 390, height: 844 }, true);

  // 4. Mobile Light (390x844)
  console.log("\n=== 4. Mobile Light (390x844) ===");
  await captureAndSave("imaging_mobile_light.png", { width: 390, height: 844 }, false);

  await browser.close();

  console.log("\n=================== VERIFICATION AUDIT ===================");
  let allValid = true;
  for (const r of results) {
    const isOk = r.size >= 40960; // >= 40 KB
    console.log(`[PROOF] ${r.filename}: ${r.size} bytes (${(r.size / 1024).toFixed(1)} KB) | MD5: ${r.md5} | ${isOk ? "PASS (>=40KB)" : "FAIL (<40KB)"}`);
    if (!isOk) allValid = false;
  }
  console.log(`==========================================================`);
  console.log(`Final Status: ${allValid ? "ALL 4 SCREENSHOTS PASS INTEGRITY GATE" : "FAILURES DETECTED"}`);

  if (!allValid) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Capture execution failed:", err);
  process.exit(1);
});
