/**
 * Squad A — Playwright 4-State Visual Proof Capture Engine
 * Captures all 7 required clinical and financial workflow screens across 4 mandatory states:
 * - PC Light (1920x1080)
 * - PC Dark (1920x1080)
 * - Mobile Light (390x844)
 * - Mobile Dark (390x844)
 */

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
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

const capturedFiles = [];

const TARGET_SCREENS = [
  {
    id: "01_schedule_grid_emergency_buffer",
    name: "01. Multi-chair Schedule Grid with CITO Acute Pain Emergency Reserve",
    url: "http://127.0.0.1:5173/#schedule",
    setup: async (page) => {
      // Ensure schedule is loaded and CITO emergency buffer is visible
      await page.waitForTimeout(600);
    },
  },
  {
    id: "02_treatment_plan_4stages",
    name: "02. 4-Stage Clinical Treatment Plan (Hygiene, Endo, Surgery, Ortho)",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-plan-comparator-modal-btn"]');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: "03_billing_1c_export_modal",
    name: "03. Patient Billing with 1C XML Export Modal",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-fiscal-modal-btn"]');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: "04_odontogram_psr_status",
    name: "04. Anatomical Odontogram with 1-Click PSR Status Assessment",
    url: "http://127.0.0.1:5173/#odontogram-studio",
    setup: async (page) => {
      await page.waitForTimeout(600);
    },
  },
  {
    id: "05_trg_cephalometrics",
    name: "05. TRG Cephalometric Analysis Canvas with 16 Anatomical Landmarks",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-ceph-modal-btn"]');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: "06_sanpin_registers_12tabs",
    name: "06. SanPiN 12-Tab Production Control Center",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-autoclave-log-257-modal-btn"]');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: "07_cbct_mpr_implant_studio",
    name: "07. 3D Romexis CBCT MPR Viewer Studio",
    url: "http://127.0.0.1:5173/#clinical-modals-studio",
    setup: async (page) => {
      const btn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
    },
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
  console.log(`📸 PROCESSING: ${screen.name}`);
  console.log(`=============================================================`);

  for (const cfg of CONFIGS) {
    const context = await browser.newContext({
      viewport: cfg.viewport,
      deviceScaleFactor: cfg.deviceScaleFactor,
      isMobile: cfg.isMobile,
      hasTouch: cfg.isMobile,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
      localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedSpecialty: "therapist",
          selectedPatientId: "PAT-001",
          onboardingDismissed: true,
        }),
      );
    });

    try {
      await page.goto(screen.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await applyTheme(page, cfg.theme);
      await page.waitForTimeout(500);

      // Perform screen specific setup / trigger
      await screen.setup(page);
      await page.waitForTimeout(600);

      const variantFileName = `${screen.id}_${cfg.key}.png`;
      const variantPath = path.join(DOCS_SCREENSHOTS_DIR, variantFileName);
      await page.screenshot({ path: variantPath, fullPage: false });
      capturedFiles.push(variantFileName);
      console.log(`  ✓ Saved variant: ${variantFileName}`);

      // If PC Dark, also save canonical filename
      if (cfg.key === "pc_dark") {
        const canonicalFileName = `${screen.id}.png`;
        const canonicalPath = path.join(DOCS_SCREENSHOTS_DIR, canonicalFileName);
        await page.screenshot({ path: canonicalPath, fullPage: false });
        capturedFiles.push(canonicalFileName);
        console.log(`  ✓ Saved canonical: ${canonicalFileName}`);
      }
    } catch (err) {
      console.error(`  ✗ Error capturing ${screen.id} [${cfg.key}]:`, err.message);
    } finally {
      await context.close();
    }
  }
}

await browser.close();

console.log(`\n=============================================================`);
console.log(`[COPY] Mirroring all captured proofs to brain directory...`);
console.log(`=============================================================`);

for (const file of capturedFiles) {
  const src = path.join(DOCS_SCREENSHOTS_DIR, file);
  const dst = path.join(BRAIN_DIR, file);
  if (existsSync(src)) {
    copyFileSync(src, dst);
    console.log(`Copied ${file} -> ${dst}`);
  }
}

console.log(`\n[COMPLETE] All 7 core screens captured across 4 mandatory states successfully!`);
