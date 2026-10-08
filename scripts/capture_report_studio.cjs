/**
 * scripts/capture_report_studio.cjs
 */
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
        })
      );
    });

    const page = await context.newPage();

    // Mock API
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/dashboard") || url.includes("/api/bootstrap")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            todayIso: new Date().toLocaleDateString("en-CA"),
            patients: [{ id: "pat-1", fullName: "Ковалёв Роман Станиславович", cardNumber: "МК-РАТ-1" }],
            activeVisit: { id: "visit-1", patientId: "pat-1" },
            appointments: [{ id: "apt-1", patientId: "pat-1", patientName: "Ковалёв Роман Станиславович" }],
            imagingStudies: [
              { id: "s-1", patientId: "pat-1", previewUrl: "/radiology/sample_rvg_tooth16.jpg", toothCode: "16" }
            ],
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Switch to visit
    await page.evaluate(() => { window.location.hash = "visit"; });
    await page.waitForSelector(".visit-monolithic-header", { timeout: 15000 });
    await page.waitForTimeout(500);

    // Switch to diagnostics tab
    const diagTab = await page.waitForSelector('[data-testid="visit-subtab-diagnostics"]', { timeout: 10000 });
    await diagTab.click();
    await page.waitForTimeout(800);

    // Click Radiology Report Studio button
    const reportBtn = await page.waitForSelector('[data-testid="btn-open-radiology-report-studio"]', { timeout: 10000 });
    await reportBtn.click();
    await page.waitForTimeout(1200);

    const outPath = path.resolve(__dirname, "../docs/screenshots/visit_tabs/diagnostics_radiology_report_modal.png");
    await page.screenshot({ path: outPath, fullPage: false });

    const stats = fs.statSync(outPath);
    const hash = crypto.createHash("md5").update(fs.readFileSync(outPath)).digest("hex");
    console.log(`[CAPTURED] diagnostics_radiology_report_modal.png: ${stats.size} bytes, MD5=${hash}`);

    // Copy to brain
    fs.copyFileSync(outPath, path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a6e95988-e8e4-4c72-89a6-8b1d0b01322f/diagnostics_radiology_report_modal.png"));

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
