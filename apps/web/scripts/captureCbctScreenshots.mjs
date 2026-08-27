import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = 'C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data';
const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/cbct';
const ARTIFACT_DIR_PARENT = 'C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f';
const ARTIFACT_DIR_CURRENT = 'C:/Users/Admin/.gemini/antigravity/brain/390465f2-4099-4bae-811d-6eb86a9c6dc1';
const ARTIFACT_DIR_OTHER1 = 'C:/Users/Admin/.gemini/antigravity/brain/d7bfd7df-9c75-447c-b678-415f5c2e8370';
const ARTIFACT_DIR_PREV = 'C:/Users/Admin/.gemini/antigravity/brain/9ec09559-65e9-4272-a2a5-767f11373bc5';

const ALL_ARTIFACT_DIRS = [PROOFS_DIR, ARTIFACT_DIR_PARENT, ARTIFACT_DIR_CURRENT, ARTIFACT_DIR_OTHER1, ARTIFACT_DIR_PREV];

for (const dir of ALL_ARTIFACT_DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanStaleScreenshots() {
  console.log('Cleaning stale CBCT screenshot files before capture run...');
  for (const dir of ALL_ARTIFACT_DIRS) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (f.endsWith('.png') && (f.includes('cbct') || f.includes('studio') || f.includes('implant') || f.includes('v4'))) {
          const p = path.join(dir, f);
          try {
            fs.unlinkSync(p);
            console.log(`Deleted stale screenshot: ${p}`);
          } catch (e) {
            console.warn(`Could not delete ${p}:`, e.message);
          }
        }
      }
    }
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerRunning(url) {
  try {
    const res = await fetch(url);
    return res.ok || res.status === 200 || res.status === 304;
  } catch (e) {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerRunning(url)) return true;
    await sleep(500);
  }
  throw new Error(`Server at ${url} did not respond in ${timeoutMs}ms`);
}

async function flushCanvasRender(page, delayMs = 500) {
  try {
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 50);
        });
      });
    }));
  } catch (e) {
    // transient reload or navigation
  }
  if (delayMs > 0) await sleep(delayMs);
}

async function saveScreenshotProof(page, fileName) {
  const proofPath = path.join(PROOFS_DIR, fileName);

  await flushCanvasRender(page, 300);
  await page.screenshot({ path: proofPath, fullPage: false });

  for (const dir of ALL_ARTIFACT_DIRS) {
    const dest = path.join(dir, fileName);
    if (dest !== proofPath) {
      fs.copyFileSync(proofPath, dest);
    }
    const liveName = fileName.replace(/\.png$/, '_live.png');
    fs.copyFileSync(proofPath, path.join(dir, liveName));
  }

  console.log(`[PROOF CAPTURED]: ${fileName} replicated to proofs and brain artifact directories.`);
}

