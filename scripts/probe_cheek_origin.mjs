import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  const killTimer = setTimeout(() => {
    console.error("PROBE TIMEOUT 60s");
    process.exit(1);
  }, 60000);

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-web-security", "--use-gl=angle", "--enable-webgl", "--js-flags=--max-old-space-size=4096"]
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Fast mock API
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов", role: "owner", active: true } }) });
      }
      if (url.includes("/api/auth/staff/unlock")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, token: "audit-token-staff" }) });
      if (url.includes("/api/dashboard")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            organization: { id: "00000000-0000-0000-0000-000000000001", name: "Стоматология ДЕНТЕ", mode: "small_clinic" },
            profile: { id: "c-1", organizationId: "00000000-0000-0000-0000-000000000001", clinicName: "Стоматология ДЕНТЕ", mode: "small_clinic" },
            staff: [{ id: "doc-1", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Д-р Воронов", role: "owner", active: true }],
            chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
            patients: [{ id: "pat-zakharov", fullName: "Захаров Иван", status: "active" }],
            patientInsights: [], appointments: [], payments: []
          })
        });
      }
      if (url.includes("/api/studies/search") || url.includes("/api/studies")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { id: "study-zakharov-cbct", patientId: "pat-zakharov", patientName: "Захаров Иван", modality: "CT", seriesDescription: "3D КЛКТ Захаров (312 срезов)", status: "completed", createdAt: new Date().toISOString() }
          ])
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "audit-token-clinic");
      localStorage.setItem("dente_staff_token", "audit-token-staff");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
    });

    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);

    // Disable tours
    await page.addStyleTag({
      content: `
        .tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], 
        [data-testid='guided-tour-spotlight-overlay'], [class*='tour-backdrop'] {
          display: none !important; pointer-events: none !important;
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
            return { name, buffer: await r.arrayBuffer() };
          })
        );
        buffers.push(...chunkRes);
      }
      function parseHeader(buf) {
        const view = new DataView(buf);
        let rows = 600, cols = 600, pixelSpacingX = 0.25, pixelSpacingY = 0.25, sliceThickness = 0.25, pixelDataOffset = -1;
        for (let i = 128; i < Math.min(buf.byteLength - 8, 131072); i += 2) {
          if (view.getUint16(i, true) === 0x7fe0 && view.getUint16(i + 2, true) === 0x0010) { pixelDataOffset = i + 12; break; }
        }
        if (pixelDataOffset === -1) pixelDataOffset = buf.byteLength - rows * cols * 2;
        return { rows, cols, pixelSpacingX, pixelSpacingY, sliceThickness, pixelDataOffset };
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
      window.__cbctDemoVolume = {
        id: "probe-vol",
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

    const openBtn = page.locator("[data-testid='imaging-open-3d-mpr'], button:has-text('3D MPR Студия')").first();
    await openBtn.waitFor({ state: "visible", timeout: 15000 });
    await openBtn.click({ force: true });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
    });
    await page.waitForTimeout(1000);

    // Visit Endo first
    const endoTab = page.locator("button:has-text('Эндодонтия'), [data-testid='cbct-nav-tab-endo']").first();
    if (await endoTab.isVisible()) {
      await endoTab.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // Back to MPR
    const mprTab = page.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d']").first();
    await mprTab.click({ force: true });
    await page.waitForTimeout(1000);

    // Switch to volume3d
    const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
    if (await mode3dBtn.isVisible()) {
      await mode3dBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Expand
    const expandBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Read details at point (887, 267)
    const report = await page.evaluate(() => {
      const elList = document.elementsFromPoint(887, 267).map(e => ({
        tag: e.tagName, id: e.id, class: e.className, testId: e.getAttribute("data-testid")
      }));

      const overlayCanvas = document.querySelector("[data-testid='cbct-volume-3d-overlay-canvas']");
      const webglCanvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");

      let overlayPixel = null;
      if (overlayCanvas) {
        const rect = overlayCanvas.getBoundingClientRect();
        const ctx = overlayCanvas.getContext("2d");
        const cx = Math.round((887 - rect.left) * (overlayCanvas.width / rect.width));
        const cy = Math.round((267 - rect.top) * (overlayCanvas.height / rect.height));
        const p = ctx.getImageData(cx, cy, 1, 1).data;
        overlayPixel = { cx, cy, rgba: [p[0], p[1], p[2], p[3]] };
      }

      let webglPixel = null;
      if (webglCanvas) {
        const rect = webglCanvas.getBoundingClientRect();
        const gl = webglCanvas.getContext("webgl2");
        const cx = Math.round((887 - rect.left) * (webglCanvas.width / rect.width));
        const cy = Math.round((267 - rect.top) * (webglCanvas.height / rect.height));
        const gy = webglCanvas.height - 1 - cy;
        const p = new Uint8Array(4);
        gl.readPixels(cx, gy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
        webglPixel = { cx, cy, gy, rgba: [p[0], p[1], p[2], p[3]] };
      }

      return { elList, overlayPixel, webglPixel };
    });

    console.log("PROBE REPORT:", JSON.stringify(report, null, 2));

    await page.screenshot({ path: "C:/Clinic_MVP/dental-crm/test_disabled_shader.png" });
    console.log("Saved test_disabled_shader.png");
  } finally {
    clearTimeout(killTimer);
    if (browser) await browser.close();
  }
}

main().catch(console.error);
