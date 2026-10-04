import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  const killTimer = setTimeout(() => {
    console.error("SCRIPT TIMEOUT WATCHDOG 45s");
    process.exit(1);
  }, 45000);

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-web-security", "--use-gl=angle", "--enable-webgl", "--js-flags=--max-old-space-size=4096"]
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов", role: "owner", active: true } }) });
      }
      if (url.includes("/api/auth/staff/unlock")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, token: "audit-token-staff" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "audit-token-clinic");
      localStorage.setItem("dente_staff_token", "audit-token-staff");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
    });

    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);

    // Disable tours
    await page.addStyleTag({
      content: `
        .tour-spotlight-root, 
        [data-testid='doctor-training-coach-mark-card'], 
        [data-testid='guided-tour-spotlight-overlay'], 
        [class*='tour-backdrop'],
        [class*='spotlight'] {
          display: none !important;
          pointer-events: none !important;
        }
      `
    });

    // Assemble real volume
    await page.evaluate(async () => {
      const manifestRes = await fetch("/radiology/demo_cbct/manifest.json");
      const manifest = await manifestRes.json();
      const buffers = [];
      const chunkSize = 32;
      for (let c = 0; c < manifest.slices.length; c += chunkSize) {
        const chunk = manifest.slices.slice(c, c + chunkSize);
        const chunkRes = await Promise.all(
          chunk.map(async (name) => {
            const r = await fetch(`/radiology/demo_cbct/${name}`);
            const ab = await r.arrayBuffer();
            return { name, buffer: ab };
          }),
        );
        buffers.push(...chunkRes);
      }
      function parseHeader(buf) {
        const view = new DataView(buf);
        const len = buf.byteLength;
        let rows = 600, cols = 600, pixelSpacingX = 0.25, pixelSpacingY = 0.25, sliceThickness = 0.25, sliceLocationZ = 0, pixelDataOffset = -1, pixelDataLength = 0;
        for (let i = 128; i < Math.min(len - 8, 131072); i += 2) {
          const g = view.getUint16(i, true), e = view.getUint16(i + 2, true);
          if (g === 0x7fe0 && e === 0x0010) { pixelDataOffset = i + 12; pixelDataLength = view.getUint32(i + 8, true); break; }
        }
        if (pixelDataOffset === -1) { pixelDataOffset = len - rows * cols * 2; pixelDataLength = rows * cols * 2; }
        return { rows, cols, pixelSpacingX, pixelSpacingY, sliceThickness, sliceLocationZ, pixelDataOffset, pixelDataLength };
      }
      const validEntries = buffers.map(b => ({ header: parseHeader(b.buffer), buffer: b.buffer }));
      const width = 600, height = 600, depth = validEntries.length, sliceCount = width * height;
      const voxelData = new Int16Array(width * height * depth);
      for (let z = 0; z < depth; z++) {
        const entry = validEntries[z];
        const raw = new Uint16Array(entry.buffer, entry.header.pixelDataOffset, sliceCount);
        const base = z * sliceCount;
        for (let i = 0; i < sliceCount; i++) voxelData[base + i] = (raw[i] || 0) - 1000;
      }
      const ref = validEntries[0].header;
      window.__cbctDemoVolume = {
        id: "live-test-vol",
        dimensions: { width, height, depth },
        spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
        originMm: { x: -75, y: -75, z: -39 },
        physicalSizeMm: { x: 150, y: 150, z: 78 },
        data: voxelData,
        minHU: -1000, maxHU: 3000,
        rescaleSlope: 1.0, rescaleIntercept: -1000,
        defaultWindowWidth: 4025, defaultWindowLevel: 525, isDisposed: false,
      };
    });

    // Open MPR
    const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']").first();
    await openMprBtn.click({ force: true, timeout: 5000 });
    const modal = page.locator("[data-testid='cbct-studio-modal']");
    await modal.waitFor({ state: "visible", timeout: 10000 });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
    });

    const quadGrid = page.locator("[data-testid='cbct-mpr-quad-grid']");
    await quadGrid.waitFor({ state: "visible", timeout: 10000 });

    // Visit Endo first
    const endoTab = page.locator("button:has-text('Эндодонтия'), [data-testid='cbct-nav-tab-endo']").first();
    if (await endoTab.isVisible()) {
      await endoTab.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(2000);
    }

    // Go back to MPR
    const mprTab = page.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d']").first();
    await mprTab.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1000);

    // Switch to volume3d
    const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
    if (await mode3dBtn.isVisible()) {
      await mode3dBtn.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Expand
    const expand3dBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
    if (await expand3dBtn.isVisible()) {
      await expand3dBtn.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(2000);
    }

    // Diagnostic read!
    const canvasReport = await page.evaluate(() => {
      const overlayCanvas = document.querySelector("[data-testid='cbct-volume-3d-overlay-canvas']");
      const webglCanvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");

      const elList = document.elementsFromPoint(882, 315).map(e => ({ tag: e.tagName, id: e.id, class: e.className, testId: e.getAttribute("data-testid") }));
      let overlayHasCheekPixels = 0;
      if (overlayCanvas) {
        const rect = overlayCanvas.getBoundingClientRect();
        const ctx = overlayCanvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height);
        for (let y = 240; y <= 340; y++) {
          const cy = Math.round((y - rect.top) * (overlayCanvas.height / rect.height));
          if (cy < 0 || cy >= overlayCanvas.height) continue;
          for (let x = 860; x <= 940; x++) {
            const cx = Math.round((x - rect.left) * (overlayCanvas.width / rect.width));
            if (cx < 0 || cx >= overlayCanvas.width) continue;
            const idx = (cy * overlayCanvas.width + cx) * 4;
            if (imgData.data[idx + 3] > 0) overlayHasCheekPixels++;
          }
        }
      }

      let webglHasGreenPixels = 0;
      const greenCoords = [];
      if (webglCanvas) {
        const rect = webglCanvas.getBoundingClientRect();
        const gl = webglCanvas.getContext("webgl2");
        if (gl) {
          const pixels = new Uint8Array(webglCanvas.width * webglCanvas.height * 4);
          gl.readPixels(0, 0, webglCanvas.width, webglCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const h = webglCanvas.height;
          for (let sy = 240; sy <= 340; sy++) {
            const localY = Math.round((sy - rect.top) * (webglCanvas.height / rect.height));
            if (localY < 0 || localY >= h) continue;
            const gy = h - 1 - localY;
            for (let sx = 860; sx <= 940; sx++) {
              const cx = Math.round((sx - rect.left) * (webglCanvas.width / rect.width));
              if (cx < 0 || cx >= webglCanvas.width) continue;
              const idx = (gy * webglCanvas.width + cx) * 4;
              const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
              if (g > 100 && g > r + 30 && g > b + 30) {
                webglHasGreenPixels++;
                if (greenCoords.length < 20) {
                  greenCoords.push({ sx, sy, cx, localY, gy, rgb: [r, g, b] });
                }
              }
            }
          }
        }
      }

      return { elList, overlayHasCheekPixels, webglHasGreenPixels, greenCoords };
    });

    await page.screenshot({ path: "C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments/test_05_volume3d.png" });
    console.log("Screenshot saved to test_05_volume3d.png");
    console.log("CANVAS REPORT:", JSON.stringify(canvasReport));
  } finally {
    clearTimeout(killTimer);
    if (browser) await browser.close();
  }
}

main().catch(console.error);
