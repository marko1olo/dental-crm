/**
 * scripts/capture_window5_final.cjs
 * Robust capture of Window 5: RadiologyReportStudioModal (Light & Dark Desktop 1440x900).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function captureWindow5Theme(theme, fileName) {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/cf594fe0-ad98-423b-aea8-df33e15e0c03"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await ctx.addInitScript((th) => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
    }, theme);

    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.log(`[${theme.toUpperCase()} PAGE ERROR]:`, err.message));

    // Mock API
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман Станиславович", medicalCardNumber: "МК-РАТ-1", birthDate: "1966-04-12", gender: "male" }],
          appointments: [],
          imagingStudies: [
            {
              id: "study-1",
              patientId: "pat-1",
              kind: "periapical",
              modality: "IO_SENSOR",
              title: "RVG #16",
              status: "available",
              previewUrl: "/radiology/sample_rvg_tooth16.jpg",
            },
          ],
        }),
      });
    });

    console.log(`[${theme.toUpperCase()}] Navigating to #schedule...`);
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { timeout: 30000 });

    // Explicitly set theme on documentElement after DOM is ready
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);

    console.log(`[${theme.toUpperCase()}] Switching to #imaging...`);
    await page.click('a[href="#imaging"]');
    await page.waitForTimeout(1500);

    const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openRadBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });

    const openReportBtn = await page.waitForSelector('[data-testid="btn-open-report-studio"]', { timeout: 15000 });
    console.log(`[${theme.toUpperCase()}] Opening Report Studio modal...`);
    await openReportBtn.click();
    await page.waitForSelector('[data-testid="radiology-report-studio-modal"]', { timeout: 15000 });
    await page.waitForSelector(".radiology-a4-sheet", { timeout: 15000 });
    await page.waitForTimeout(1200);

    const primaryPath = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primaryPath)) {
      try { fs.unlinkSync(primaryPath); } catch {}
    }
    await page.screenshot({ path: primaryPath, fullPage: false, animations: "allow", timeout: 15000 });
    for (let i = 1; i < targetDirs.length; i++) {
      const dest = path.join(targetDirs[i], fileName);
      try { fs.copyFileSync(primaryPath, dest); } catch {}
    }
    const stat = fs.statSync(primaryPath);
    console.log(`[CAPTURED ${theme.toUpperCase()}] ${fileName} — ${(stat.size / 1024).toFixed(1)} KB`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=== CAPTURING LIGHT THEME ===");
  await captureWindow5Theme("light", "05_window5_report_studio_a4_light.png");

  console.log("=== CAPTURING DARK THEME ===");
  await captureWindow5Theme("dark", "05_window5_report_studio_a4_dark.png");

  console.log("=== ALL CAPTURES COMPLETE ===");
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
