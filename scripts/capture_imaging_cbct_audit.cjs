/**
 * scripts/capture_imaging_cbct_audit.cjs
 * Comprehensive Red Team Visual Audit for CBCT & Imaging Gallery:
 * 1. Imaging Gallery (visigraph, RVG sensor visualizer, tooth 36, quick chips)
 * 2. CBCT Preview in Gallery (kind filter "КЛКТ / КТ", DICOM dropzone, clinical hint)
 * 3. 3D MPR Workspace Modal (Cornerstone3DViewer, 3D MPR dialog, dropzone)
 * 4. Fullscreen 3D CBCT & Implant Studio Modal (CbctMprImplantStudioModal, left tool dock, mode switcher)
 *
 * Viewports:
 * - Desktop: 1440x900 (Light & Dark)
 * - Mobile: 390x844 (Light & Dark)
 * Total: 16 screenshots
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/8f572321-fb44-4a9c-a59e-decb7d9d4368/screenshots";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/imaging_cbct_audit";
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Setting up live clinic session for Imaging & CBCT audit...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `cbct-audit-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) throw new Error(`Unlock failed: ${await unlockRes.text()}`);
  const unlockData = await unlockRes.json();

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  // Seed default clinic and chair in DB
  try {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
    });
    const client = await pool.connect();
    try {
      let clinicRes = await client.query(
        "SELECT id FROM clinics WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      let clinicId;
      if (clinicRes.rows.length === 0) {
        const insertClinic = await client.query(
          "INSERT INTO clinics (organization_id, name, timezone) VALUES ($1, $2, $3) RETURNING id",
          [initData.organizationId, "Главное отделение", "Europe/Samara"]
        );
        clinicId = insertClinic.rows[0].id;
      } else {
        clinicId = clinicRes.rows[0].id;
      }

      const chairRes = await client.query(
        "SELECT id FROM chairs WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      if (chairRes.rows.length === 0) {
        await client.query(
          "INSERT INTO chairs (organization_id, clinic_id, name, is_active) VALUES ($1, $2, $3, true)",
          [initData.organizationId, clinicId, "Кресло 1 (Основное)"]
        );
      }
    } finally {
      client.release();
      await pool.end();
    }
  } catch (errDb) {
    console.log("[Provisioning] Chair seed note:", errDb.message);
  }

  // Seed Patient
  let patientId = null;
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Ковалёв Роман Станиславович",
      phone: "+7 (999) 888-77-66",
      birthDate: "1988-04-12",
      gender: "male",
      notes: "Лечение глубокого кариеса и пульпита 36 зуба",
      allergies: ["latex", "lidocaine_mild"],
    }),
  });
  if (pRes.ok) {
    const pData = await pRes.json();
    patientId = pData.patient?.id || pData.id;
  }

  // Seed 3 imaging studies: periapical, opg, cbct
  if (patientId) {
    // 1. Periapical (visigraph)
    await fetch(`${API_BASE}/api/imaging/studies`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        kind: "periapical",
        title: "Прицельный снимок зуба 36 (периапикальный)",
        toothCode: "36",
        region: "36 нижний левый моляр",
        sourceKind: "manual_upload",
        sourceName: "Carestream RVG 5200",
      }),
    });

    // 2. OPG (panoramic)
    await fetch(`${API_BASE}/api/imaging/studies`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        kind: "opg",
        title: "Ортопантомограмма зубных рядов (ОПТГ)",
        region: "Верхняя и нижняя челюсти",
        sourceKind: "manual_upload",
        sourceName: "Planmeca ProMax 2D",
      }),
    });

    // 3. CBCT (3D)
    await fetch(`${API_BASE}/api/imaging/studies`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        kind: "cbct",
        title: "3D КЛКТ челюстно-лицевой области (12x10 см)",
        region: "Верхняя и нижняя челюсти, пазухи",
        sourceKind: "manual_upload",
        sourceName: "Vatech PaX-i 3D",
      }),
    });
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function run() {
  fs.mkdirSync(BRAIN_DIR, { recursive: true });
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Google Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            onboardingDismissed: true,
            onboardingStep: "done",
            scheduleDateFilter: "2026-09-22",
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
            version: 1,
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
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
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

  async function configurePage(page, theme) {
    await page.evaluate(
      ({ th }) => {
        localStorage.setItem("dente_theme_mode", th);
        document.documentElement.setAttribute("data-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(th);
        }
      },
      { th: theme }
    );
    await page.waitForTimeout(600);
  }

  async function navigateHash(page, hash, expectedSelector) {
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash);
    if (expectedSelector) {
      await page.waitForSelector(expectedSelector, { timeout: 15000 }).catch(() => {});
    }
    await page.waitForTimeout(800);
  }

  async function takeProof(page, fileName, viewName, modeName) {
    const brainFile = path.join(BRAIN_DIR, fileName);
    const localFile = path.join(LOCAL_DIR, fileName);

    const boot = await page.$('.boot-state');
    if (boot) {
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
    }
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });

    // Dismiss toasts
    await page.evaluate(() => {
      let style = document.getElementById("anti-toast-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "anti-toast-style";
        style.textContent = `
          .sa-toast, [data-testid="global-toast"], .toast, [role="alert"].sa-toast {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }).catch(() => {});

    await page.waitForTimeout(600);
    await page.screenshot({ path: brainFile, fullPage: false });
    fs.copyFileSync(brainFile, localFile);

    const stats = fs.statSync(brainFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(brainFile)).digest("hex");
    console.log(
      `[Captured] ${fileName} (${viewName} - ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash} [>=40KB: ${stats.size >= 40960 ? "PASS" : "FAIL"}]`
    );
  }

  const viewports = [
    { name: "desktop", width: 1440, height: 900, isMobile: false },
    { name: "mobile", width: 390, height: 844, isMobile: true },
  ];

  for (const vp of viewports) {
    console.log(`\n============================================================`);
    console.log(`>>> VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) <<<`);
    console.log(`============================================================`);

    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    await page.goto(`${WEB_BASE}/#imaging`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(1500);

    // ─────────────────────────────────────────────────────────────────
    // SCREEN 1: IMAGING GALLERY (VISIGRAPH / RVG / TOOTH 36)
    // ─────────────────────────────────────────────────────────────────
    console.log(`\n--- SCREEN 1: IMAGING GALLERY (${vp.name}) ---`);
    await navigateHash(page, "imaging", ".imaging-layout, .imaging-panel");

    // Select the periapical study if multiple
    await page.evaluate(() => {
      const periapicalCard = document.querySelector('[data-testid*="imaging-card-periapical"], [data-kind="periapical"]');
      if (periapicalCard) periapicalCard.click();
    });
    await page.waitForTimeout(800);

    for (const theme of ["light", "dark"]) {
      await configurePage(page, theme);
      const fileName = `01_imaging_gallery_${vp.name}_${theme}.png`;
      await takeProof(page, fileName, "Галерея снимков / Визиограф", `${vp.name} ${theme}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // SCREEN 2: CBCT PREVIEW & DICOM UPLOADER IN GALLERY
    // ─────────────────────────────────────────────────────────────────
    console.log(`\n--- SCREEN 2: CBCT PREVIEW IN GALLERY (${vp.name}) ---`);
    // Click "КЛКТ / КТ" filter tab
    await page.evaluate(() => {
      const filterBtns = Array.from(document.querySelectorAll(".imaging-kind-filter button"));
      const cbctBtn = filterBtns.find((b) => b.textContent && (b.textContent.includes("КТ") || b.textContent.includes("КЛКТ")));
      if (cbctBtn) cbctBtn.click();
    });
    await page.waitForTimeout(800);

    // Click the CBCT study item or row select button
    await page.evaluate(() => {
      const rowSelects = Array.from(document.querySelectorAll(".imaging-row-select"));
      if (rowSelects.length > 0) {
        rowSelects[0].click();
      } else {
        const row = document.querySelector(".imaging-row");
        if (row) row.click();
      }
    });
    await page.waitForTimeout(1000);

    for (const theme of ["light", "dark"]) {
      await configurePage(page, theme);
      const fileName = `02_imaging_cbct_preview_${vp.name}_${theme}.png`;
      await takeProof(page, fileName, "Превью КТ в галерее", `${vp.name} ${theme}`);
    }

    // Reset filter to all
    await page.evaluate(() => {
      const filterBtns = Array.from(document.querySelectorAll(".imaging-kind-filter button"));
      const allBtn = filterBtns.find((b) => b.textContent && b.textContent.includes("Все"));
      if (allBtn) allBtn.click();
    });
    await page.waitForTimeout(500);

    // ─────────────────────────────────────────────────────────────────
    // SCREEN 3: 3D MPR WORKSPACE MODAL (Cornerstone3DViewer)
    // ─────────────────────────────────────────────────────────────────
    console.log(`\n--- SCREEN 3: 3D MPR WORKSPACE (${vp.name}) ---`);
    const openMpr = async () => {
      if (vp.isMobile) {
        const moreBtn = page.locator('button[aria-label="Вторичные действия со снимками"]');
        if (await moreBtn.isVisible()) {
          await moreBtn.click();
          await page.waitForTimeout(500);
          const mprBtn = page.locator('[role="menu"] button:has-text("3D MPR")');
          if (await mprBtn.isVisible()) await mprBtn.click();
        }
      } else {
        const mprBtn = page.locator('[data-testid="imaging-open-3d-mpr"]');
        if (await mprBtn.isVisible()) await mprBtn.click();
      }
      await page.waitForSelector(".cbct-mpr-workspace-modal, [data-testid=\"cornerstone-empty-volume-dropzone\"]", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
    };

    await openMpr();

    for (const theme of ["light", "dark"]) {
      await configurePage(page, theme);
      const modal = await page.$('.cbct-mpr-workspace-modal');
      if (!modal) {
        await openMpr();
      }
      await page.waitForTimeout(800);
      const fileName = `03_cbct_mpr_workspace_${vp.name}_${theme}.png`;
      await takeProof(page, fileName, "3D MPR Workspace", `${vp.name} ${theme}`);
    }

    // Close 3D MPR modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);

    // ─────────────────────────────────────────────────────────────────
    // SCREEN 4: FULLSCREEN 3D CBCT & IMPLANT STUDIO MODAL
    // ─────────────────────────────────────────────────────────────────
    console.log(`\n--- SCREEN 4: 3D CBCT & IMPLANT STUDIO MODAL (${vp.name}) ---`);
    await navigateHash(page, "visit", ".visit-view, [data-testid=\"visit-emk-tab\"]");
    await page.waitForTimeout(1000);

    // Switch to Diagnostics tab in visit
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button[role="tab"]'));
      const diagBtn = tabBtns.find((b) => b.textContent && (b.textContent.includes("Рентген") || b.textContent.includes("Диагностика")));
      if (diagBtn) diagBtn.click();
    });
    await page.waitForTimeout(800);

    // Open CbctMprImplantStudioModal
    const openStudioBtn = page.locator('[data-testid="btn-open-cbct-studio-modal"]');
    if (await openStudioBtn.isVisible()) {
      await openStudioBtn.click();
    } else {
      const studioBtn = page.locator('button:has-text("3D КЛКТ / КТ-исследование")');
      if (await studioBtn.isVisible()) await studioBtn.click();
    }

    await page.waitForSelector('[data-testid="cbct-mpr-implant-studio-modal"], [data-testid="cbct-empty-volume-dropzone"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    if (vp.isMobile) {
      // Click mobile tab to show sagittal or panoramic
      const sagTab = page.locator('[data-testid="cbct-mobile-tab-sagittal"]');
      if (await sagTab.isVisible()) {
        await sagTab.click();
        await page.waitForTimeout(400);
      }
    }

    for (const theme of ["light", "dark"]) {
      await configurePage(page, theme);
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
      const fileName = `04_cbct_studio_modal_${vp.name}_${theme}.png`;
      await takeProof(page, fileName, "3D CBCT & Implant Studio", `${vp.name} ${theme}`);
    }

    // Close studio modal
    const closeStudioBtn = page.locator('[data-testid="close-cbct-mpr-3d-studio-btn"]');
    if (await closeStudioBtn.isVisible()) {
      await closeStudioBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(800);

    await ctx.close();
  }

  await browser.close();
  console.log("\n>>> ALL 16 IMAGING & CBCT SCREENSHOTS CAPTURED SUCCESSFULLY! <<<");
}

run().catch((err) => {
  console.error("[Capture Error]:", err);
  process.exit(1);
});