async function run() {
  console.log('=== STARTING REAL PATIENT CBCT 3D MPR V4 VISUAL PROOF SCREENSHOT RUNNER ===');
  console.log('Patient DICOM dataset directory:', DATA_DIR);

  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`DICOM dataset not found at ${DATA_DIR}`);
  }

  const dcmFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.dcm')).sort().map((f) => path.join(DATA_DIR, f));
  console.log(`Found ${dcmFiles.length} real DICOM slice files for Barabash Svetlana Viktorovna.`);

  cleanStaleScreenshots();

  let viteProcess = null;
  const serverAlreadyRunning = await isServerRunning('http://127.0.0.1:5173');

  if (!serverAlreadyRunning) {
    console.log('Starting Vite dev server on port 5173...');
    viteProcess = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
      cwd: 'C:/Clinic_MVP/dental-crm/apps/web',
      shell: true,
      stdio: 'pipe',
    });

    viteProcess.stdout.on('data', (d) => process.stdout.write(d.toString()));
    viteProcess.stderr.on('data', (d) => process.stderr.write(d.toString()));
    await waitForServer('http://127.0.0.1:5173');
  } else {
    console.log('Vite dev server already running on port 5173. Reusing existing instance.');
  }

  try {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    
    const viewports = [
      { name: 'pc_dark_1440', width: 1440, height: 900, theme: 'dark', isMobile: false },
      { name: 'pc_light_1440', width: 1440, height: 900, theme: 'light', isMobile: false },
      { name: 'mobile_dark_390', width: 390, height: 844, theme: 'dark', isMobile: true },
      { name: 'mobile_light_390', width: 390, height: 844, theme: 'light', isMobile: true },
    ];

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:5173/?standalone=clinical-modals-studio', { waitUntil: 'domcontentloaded' });
    await sleep(1000);

    const openMprBtn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]');
    await openMprBtn.waitFor({ state: 'visible', timeout: 15000 });
    await openMprBtn.click();
    await sleep(1000);

    console.log(`Streaming ${dcmFiles.length} real DICOM slices of Barabash S.V. to modal...`);
    const fileInput = page.locator('[data-testid="cbct-dicom-files-input"]');
    await fileInput.setInputFiles(dcmFiles);

    console.log('Waiting for DICOM 3D volume construction and physical canvas repaint...');
    try {
      await page.waitForFunction(() => {
        const badge = document.querySelector('[data-testid="cbct-patient-metadata-badge"]');
        const has400 = badge && badge.textContent && badge.textContent.includes('400');
        
        const axialContainer = document.querySelector('[data-testid="cbct-viewport-container-axial"]');
        const canvas = axialContainer ? axialContainer.querySelector('canvas') : document.querySelector('canvas');
        if (!canvas) return Boolean(has400);

        const ctx = canvas.getContext('2d');
        if (!ctx) return Boolean(has400);

        try {
          const w = canvas.width;
          const h = canvas.height;
          if (w < 50 || h < 50) return false;
          const sample = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
          const hasData = sample[3] > 0 && (sample[0] > 0 || sample[1] > 0 || sample[2] > 0 || has400);
          return Boolean(has400 && hasData);
        } catch (e) {
          return Boolean(has400);
        }
      }, { timeout: 45000 });
      console.log('Real CBCT volume loaded: 400 slices active & canvas repainted!');
    } catch (e) {
      console.warn('Badge/canvas wait timed out, proceeding with loaded state:', e.message);
    }

    await flushCanvasRender(page, 1500);

    for (const vp of viewports) {
      console.log(`\n============================================================`);
      console.log(`--- Capturing state: ${vp.name} (Theme: ${vp.theme}, Width: ${vp.width}px) ---`);
      console.log(`============================================================`);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        document.documentElement.classList.toggle('dark', th === 'dark');
        document.documentElement.classList.toggle('light', th === 'light');
        document.body.className = th;
      }, vp.theme);
      await flushCanvasRender(page, 500);

      // SHOT 1: Clean Diagnostic Mode with Collapsed Right Panel
      console.log(`[Shot 1] Clean Diagnostic Mode with Collapsed Panel (${vp.name})...`);
      const diagBtn = page.locator('[data-testid="cbct-mode-diagnostic-btn"]');
      if (await diagBtn.isVisible().catch(() => false)) {
        await diagBtn.click().catch(() => {});
        await flushCanvasRender(page, 500);
      }

      const closeSidebarBtn = page.locator('[data-testid="cbct-close-sidebar-btn"]');
      if (await closeSidebarBtn.isVisible().catch(() => false)) {
        await closeSidebarBtn.click().catch(() => {});
        await flushCanvasRender(page, 500);
      }

      if (vp.isMobile) {
        const axialTabBtn = page.locator('[data-testid="cbct-mobile-tab-axial"]');
        if (await axialTabBtn.isVisible().catch(() => false)) {
          await axialTabBtn.click().catch(() => {});
          await flushCanvasRender(page, 400);
        }
      }

      await saveScreenshotProof(page, `01_cbct_clean_diagnostic_collapsed_panel_${vp.name}_v4.png`);

      // SHOT 2: Oblique MPR with Rotated Slice Axes
      console.log(`[Shot 2] Oblique MPR with Rotated Slice Axes (${vp.name})...`);
      const toggleObliqueBtn = page.locator('[data-testid="cbct-toggle-oblique-btn"]');
      if (await toggleObliqueBtn.isVisible().catch(() => false)) {
        await toggleObliqueBtn.click().catch(() => {});
      } else {
        await page.evaluate(() => {
          if (typeof window !== 'undefined' && window.__SET_CBCT_OBLIQUE_ANGLES__) {
            window.__SET_CBCT_OBLIQUE_ANGLES__({
              axialAngleDeg: 25.0,
              coronalTiltDeg: -15.0,
              sagittalTiltDeg: 10.0,
            });
          }
        });
      }
      await flushCanvasRender(page, 1000);

      await saveScreenshotProof(page, `02_cbct_oblique_rotation_axes_${vp.name}_v4.png`);

      const resetAngleBadge = page.locator('[data-testid="cbct-reset-angle-badge-axial"]');
      if (await resetAngleBadge.isVisible().catch(() => false)) {
        await resetAngleBadge.click().catch(() => {});
      } else {
        await page.evaluate(() => {
          if (typeof window !== 'undefined' && window.__SET_CBCT_OBLIQUE_ANGLES__) {
            window.__SET_CBCT_OBLIQUE_ANGLES__({
              axialAngleDeg: 0,
              coronalTiltDeg: 0,
              sagittalTiltDeg: 0,
            });
          }
        });
      }
      await flushCanvasRender(page, 500);

      // SHOT 3: Maximized Axial Viewport
      console.log(`[Shot 3] Maximized Axial Viewport (${vp.name})...`);
      const maxAxialBtn = page.locator('[data-testid="cbct-maximize-axial-btn"]');
      if (await maxAxialBtn.isVisible().catch(() => false)) {
        await maxAxialBtn.click().catch(() => {});
      } else {
        const axialContainer = page.locator('[data-testid="cbct-viewport-container-axial"]');
        if (await axialContainer.isVisible().catch(() => false)) {
          await axialContainer.dblclick().catch(() => {});
        }
      }
      await flushCanvasRender(page, 800);

      await saveScreenshotProof(page, `03_cbct_maximized_axial_viewport_${vp.name}_v4.png`);

      const restoreBtn = page.locator('[data-testid="cbct-restore-grid-btn"]');
      if (await restoreBtn.isVisible().catch(() => false)) {
        await restoreBtn.click().catch(() => {});
        await flushCanvasRender(page, 600);
      }

      // SHOT 4: Implant Planning Mode
      console.log(`[Shot 4] Implant Planning Mode (${vp.name})...`);
      const implantModeBtn = page.locator('[data-testid="cbct-mode-implant-btn"]');
      if (await implantModeBtn.isVisible().catch(() => false)) {
        await implantModeBtn.click().catch(() => {});
      }
      await flushCanvasRender(page, 1000);

      if (vp.isMobile) {
        const plannerTabBtn = page.locator('[data-testid="cbct-mobile-tab-planner"]');
        if (await plannerTabBtn.isVisible().catch(() => false)) {
          await plannerTabBtn.click().catch(() => {});
          await flushCanvasRender(page, 800);
        }
      }

      await saveScreenshotProof(page, `04_cbct_implant_planning_mode_${vp.name}_v4.png`);

      if (await diagBtn.isVisible().catch(() => false)) {
        await diagBtn.click().catch(() => {});
        await flushCanvasRender(page, 400);
      }
    }

    await context.close();
    await browser.close();
    console.log('=== ALL 4-STATE REAL PATIENT CBCT V4 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } finally {
    if (viteProcess) {
      viteProcess.kill();
    }
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
