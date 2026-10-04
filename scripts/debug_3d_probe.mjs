import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  const browser = await chromium.launch({
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

  await page.goto("http://127.0.0.1:5173/#imaging");
  await page.waitForTimeout(2000);

  const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']").first();
  if (await openMprBtn.isVisible()) {
    await openMprBtn.click();
    await page.waitForTimeout(1000);
  }
  const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
  if (await loadDemoBtn.isVisible()) {
    await loadDemoBtn.click();
    await page.waitForTimeout(4000);
  }

  // Go to Endo
  const endoTab = page.locator("button:has-text('Эндодонтия')").first();
  if (await endoTab.isVisible()) {
    await endoTab.click();
    await page.waitForTimeout(1500);
  }

  // Go to MPR
  const mprTab = page.locator("button:has-text('MPR 3D')").first();
  if (await mprTab.isVisible()) {
    await mprTab.click();
    await page.waitForTimeout(1000);
  }

  // Switch to volume3d
  const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
  if (await mode3dBtn.isVisible()) {
    await mode3dBtn.click();
    await page.waitForTimeout(1000);
  }

  // Expand
  const expand3dBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
  if (await expand3dBtn.isVisible()) {
    await expand3dBtn.click();
    await page.waitForTimeout(2000);
  }

  const result = await page.evaluate(() => {
    const overlayCanvas = document.querySelector("[data-testid='cbct-volume-3d-overlay-canvas']");
    const webglCanvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
    
    let overlayPixelsAtCheek = 0;
    const cheekPoints = [];
    if (overlayCanvas) {
      const ctx = overlayCanvas.getContext("2d");
      const imgData = ctx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height);
      const data = imgData.data;
      for (let y = 240; y <= 340; y++) {
        for (let x = 860; x <= 940; x++) {
          const idx = (y * overlayCanvas.width + x) * 4;
          if (data[idx + 3] > 20) {
            overlayPixelsAtCheek++;
            if (cheekPoints.length < 10) {
              cheekPoints.push({ x, y, r: data[idx], g: data[idx+1], b: data[idx+2], a: data[idx+3] });
            }
          }
        }
      }
    }

    return {
      overlayCanvas: overlayCanvas ? { w: overlayCanvas.width, h: overlayCanvas.height } : null,
      webglCanvas: webglCanvas ? { w: webglCanvas.width, h: webglCanvas.height } : null,
      overlayPixelsAtCheek,
      cheekPoints
    };
  });

  console.log("PROBE RESULT:", JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch(console.error);
