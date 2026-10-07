import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/943d12e9-f0eb-4ae4-9b9a-a81607ca87f9");
const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

for (const d of [targetDir, brainDir, parentBrainDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function capture() {
  const killTimer = setTimeout(() => {
    console.error("CAPTURE TIMEOUT WATCHDOG 60s");
    process.exit(1);
  }, 60000);

  let browser = null;
  try {
    console.log("1. Launching Chrome with WebGL support...");
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        "--no-sandbox",
        "--disable-web-security",
        "--use-gl=angle",
        "--enable-webgl",
        "--js-flags=--max-old-space-size=4096"
      ]
    });

    for (const theme of ["dark", "light"]) {
      console.log(`\n=== Capturing for theme: ${theme} ===`);
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.route("**/api/**", async (route) => {
        const url = route.request().url();
        if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов", role: "owner", active: true } })
          });
        }
        if (url.includes("/api/auth/staff/unlock")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, token: "audit-token-staff" })
          });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      });

      await page.addInitScript((th) => {
        localStorage.setItem("dente_clinic_token", "audit-token-clinic");
        localStorage.setItem("dente_staff_token", "audit-token-staff");
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_tour_completed", "true");
      }, theme);

      console.log("Navigating to http://127.0.0.1:5173/#imaging ...");
      await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1500);

      // Disable tours and spotlight overlays
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

      // Prepare synthetic demo volume in window.__cbctDemoVolume
      console.log("Assembling demo volume...");
      await page.evaluate(async () => {
        const manifestRes = await fetch("/radiology/demo_cbct/manifest.json").catch(() => null);
        if (manifestRes && manifestRes.ok) {
          const manifest = await manifestRes.json();
          const buffers = [];
          const chunkSize = 32;
          for (let c = 0; c < Math.min(manifest.slices.length, 64); c += chunkSize) {
            const chunk = manifest.slices.slice(c, c + chunkSize);
            const chunkRes = await Promise.all(
              chunk.map(async (name) => {
                const r = await fetch(`/radiology/demo_cbct/${name}`);
                const ab = await r.arrayBuffer();
                return { name, buffer: ab };
              })
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
          window.__cbctDemoVolume = {
            id: "live-test-vol",
            dimensions: { width, height, depth },
            spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
            originMm: { x: -75, y: -75, z: -39 },
            physicalSizeMm: { x: 150, y: 150, z: depth * 0.25 },
            data: voxelData,
            minHU: -1000, maxHU: 3000,
            rescaleSlope: 1.0, rescaleIntercept: -1000,
            defaultWindowWidth: 4025, defaultWindowLevel: 525, isDisposed: false,
          };
        }
      });

      // Open MPR modal
      console.log("Opening 3D MPR modal...");
      const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']").first();
      await openMprBtn.click({ force: true, timeout: 5000 });
      const modal = page.locator("[data-testid='cbct-studio-modal']");
      await modal.waitFor({ state: "visible", timeout: 10000 });

      // Dispatch volume if available
      await page.evaluate(() => {
        if (window.__cbctDemoVolume) {
          window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
        }
      });

      console.log("Waiting for quad grid...");
      const quadGrid = page.locator("[data-testid='cbct-mpr-quad-grid']");
      await quadGrid.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(2000);

      // Helper for instantaneous CDP screenshot (avoids WebGL RAF hangs)
      async function snapCdp(filePath) {
        const cdp = await context.newCDPSession(page);
        const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
        await cdp.detach();
        fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      }

      // Snap 4-quadrant edge-to-edge MPR view
      const quadName = `cbct_mpr_edge_to_edge_${theme}.png`;
      const pQuad = path.join(targetDir, quadName);
      await snapCdp(pQuad);
      fs.copyFileSync(pQuad, path.join(brainDir, quadName));
      fs.copyFileSync(pQuad, path.join(parentBrainDir, quadName));
      console.log(`Saved ${quadName} (${(fs.statSync(pQuad).size / 1024).toFixed(1)} KB)`);

      // If dark theme, also capture maximized axial view to demonstrate 100% full-bleed
      if (theme === "dark") {
        const expandAxialBtn = page.locator("[data-testid='btn-viewport-expand-axial']").first();
        if (await expandAxialBtn.isVisible()) {
          console.log("Maximizing axial viewport...");
          await expandAxialBtn.click({ force: true });
          await page.waitForTimeout(1500);

          const maxName = `cbct_mpr_maximized_axial_dark.png`;
          const pMax = path.join(targetDir, maxName);
          await snapCdp(pMax);
          fs.copyFileSync(pMax, path.join(brainDir, maxName));
          fs.copyFileSync(pMax, path.join(parentBrainDir, maxName));
          console.log(`Saved ${maxName} (${(fs.statSync(pMax).size / 1024).toFixed(1)} KB)`);
        }
      }

      await context.close();
    }
    console.log("\nALL MPR EDGE-TO-EDGE SCREENSHOTS SAVED SUCCESSFULLY!");
  } finally {
    clearTimeout(killTimer);
    if (browser) await browser.close();
  }
}

capture().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
