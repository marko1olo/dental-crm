const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  console.log("=== CAPTURING REAL PATIENT CBCT (ZAKHAROV 312 SLICES) WITH SHARPEN BUTTON ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const desktopDir = "C:\\Users\\Admin\\Desktop\\НОВЫЕ_ПРУФЫ_ВНЕДРЕНИЯ_ШАРПЕН_И_CATMULL_ROM";
  if (!fs.existsSync(desktopDir)) {
    fs.mkdirSync(desktopDir, { recursive: true });
  }

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_active_patient_id", "pat-1");
    });

    const page = await ctx.newPage();

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман" }],
          appointments: [],
        }),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2500);

    console.log("Triggering dente:open-cbct-demo event...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
    });

    console.log("Waiting for [data-testid=\"cbct-studio-modal\"]...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 35000 });
    console.log("Modal opened! Waiting for DICOM slices to decode...");

    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4000);

    // Locate sharpen button
    const sharpenBtn = await page.waitForSelector('[data-testid="cbct-tool-sharpen"]', { timeout: 10000 });
    const btnBox = await sharpenBtn.boundingBox();
    console.log("Sharpen button bounding box:", btnBox);

    const btnText0 = await sharpenBtn.innerText();
    console.log("Sharpen initial text:", btnText0);

    // Capture 0% Sharpen
    const path0 = path.join(desktopDir, "06_РЕАЛЬНЫЙ_КТ_Захаров_Sharpen_0_Выкл.png");
    await page.screenshot({ path: path0 });
    console.log("Saved 0% screenshot:", path0, `${(fs.statSync(path0).size / 1024).toFixed(1)} KB`);

    // Click to 50%
    await sharpenBtn.click();
    await page.waitForTimeout(1000);
    const btnText50 = await sharpenBtn.innerText();
    console.log("Sharpen after 1st click:", btnText50);

    const path50 = path.join(desktopDir, "06_РЕАЛЬНЫЙ_КТ_Захаров_Sharpen_50_Контур.png");
    await page.screenshot({ path: path50 });
    console.log("Saved 50% screenshot:", path50, `${(fs.statSync(path50).size / 1024).toFixed(1)} KB`);

    // Click to 100%
    await sharpenBtn.click();
    await page.waitForTimeout(1000);
    const btnText100 = await sharpenBtn.innerText();
    console.log("Sharpen after 2nd click:", btnText100);

    const path100 = path.join(desktopDir, "06_РЕАЛЬНЫЙ_КТ_Захаров_Sharpen_100_ЭНДО.png");
    await page.screenshot({ path: path100 });
    console.log("Saved 100% screenshot:", path100, `${(fs.statSync(path100).size / 1024).toFixed(1)} KB`);

    // Overwrite the previous defective 06 file on desktop
    const pathOld06 = path.join(desktopDir, "06_Полный_экран_КТ_Темный_кокпит_100_Sharpen.png");
    fs.copyFileSync(path100, pathOld06);
    console.log("Overwrote 06_Полный_экран_КТ_Темный_кокпит_100_Sharpen.png with REAL PATIENT CT!");

    // Also capture a crop of axial view with real teeth
    const axialCanvas = await page.$('canvas[data-testid*="axial"], canvas');
    if (axialCanvas) {
      const axialCropPath = path.join(desktopDir, "09_Макро_Срез_Зубов_Захаров_Эндо_Каналы.png");
      await axialCanvas.screenshot({ path: axialCropPath });
      console.log("Saved macro slice crop:", axialCropPath);
    }

  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
