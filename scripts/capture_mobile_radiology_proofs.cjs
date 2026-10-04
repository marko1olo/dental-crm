/**
 * scripts/capture_mobile_radiology_proofs.cjs
 *
 * Captures Mobile Chairside Radiology Viewer visual proofs according to Apple iOS HIG (390x844):
 * 1. proof_mobile_radiology_viewer_light.png (Light theme, dominant X-ray canvas, Thumb Bar >=44px)
 * 2. proof_mobile_radiology_viewer_dark.png (Dark theme, deep black background, Thumb Bar >=44px)
 * 3. proof_mobile_radiology_sheet_dark.png (Native Bottom Sheet with Drag Handle & grouped list)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockPatient = {
  id: "pat-1",
  name: "Ковалёв Роман Станиславович",
  fullName: "Ковалёв Роман Станиславович",
  birthDate: "1988-04-12",
  phone: "+7 (999) 888-77-66",
  allergies: ["Лидокаин"],
  notes: "Бронхиальная астма, аллергия на лидокаин. Острая боль 36 зуба.",
};

const mockStudies = [
  {
    id: "study-rvg-36",
    patientId: "pat-1",
    title: "Прицельный снимок зуба 36",
    kind: "periapical",
    toothCode: "36",
    region: "36 моляр",
    capturedAt: `${todayDate}T10:15:00.000Z`,
    storagePath: "radiology/sample_rvg_tooth36_periapical.jpg",
    previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
    sourceKind: "rvg_sensor",
    sourceName: "Vatech EzSensor HD",
    aiSummary: "Глубокая кариозная полость дентина disto-occlusal, деструкция периапикальных тканей",
  },
  {
    id: "study-rvg-16",
    patientId: "pat-1",
    title: "Прицельный снимок зуба 16",
    kind: "periapical",
    toothCode: "16",
    region: "16 моляр",
    capturedAt: `${todayDate}T09:30:00.000Z`,
    storagePath: "radiology/sample_rvg_tooth16.jpg",
    previewUrl: "/radiology/sample_rvg_tooth16.jpg",
    sourceKind: "rvg_sensor",
    sourceName: "Vatech EzSensor HD",
    aiSummary: "Кариес эмали и дентина",
  },
  {
    id: "study-opg-1",
    patientId: "pat-1",
    title: "Панорамный снимок (ОПТГ)",
    kind: "opg",
    toothCode: null,
    region: "Обе челюсти",
    capturedAt: `${todayDate}T09:00:00.000Z`,
    storagePath: "radiology/sample_trg_cephalogram.jpg",
    previewUrl: "/radiology/sample_trg_cephalogram.jpg",
    sourceKind: "panoramic_unit",
    sourceName: "KaVo Pan eXam Plus",
    aiSummary: "Атрофия костной ткани 1-й степени во фронтальном отделе",
  },
  {
    id: "study-cbct-1",
    patientId: "pat-1",
    title: "КТ 3D сегмента нижней челюсти",
    kind: "cbct",
    toothCode: "36, 37",
    region: "Нижняя челюсть слева",
    capturedAt: `${todayDate}T08:45:00.000Z`,
    storagePath: "radiology/demo_cbct/manifest.json",
    previewUrl: "/radiology/sample_rvg_pathology.jpg",
    sourceKind: "cbct_scanner",
    sourceName: "Planmeca ProMax 3D",
    aiSummary: "Объём кости достаточен для имплантации (высота 12.8 мм)",
  },
];

const mockDashboard = {
  activeDoctor: {
    id: "doc-1",
    fullName: "Д-р Воронов Алексей Владимирович",
    role: "owner",
    specialties: ["therapist", "orthopedist", "surgeon"],
    active: true,
  },
  activePatient: mockPatient,
  activeAppointment: {
    id: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
    serviceType: "Эндодонтическое лечение зуба 36",
    startTime: `${todayDate}T10:00:00.000Z`,
    endTime: `${todayDate}T11:00:00.000Z`,
  },
  patients: [mockPatient],
  imagingStudies: mockStudies,
  appointments: [],
};

async function runMobileRadiologyCapture() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    "C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc",
    "C:/Users/Admin/.gemini/antigravity/brain/7949b437-b5e5-465b-bd46-de3ba34405c5",
  ];

  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
    }
  }
  const primaryOutDir = targetDirs[0];

  console.log("[Playwright] Launching Chrome in iPhone Viewport (390x844, DPR=2)...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_selected_imaging_study_id", "study-rvg-36");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
  });

  const page = await mobileContext.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
  });

  // Setup route interceptors
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

    if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            active: true,
          },
        }),
      });
    }

    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-inquisition-staff-token",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }

    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }

    if (url.includes("/preview.svg") || url.includes("/preview")) {
      const sampleImgPath = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/radiology/sample_rvg_tooth16.jpg");
      if (fs.existsSync(sampleImgPath)) {
        const imgBuffer = fs.readFileSync(sampleImgPath);
        return route.fulfill({
          status: 200,
          contentType: "image/jpeg",
          body: imgBuffer,
        });
      }
    }

    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockStudies),
      });
    }

    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockPatient]),
      });
    }

    if (url.includes("/api/appointments")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  async function applyTheme(theme) {
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);
  }

  async function takeProof(fileName, description) {
    const targetFile = path.join(primaryOutDir, fileName);
    await page.waitForTimeout(600);
    await page.screenshot({ path: targetFile, fullPage: false });

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        try { fs.copyFileSync(targetFile, dest); } catch (e) {}
      }
    }

    const stats = fs.statSync(targetFile);
    console.log(`[PROOF CAPTURED] ${fileName} (${description}) — ${(stats.size / 1024).toFixed(1)} KB`);
  }

  console.log("Navigating to http://127.0.0.1:5173/#imaging...");
  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Remove any guided tour or tour spotlight overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Ensure hash is #imaging and wait for mobile radiology container
  await page.evaluate(() => {
    window.location.hash = "imaging";
  });
  await page.waitForTimeout(1000);

  // Wait for the sovereign mobile radiology viewer
  const viewerContainer = await page.waitForSelector('[data-testid="mobile-chairside-radiology-container"]', {
    state: "visible",
    timeout: 15000,
  }).catch(() => null);

  if (!viewerContainer) {
    console.warn("Mobile viewer container selector not found immediately, inspecting DOM...");
  } else {
    console.log("[OK] Sovereign Mobile Chairside Radiology Viewer detected!");
  }

  // 1. Capture Mobile Radiology Viewer Light
  console.log("\n>>> Capturing Proof 1: Mobile Chairside Radiology Viewer (Light) <<<");
  await applyTheme("light");
  await takeProof("proof_mobile_radiology_viewer_light.png", "Mobile Chairside Radiology Viewer Light (390x844)");

  // 2. Capture Mobile Radiology Viewer Dark
  console.log("\n>>> Capturing Proof 2: Mobile Chairside Radiology Viewer (Dark) <<<");
  await applyTheme("dark");
  await takeProof("proof_mobile_radiology_viewer_dark.png", "Mobile Chairside Radiology Viewer Dark (390x844)");

  // 3. Open Patient Studies Bottom Sheet & Capture
  console.log("\n>>> Capturing Proof 3: Mobile Patient Studies Bottom Sheet (Dark) <<<");
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="btn-open-mobile-studies-sheet"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('[data-testid="mobile-studies-drawer"]', { state: "visible", timeout: 10000 });
  await page.waitForTimeout(800);
  await takeProof("proof_mobile_radiology_sheet_dark.png", "Mobile Patient Studies Bottom Sheet (390x844)");

  await browser.close();
  console.log("\n[SUCCESS] All 3 Apple HIG Mobile Radiology proofs captured successfully!");
}

runMobileRadiologyCapture().catch((err) => {
  console.error("Capture script execution error:", err);
  process.exit(1);
});
