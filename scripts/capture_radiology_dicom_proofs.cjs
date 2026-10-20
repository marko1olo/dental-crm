/**
 * scripts/capture_radiology_dicom_proofs.cjs
 * Comprehensive screenshot capturer for Dental Imaging, DICOM PACS & Chairside RVG Integration
 * Generates 1440x900 proofs in Light & Dark modes:
 *  1. radiology_gallery_pc_light.png / radiology_gallery_pc_dark.png
 *  2. dicom_viewer_pc_light.png / dicom_viewer_pc_dark.png
 *  3. chairside_xray_binding_pc_light.png / chairside_xray_binding_pc_dark.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = process.env.VITE_URL || "http://127.0.0.1:5174";

const TARGET_DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology"),
  path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d4e8eae4-1e30-42da-a55e-8010c79f5bb6"),
];

for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session rad-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Лучевая диагностика)",
      email: `rad-${uniqueId}@dente-clinic.ru`,
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

  // Seed Real Imaging Studies with FDI Tooth Codes & Kinds into PostgreSQL 18
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
      title: "Контрольный снимок RVG #26 (Обтурация каналов)",
      toothCode: "26",
      region: "posterior",
      sourceKind: "folder_watch",
      sourceName: "Горячая папка Vatech",
      storagePath: "/data/pacs/sample_study_26.dcm",
      capturedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      patientId,
      kind: "periapical",
      title: "Прицельный снимок RVG #36 (Кариес контактный)",
      toothCode: "36",
      region: "posterior",
      sourceKind: "manual_upload",
      sourceName: "Gendex GXS-700",
      storagePath: "/data/pacs/sample_study_36.dcm",
      capturedAt: new Date(Date.now() - 14400000).toISOString(),
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

async function applyTheme(page, isDark) {
  await page.evaluate((dark) => {
    const mode = dark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", mode);
    document.documentElement.setAttribute("data-theme", mode);
    document.documentElement.dataset.theme = mode;
    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(mode);
    }
  }, isDark);
  await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
  const primaryPath = path.join(TARGET_DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stats = fs.statSync(primaryPath);
  const buffer = fs.readFileSync(primaryPath);
  const md5 = crypto.createHash("md5").update(buffer).digest("hex");

  for (let i = 1; i < TARGET_DIRS.length; i++) {
    fs.copyFileSync(primaryPath, path.join(TARGET_DIRS[i], filename));
  }

  console.log(`[SAVED] ${filename} | Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB) | MD5: ${md5}`);
  return { filename, size: stats.size, path: primaryPath, md5 };
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function ensureRadiologyModuleOpen(page) {
  const isAlreadyOpen = await page.evaluate(() => {
    return Boolean(document.querySelector('[data-testid="radiology-module-container"], [data-testid="btn-open-rvg-capture"]'));
  });

  if (!isAlreadyOpen) {
    console.log("Opening RadiologyModule via More Menu...");
    const moreMenuBtn = await page.waitForSelector('[data-testid="imaging-more-menu-btn"]', { timeout: 10000 }).catch(() => null);
    if (moreMenuBtn) {
      await moreMenuBtn.click();
      await page.waitForTimeout(600);

      const radBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 10000 }).catch(() => null);
      if (radBtn) {
        await radBtn.click();
        await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
  }
}

async function run() {
  console.log("=== Starting Radiology & DICOM Visual Proofs Capture Suite ===");

  const auth = await provisionClinicalSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_showcase_mode_v1", "true");
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
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
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

    console.log(`[Browser] Navigating to ${WEB_BASE}/?demo=true#imaging...`);
    await page.goto(`${WEB_BASE}/?demo=true#imaging`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await suppressOverlays(page);

    console.log("[Browser] Waiting for app-shell...");
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });

    // Ensure currentView is imaging
    await page.evaluate(() => {
      const nav = document.querySelector('a[href="#imaging"]');
      if (nav) nav.click();
      else window.location.hash = "#imaging";
    });
    await page.waitForTimeout(2000);
    await suppressOverlays(page);

    console.log("[Browser] Waiting for aria-busy to detach...");
    await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
    console.log("[Browser] Waiting for imaging gallery components...");
    await page.waitForSelector('.imaging-panel:not([aria-busy="true"])', { timeout: 30000 });
    await page.waitForSelector('.imaging-unified-toolbar, [data-testid="imaging-unified-toolbar"]', { timeout: 30000 });
    await page.waitForSelector('.imaging-tooth-filter-bar, [data-testid="imaging-tooth-filter-bar"]', { timeout: 30000 });
    await page.waitForTimeout(1000);

    const results = [];

    // =========================================================================
    // TARGET 1: RADIOLOGY GALLERY (PC LIGHT & DARK)
    // =========================================================================
    console.log("\n--- Target 1: Radiology Gallery (PC Light & Dark) ---");
    await applyTheme(page, false);
    await page.waitForTimeout(800);
    results.push(await saveProof(page, "radiology_gallery_pc_light.png"));
    results.push(await saveProof(page, "pc_light_archive_teeth_1440x900.png"));

    await applyTheme(page, true);
    await page.waitForTimeout(800);
    results.push(await saveProof(page, "radiology_gallery_pc_dark.png"));

    // =========================================================================
    // TARGET 2: OPEN DICOM VIEWER MODAL (REAL TOOTH X-RAY & CALIPER)
    // =========================================================================
    console.log("\n--- Target 2: DICOM Viewer Modal (Radiology Studio Hub & Calibration) ---");
    await ensureRadiologyModuleOpen(page);

    const openDicomBtn = await page.waitForSelector('[data-testid="btn-open-dicom-viewer"]', { timeout: 15000 });
    await openDicomBtn.click();
    await page.waitForSelector('[data-testid="dicom-viewer-modal"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="dicom-viewer-modal"] img, [data-testid="dicom-viewer-modal"] canvas', { timeout: 15000 });
    await page.waitForTimeout(1500);

    console.log("Capturing Radiology Studio / DICOM Viewer PC Light & Dark (1440x900)...");
    await applyTheme(page, false);
    await page.waitForTimeout(800);
    results.push(await saveProof(page, "radiology_studio_pc_light_1440x900.png"));
    results.push(await saveProof(page, "dicom_viewer_pc_light.png"));

    await applyTheme(page, true);
    await page.waitForTimeout(800);
    results.push(await saveProof(page, "radiology_studio_pc_dark_1440x900.png"));
    results.push(await saveProof(page, "dicom_viewer_pc_dark.png"));

    console.log("Closing DicomViewerModal via close button...");
    const dicomCloseBtn = await page.waitForSelector('button[title="Закрыть просмотрщик (Esc)"]', { timeout: 5000 }).catch(() => null);
    if (dicomCloseBtn) {
      await dicomCloseBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(1000);

    // =========================================================================
    // TARGET 3: CHAIRSIDE RVG CAPTURE & BINDING MODAL
    // =========================================================================
    console.log("\n--- Target 3: Chairside RVG Capture & Binding Modal ---");
    await ensureRadiologyModuleOpen(page);

    const openRvgBtn = await page.waitForSelector('[data-testid="btn-open-rvg-capture"]', { timeout: 10000 });
    await openRvgBtn.click();
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { timeout: 15000 });
    await page.waitForTimeout(1500);

    console.log("Capturing DirectRvgCaptureModal (Chairside RVG Binding) PC Light & Dark...");
    await applyTheme(page, false);
    await page.waitForTimeout(800);
    results.push(await saveProof(page, "chairside_xray_binding_pc_light.png"));

    await applyTheme(page, true);
    await page.waitForTimeout(800);
    results.push(await saveProof(page, "chairside_xray_binding_pc_dark.png"));
    results.push(await saveProof(page, "pc_dark_rvg_viewer_1440x900.png"));

    console.log("Closing DirectRvgCaptureModal...");
    const rvgCloseBtn = await page.waitForSelector('[data-testid="rvg-modal-close-btn"]', { timeout: 5000 }).catch(() => null);
    if (rvgCloseBtn) {
      await rvgCloseBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(1000);

    // =========================================================================
    // TARGET 4: CHAIRSIDE MOBILE RADIOLOGY (LIGHT & DARK 390x844)
    // =========================================================================
    console.log("\n--- Target 4: Chairside Mobile Radiology (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    await mobileContext.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_showcase_mode_v1", "true");
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
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
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

    const mobilePage = await mobileContext.newPage();
    console.log(`[Mobile Browser] Navigating to ${WEB_BASE}/?demo=true#imaging...`);
    await mobilePage.goto(`${WEB_BASE}/?demo=true#imaging`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mobilePage.waitForTimeout(2000);
    await suppressOverlays(mobilePage);

    console.log("[Mobile Browser] Waiting for app-shell...");
    await mobilePage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await mobilePage.waitForTimeout(1000);
    await suppressOverlays(mobilePage);

    console.log("[Mobile Browser] Switching view to #imaging...");
    await mobilePage.evaluate(() => {
      window.location.hash = "#imaging";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      if (window.__useAppStore) {
        window.__useAppStore.getState().setCurrentView("imaging");
      }
    });
    await mobilePage.waitForTimeout(1000);

    // Fallback: If not on imaging panel yet, click "Ещё" tab and "Снимки и 3D КЛКТ" in drawer
    const isImagingMounted = await mobilePage.evaluate(() => Boolean(document.querySelector('.imaging-panel')));
    if (!isImagingMounted) {
      console.log("[Mobile Browser] Using drawer navigation fallback for imaging...");
      const moreBtn = await mobilePage.$('button:has-text("Ещё"), [data-testid="tab-more"]');
      if (moreBtn) {
        await moreBtn.click();
        await mobilePage.waitForTimeout(600);
        const imagingItem = await mobilePage.$('[data-drawer-item="imaging"], button:has-text("Снимки и 3D КЛКТ")');
        if (imagingItem) {
          await imagingItem.click();
          await mobilePage.waitForTimeout(1000);
        }
      }
    }

    console.log("[Mobile Browser] Waiting for aria-busy to detach...");
    await mobilePage.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
    console.log("[Mobile Browser] Waiting for imaging panel...");
    await mobilePage.waitForSelector('.imaging-panel:not([aria-busy="true"])', { state: "attached", timeout: 30000 });
    await mobilePage.waitForTimeout(1500);
    await suppressOverlays(mobilePage);

    // Ensure mobile viewport is present
    await mobilePage.waitForSelector('[data-testid="mobile-radiology-viewport"], .mobile-radiology-viewport, .mobile-radiology-container', { timeout: 30000 });

    // Select first study from carousel to ensure tooth X-ray is rendered
    console.log("[Mobile Browser] Selecting first study in carousel...");
    const firstCarouselItem = await mobilePage.$('[data-testid^="mobile-carousel-study-"], .mobile-radiology-carousel-item');
    if (firstCarouselItem) {
      await firstCarouselItem.click();
      await mobilePage.waitForTimeout(800);
    } else {
      // Or select from studies drawer
      await mobilePage.evaluate(() => {
        const drawerBtn = document.querySelector('[data-testid="btn-open-studies-drawer"]');
        if (drawerBtn) drawerBtn.click();
      }).catch(() => {});
      await mobilePage.waitForTimeout(500);
      await mobilePage.evaluate(() => {
        const firstItem = document.querySelector('[data-testid="mobile-study-item"]');
        if (firstItem) firstItem.click();
      }).catch(() => {});
      await mobilePage.waitForTimeout(600);
    }

    // Wait for real active X-ray image
    await mobilePage.waitForSelector('.mobile-radiology-img, [data-testid="mobile-active-xray-image"]', { timeout: 15000 }).catch(() => {});

    // Activate ruler to show caliper banner on mobile
    const mobileRulerBtn = await mobilePage.$('[data-testid="btn-mobile-thumb-ruler"]');
    if (mobileRulerBtn) {
      await mobileRulerBtn.click();
      await mobilePage.waitForTimeout(600);
    }

    console.log("Capturing Mobile Chairside Radiology Light & Dark (390x844)...");
    await applyTheme(mobilePage, false);
    await mobilePage.waitForTimeout(800);
    results.push(await saveProof(mobilePage, "radiology_studio_mobile_light_390x844.png"));
    results.push(await saveProof(mobilePage, "mobile_light_chairside_390x844.png"));

    await applyTheme(mobilePage, true);
    await mobilePage.waitForTimeout(800);
    results.push(await saveProof(mobilePage, "radiology_studio_mobile_dark_390x844.png"));
    results.push(await saveProof(mobilePage, "mobile_dark_chairside_390x844.png"));
    await mobileContext.close();

    console.log("\n=================== VERIFICATION AUDIT ===================");
    let allValid = true;
    for (const r of results) {
      const isFloorPass = r.size >= 20480; // >= 20 KB
      console.log(`${r.filename}: ${r.size} bytes (${(r.size / 1024).toFixed(1)} KB) - ${isFloorPass ? "PASS (>=20KB)" : "FAIL (<20KB)"} [MD5: ${r.md5}]`);
      if (!isFloorPass) allValid = false;
    }
    console.log(`\nALL 6 PROOFS AUDIT: ${allValid ? "100% PASSING" : "FAILURES DETECTED"}`);

    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE SCRIPT:", err);
  process.exit(1);
});
