/**
 * capture-production-4state-proofs.mjs
 * Production-grade Playwright 4-State Visual Proof Capture Engine
 */

import fs, { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_SCREENSHOTS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f";

for (const dir of [DOCS_SCREENSHOTS_DIR, BRAIN_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const edgePath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

if (!edgePath) {
  console.error("Browser executable not found!");
  process.exit(1);
}

console.log(`[BROWSER] Launching browser at: ${edgePath}`);
const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
  }, theme);
  await page.waitForTimeout(400);
}

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicSettings: {
    profile: {
      organizationId: "c-1",
      clinicName: "DENTE Стоматология",
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, ул. Тверская 1",
      inn: "7701234567",
      mode: "small_clinic",
      updatedAt: new Date().toISOString(),
    },
    chairs: [
      {
        id: "chair-1",
        organizationId: "c-1",
        name: "Кабинет 1 (Терапия)",
        active: true,
        notes: null,
        room: "1",
        specialization: "therapist",
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
      {
        id: "chair-2",
        organizationId: "c-1",
        name: "Кабинет 2 (Хирургия)",
        active: true,
        notes: null,
        room: "2",
        specialization: "surgery",
        hasXraySensor: true,
        hasMicroscope: false,
        hasSurgeryKit: true,
      },
      {
        id: "chair-3",
        organizationId: "c-1",
        name: "Кабинет 3 (Ортопедия)",
        active: true,
        notes: null,
        room: "3",
        specialization: "orthopedist",
        hasXraySensor: false,
        hasMicroscope: false,
        hasSurgeryKit: false,
      },
    ],
    staff: [
      {
        id: "doc-1",
        organizationId: "c-1",
        fullName: "Д-р Ковалев С.П.",
        role: "doctor",
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: "c-1",
        fullName: "Д-р Смирнова Е.В.",
        role: "doctor",
        active: true,
        color: "#0284c7",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  patients: [
    {
      id: "p-1",
      organizationId: "c-1",
      fullName: "Иванов Иван Иванович",
      status: "active",
      phone: "+7 (999) 123-45-67",
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "p-2",
      organizationId: "c-1",
      fullName: "Петрова Анна Сергеевна",
      status: "active",
      phone: "+7 (999) 765-43-21",
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "c-1",
      patientId: "p-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      serviceTitle: "Лечение пульпита 2.4 (Кариес/Эндо)",
      notes: "Острая боль",
    },
    {
      id: "app-2",
      organizationId: "c-1",
      patientId: "p-2",
      doctorUserId: "doc-2",
      doctorId: "doc-2",
      chairId: "chair-2",
      status: "confirmed",
      startsAt: `${todayDate}T11:30:00.000Z`,
      endsAt: `${todayDate}T12:30:00.000Z`,
      startTime: `${todayDate}T11:30:00.000Z`,
      endTime: `${todayDate}T12:30:00.000Z`,
      serviceTitle: "Установка имплантата Straumann BLX",
      notes: null,
    },
  ],
  inventory: {
    items: [],
    lowStock: [],
  },
  finance: {
    todayRevenueRub: 145000,
    monthRevenueRub: 2850000,
  },
};

const capturedFiles = [];

const TARGET_SCREENS = [
  {
    prefix: "01_schedule_grid_emergency_buffer",
    name: "01. Schedule Multi-Chair Grid with CITO Acute Pain Emergency Reserve",
    url: "http://127.0.0.1:5173/#schedule",
    setup: async (page) => {
      await page.waitForSelector('.schedule-subnav-panel, [data-testid="schedule-timeline-container"], .appointment-card', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(1000);
    },
    all4States: true,
  },
  {
    prefix: "02_treatment_plan_4stages",
    name: "02. 4-Stage Clinical Treatment Plan (Hygiene, Endo, Surgery, Ortho)",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-plan-comparator-modal-btn"]');
      if (await btn.isVisible()) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await page.waitForTimeout(600);
      }
    },
    all4States: true,
  },
  {
    prefix: "03_billing_1c_export_modal",
    name: "03. Patient Billing with 1C XML Export Modal",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-billing-1c-export-modal-btn"]').or(page.locator('[data-testid="open-fiscal-modal-btn"]')).first();
      if (await btn.isVisible()) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        const modal = page.locator('[data-testid="fiscal-receipt-54fz-modal"]');
        const oneCTab = modal.locator('button:has-text("1С:Экспорт XML")').or(modal.locator('[data-testid="tab-oneC"]')).first();
        if (await oneCTab.isVisible()) {
          await oneCTab.click();
          await page.waitForTimeout(500);
        }
      }
    },
    all4States: true,
  },
  {
    prefix: "04_odontogram_psr",
    name: "04. Odontogram with 1-Click PSR Status Assessment",
    url: "http://127.0.0.1:5173/#odontogram-studio",
    setup: async (page) => {
      await page.waitForTimeout(600);
    },
    all4States: true,
  },
  {
    prefix: "05_trg_cephalometrics",
    name: "05. TRG Cephalometric Analysis Canvas (Empty Honest Dropzone 0%)",
    url: "http://127.0.0.1:5173/#clinical-modals-studio?modal=trg&state=empty",
    setup: async (page) => {
      await page.waitForTimeout(800);
    },
    all4States: true,
  },
  {
    prefix: "05_trg_cephalometrics_loaded",
    name: "05. TRG Cephalometric Analysis Canvas with 16 Anatomical Landmarks & Reference X-Ray",
    url: "http://127.0.0.1:5173/#clinical-modals-studio?modal=trg&loaded=true",
    setup: async (page) => {
      await page.waitForTimeout(800);
    },
    all4States: true,
  },
  {
    prefix: "06_sanpin_registers_12tabs",
    name: "06. SanPiN 12-Tab Production Control Center",
    url: "http://127.0.0.1:5173/#clinical-modals-studio?modal=sanpin",
    setup: async (page) => {
      await page.waitForTimeout(800);
    },
    all4States: true,
  },
  {
    prefix: "07_cbct_mpr_viewer",
    name: "07. 3D CBCT MPR Multi-Planar Reconstruction (Romexis/Ez3D-i Orthogonal Viewer)",
    url: "http://127.0.0.1:5173/#clinical-modals-studio?modal=cbct",
    setup: async (page) => {
      await page.waitForTimeout(800);

      // Feed real DICOM slices from Barabash Svetlana Viktorovna
      const dicomDir = "C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data";
      if (fs.existsSync(dicomDir)) {
        const files = fs.readdirSync(dicomDir)
          .filter((f) => f.endsWith(".dcm"))
          .slice(150, 250) // 100 central clinical slices covering maxilla, mandible, roots and sinuses
          .map((f) => path.join(dicomDir, f));

        if (files.length > 0) {
          const fileInput = page.locator('[data-testid="cbct-dicom-files-input"]');
          if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(files);
            await page.waitForTimeout(2000);
          }
        }
      }
    },
    all4States: true,
  },
  {
    prefix: "08_radiology_dicom_viewer",
    name: "08. 2D Dental Radiology & DICOM Viewer (Tooth 16, Sinus maxillaris, Delicate Pin)",
    url: "http://127.0.0.1:5173/#clinical-modals-studio?modal=viewer",
    setup: async (page) => {
      await page.waitForTimeout(800);
    },
    all4States: true,
  },
  {
    prefix: "08_radiology_dropzone",
    name: "08. 2D Dental Radiology Dropzone (Dark Graphite Radiation Protection Theme)",
    url: "http://127.0.0.1:5173/#clinical-modals-studio?modal=dropzone",
    setup: async (page) => {
      await page.waitForTimeout(800);
    },
    all4States: true,
  },
];

