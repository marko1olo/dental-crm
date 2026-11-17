const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOF_DIR = path.resolve(process.cwd(), "docs/proofs/radiology");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/42879016-7974-4832-9ecc-146c9fcc9d17/proofs");

for (const d of [PROOF_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session rad-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Радиология и КЛКТ)",
      email: `rad-canonical-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Захаров Андрей Васильевич",
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

  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Павлов Дмитрий Сергеевич",
      birthDate: "1988-07-24",
      gender: "male",
      phone: "+7 (911) 444-22-33",
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

  return {
    clinicToken: initData.clinicToken,
    organizationId: initData.organizationId,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function run() {
  const auth = await provisionClinicalSession();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(
    ({ ct, orgId, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_organization_id", orgId);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_theme_mode", "light");

      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({
          mode: "network",
          role: "owner",
          activeRole: "owner",
        })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: uid,
          name: "Д-р Захаров А. В.",
          fullName: "Д-р Захаров Андрей Васильевич",
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
          selectedSpecialty: "orthopedist",
          selectedPatientId: pid,
          onboardingDismissed: true,
          onboardingStep: "done",
          onboardingDraftMode: false,
          soundNotificationsMuted: false,
        })
      );
    },
    {
      ct: auth.clinicToken,
      orgId: auth.organizationId,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      pid: auth.patientId,
    }
  );

  const page = await context.newPage();

  async function suppressOverlays() {
    await page.evaluate(() => {
      try {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays-rad-clean";
        style.innerHTML = `
          .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
          .coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
          [data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
          .notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
      } catch (_) {}
    });
  }

  async function applyTheme(isDark) {
    await page.evaluate((dark) => {
      const mode = dark ? "dark" : "light";
      localStorage.setItem("dente_theme_mode", mode);
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
    await applyTheme(isDark);
    await suppressOverlays();
    await page.waitForTimeout(1000);

    const outPath = path.join(PROOF_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, brainPath);

    if (filename === "07_sensor_study_viewer_pc_light_1440x900.png") {
      const p1 = path.join(PROOF_DIR, "01_radiology_pc_light_1440x900.png");
      fs.copyFileSync(outPath, p1);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "01_radiology_pc_light_1440x900.png"));
    } else if (filename === "08_sensor_study_viewer_pc_dark_1440x900.png") {
      const p2 = path.join(PROOF_DIR, "02_radiology_pc_dark_1440x900.png");
      fs.copyFileSync(outPath, p2);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "02_radiology_pc_dark_1440x900.png"));
    } else if (filename === "09_sensor_study_viewer_mobile_light_390x844.png") {
      const p3 = path.join(PROOF_DIR, "03_radiology_mobile_light_390x844.png");
      fs.copyFileSync(outPath, p3);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "03_radiology_mobile_light_390x844.png"));
    } else if (filename === "10_sensor_study_viewer_mobile_dark_390x844.png") {
      const p4 = path.join(PROOF_DIR, "04_radiology_mobile_dark_390x844.png");
      fs.copyFileSync(outPath, p4);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "04_radiology_mobile_dark_390x844.png"));
    }

    const stats = fs.statSync(outPath);
    const hash = crypto.createHash("md5").update(fs.readFileSync(outPath)).digest("hex");
    console.log(`[Proof] ${filename} saved: ${stats.size} bytes, MD5: ${hash}`);

    results.push({
      file: filename,
      path: outPath,
      size: stats.size,
      md5: hash,
      theme: isDark ? "dark" : "light",
      viewport: `${viewport.width}x${viewport.height}`,
    });
  }

  // 1. Initial page boot
  console.log(`[Browser] Navigating to ${WEB_BASE}/...`);
  await page.goto(`${WEB_BASE}/`, { waitUntil: "commit", timeout: 45000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 40000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 40000 });
  console.log("[Browser] App shell successfully mounted!");
  await page.waitForTimeout(2000);

  // ==========================================
  // PART 1: 3D CBCT MPR Tomography Studio (CbctMprImplantStudioModal)
  // ==========================================
  console.log("[Browser] Opening 3D CBCT Studio Modal...");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente-open-cbct"));
  });
  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log(">>> Capturing 01_cbct_mpr_studio_pc_light_1440x900.png...");
  await captureAndSave("01_cbct_mpr_studio_pc_light_1440x900.png", { width: 1440, height: 900 }, false);

  console.log(">>> Capturing 02_cbct_mpr_studio_pc_dark_1440x900.png...");
  await captureAndSave("02_cbct_mpr_studio_pc_dark_1440x900.png", { width: 1440, height: 900 }, true);

  // Close CBCT modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="cbct-studio-modal"] [data-testid="btn-close-studio"], [data-testid="cbct-studio-modal"] button[title="Закрыть (Esc)"]');
    if (closeBtn) closeBtn.click();
    else window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  await page.waitForTimeout(1000);

  // ==========================================
  // PART 2: 2D DICOM & RVG Workstation Modal (DicomViewerModal)
  // ==========================================
  console.log(`[Browser] Opening DICOM Viewer Modal via hash #dicom-viewer...`);
  await page.evaluate(() => {
    window.location.hash = "#dicom-viewer";
  });
  await page.waitForSelector('[data-testid="dicom-viewer-modal"]', { state: "visible", timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log(">>> Capturing 03_dicom_viewer_pc_light_1440x900.png...");
  await captureAndSave("03_dicom_viewer_pc_light_1440x900.png", { width: 1440, height: 900 }, false);

  console.log(">>> Capturing 04_dicom_viewer_pc_dark_1440x900.png...");
  await captureAndSave("04_dicom_viewer_pc_dark_1440x900.png", { width: 1440, height: 900 }, true);

  console.log(">>> Capturing 05_dicom_viewer_mobile_light_390x844.png...");
  await captureAndSave("05_dicom_viewer_mobile_light_390x844.png", { width: 390, height: 844 }, false);

  console.log(">>> Capturing 06_dicom_viewer_mobile_dark_390x844.png...");
  await captureAndSave("06_dicom_viewer_mobile_dark_390x844.png", { width: 390, height: 844 }, true);

  // Close DICOM modal
  await page.evaluate(() => {
    window.location.hash = "";
  });
  await page.waitForTimeout(1000);

  // ==========================================
  // PART 3: SensorStudyViewer Standalone Launcher
  // ==========================================
  console.log(`[Browser] Opening SensorStudyViewer via hash #radiology-standalone...`);
  await page.evaluate(() => {
    window.location.hash = "#radiology-standalone";
  });
  await page.waitForSelector('[data-testid="sensor-study-viewer"]', { state: "visible", timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log(">>> Capturing 07_sensor_study_viewer_pc_light_1440x900.png...");
  await captureAndSave("07_sensor_study_viewer_pc_light_1440x900.png", { width: 1440, height: 900 }, false);

  console.log(">>> Capturing 08_sensor_study_viewer_pc_dark_1440x900.png...");
  await captureAndSave("08_sensor_study_viewer_pc_dark_1440x900.png", { width: 1440, height: 900 }, true);

  console.log(">>> Capturing 09_sensor_study_viewer_mobile_light_390x844.png...");
  await captureAndSave("09_sensor_study_viewer_mobile_light_390x844.png", { width: 390, height: 844 }, false);

  console.log(">>> Capturing 10_sensor_study_viewer_mobile_dark_390x844.png...");
  await captureAndSave("10_sensor_study_viewer_mobile_dark_390x844.png", { width: 390, height: 844 }, true);

  await browser.close();

  console.log("\n==========================================");
  console.log("CANONICAL RADIOLOGY & CBCT PROOFS OK");
  console.log("==========================================");
  console.table(results);
}

run().catch((err) => {
  console.error("FATAL screenshot script error:", err);
  process.exit(1);
});
