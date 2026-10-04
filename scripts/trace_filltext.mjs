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

    // Intercept fillText globally
    await page.addInitScript(() => {
      window.__fillTextLogs = [];
      const origFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        if (text && text.includes("#")) {
          window.__fillTextLogs.push({ text, x: Math.round(x), y: Math.round(y), w: this.canvas.width, h: this.canvas.height });
        }
        return origFillText.apply(this, arguments);
      };

      localStorage.setItem("dente_clinic_token", "audit-token-clinic");
      localStorage.setItem("dente_staff_token", "audit-token-staff");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
    });

    const mockDashboard = {
      clinicName: "Стоматология ДЕНТЕ Премиум",
      todayIso: "2026-09-29",
      patients: [{ id: "pat-zakharov", fullName: "Захаров Иван Дмитриевич", status: "active" }],
    };

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
      if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов", role: "owner", active: true } }) });
      }
      if (url.includes("/api/auth/staff/unlock")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, token: "audit-token-staff" }) });
      if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.goto("http://127.0.0.1:5173/#imaging", { timeout: 10000 });
    await page.waitForTimeout(1000);

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

    const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']").first();
    if (await openMprBtn.isVisible({ timeout: 5000 })) {
      await openMprBtn.click({ force: true, timeout: 5000 });
    }

    const quadGrid = page.locator("[data-testid='cbct-mpr-quad-grid']");
    try {
      await quadGrid.waitFor({ state: "visible", timeout: 5000 });
    } catch {
      const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
      if (await loadDemoBtn.isVisible()) {
        await loadDemoBtn.click({ force: true, timeout: 5000 });
      }
      await quadGrid.waitFor({ state: "visible", timeout: 10000 });
    }

    // Go to MPR
    const mprTab = page.locator("button:has-text('MPR 3D')").first();
    if (await mprTab.isVisible({ timeout: 5000 })) {
      await mprTab.click({ force: true, timeout: 5000 });
    }

    // Switch 4th quadrant to volume3d
    const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
    if (await mode3dBtn.isVisible({ timeout: 5000 })) {
      await mode3dBtn.click({ force: true, timeout: 5000 });
    }

    // Expand
    const expand3dBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
    if (await expand3dBtn.isVisible({ timeout: 5000 })) {
      await expand3dBtn.click({ force: true, timeout: 5000 });
    }
    await page.waitForTimeout(2000);

    const logs = await page.evaluate(() => window.__fillTextLogs || []);
    console.log("ALL fillText LOGS CONTAINING '#':", JSON.stringify(logs, null, 2));

  } finally {
    clearTimeout(killTimer);
    if (browser) await browser.close();
  }
}

main().catch(console.error);