const CONFIGS = [
  {
    key: "pc_light",
    label: "PC Light (1920x1080)",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5,
    theme: "light",
    isMobile: false,
  },
  {
    key: "pc_dark",
    label: "PC Dark (1920x1080)",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5,
    theme: "dark",
    isMobile: false,
  },
  {
    key: "mobile_light",
    label: "Mobile Light (390x844)",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.5,
    theme: "light",
    isMobile: true,
  },
  {
    key: "mobile_dark",
    label: "Mobile Dark (390x844)",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.5,
    theme: "dark",
    isMobile: true,
  },
];

for (const screen of TARGET_SCREENS) {
  console.log(`\n=============================================================`);
  console.log(`📸 CAPTURING: ${screen.name}`);
  console.log(`=============================================================`);

  for (const cfg of CONFIGS) {
    const context = await browser.newContext({
      viewport: cfg.viewport,
      deviceScaleFactor: cfg.deviceScaleFactor,
      isMobile: cfg.isMobile,
      hasTouch: cfg.isMobile,
    });

    const page = await context.newPage();

    await page.route("**/api/dashboard**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    });

    await page.route("**/api/schedule**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.appointments),
      });
    });

    // Inject bypass tokens & offline mode to ensure completely clean, unblocked rendering
    await page.addInitScript(() => {
      window.localStorage.setItem("dente_active_session_token", "mock-session-token");
      window.localStorage.setItem("dente_user_role", "doctor");
      window.localStorage.setItem("dente_offline_mode", "true");
      window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
      window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
      window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      window.localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "doctor",
          selectedSpecialty: "therapist",
          selectedPatientId: "PAT-001",
          onboardingDismissed: true,
        }),
      );
    });

    try {
      await page.goto(screen.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await applyTheme(page, cfg.theme);
      await page.waitForTimeout(400);

      // Perform screen specific setup / trigger
      await screen.setup(page);
      await page.waitForTimeout(600);

      const fileName = `${screen.prefix}_${cfg.key}.png`;
      const filePath = path.join(DOCS_SCREENSHOTS_DIR, fileName);
      await page.screenshot({ path: filePath, fullPage: false });
      capturedFiles.push(fileName);
      console.log(`  ✓ Saved: ${fileName} (${(statSync(filePath).size / 1024).toFixed(1)} KB)`);

      // Also copy to brain
      const brainPath = path.join(BRAIN_DIR, fileName);
      copyFileSync(filePath, brainPath);

      // Also write canonical short alias if pc_dark
      if (cfg.key === "pc_dark") {
        const canonicalName = `${screen.prefix}.png`;
        const canonicalPath = path.join(DOCS_SCREENSHOTS_DIR, canonicalName);
        await page.screenshot({ path: canonicalPath, fullPage: false });
        copyFileSync(canonicalPath, path.join(BRAIN_DIR, canonicalName));
        capturedFiles.push(canonicalName);
        console.log(`  ✓ Saved canonical: ${canonicalName}`);
      }
    } catch (err) {
      console.error(`  ✗ Error capturing ${screen.prefix} [${cfg.key}]:`, err.message);
    } finally {
      await context.close();
    }
  }
}

await browser.close();

console.log(`\n=============================================================`);
console.log(`[DONE] Captured ${capturedFiles.length} screenshots successfully!`);
console.log(`=============================================================`);
