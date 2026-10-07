/**
 * scripts/capture_dental_lab_inquisition_proofs.cjs
 * Red Team Adversarial Playwright Screenshot Script for Dental Lab (ЗТЛ).
 * Uses Edge ({ channel: 'msedge' }) at 1440x900 PC Desktop Light and Dark.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const http = require("node:http");

const BRAIN_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d4d1db62-9bc2-40af-956e-fdf46ad1706e";
const PROOFS_DIR = path.resolve(__dirname, "../proofs");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}
if (!fs.existsSync(BRAIN_DIR)) {
  fs.mkdirSync(BRAIN_DIR, { recursive: true });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/lab_orders_preview.html`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findActivePort() {
  for (const port of [5174, 5173, 3000]) {
    const ok = await checkPort(port);
    if (ok) return port;
  }
  return 5174;
}

function computeMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

async function takeProof(page, filename, description) {
  const primaryPath = path.join(PROOFS_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);

  await page.screenshot({ path: primaryPath, fullPage: false });
  fs.copyFileSync(primaryPath, brainPath);

  const stats = fs.statSync(primaryPath);
  const hash = computeMd5(primaryPath);

  console.log(`\n📸 CAPTURED PROOF: ${filename}`);
  console.log(`   Description: ${description}`);
  console.log(`   Size: ${Math.round(stats.size / 1024)} KB (${stats.size} bytes)`);
  console.log(`   MD5:  ${hash}`);
  console.log(`   Path: ${primaryPath}`);

  if (stats.size < 40000) {
    console.warn(`⚠️ WARNING: Screenshot ${filename} is smaller than 40KB (${stats.size} bytes)!`);
  }

  return { filename, primaryPath, brainPath, size: stats.size, hash, description };
}

async function configureTheme(page, mode = "light") {
  await page.evaluate((themeMode) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
    document.body.className = `theme-${themeMode} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
    localStorage.setItem("dente_theme_mode", themeMode);
  }, mode);
  await page.waitForTimeout(400);
}

async function main() {
  console.log("==================================================================");
  console.log("RED TEAM PLAYWRIGHT EDGE SCREENSHOT CAPTURE: DENTAL LAB (ЗТЛ)");
  console.log("==================================================================");

  const port = await findActivePort();
  console.log(`>>> Detected active frontend server on port: ${port}`);

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const proofs = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_pending_lab_order_draft", "");
    });

    const page = await context.newPage();

    // ─── 1. Реестр нарядов ЗТЛ: DentalLabOrdersView (Desktop Light) ───
    console.log(`\n>>> Step 1: Navigating to Lab Orders View Light (port ${port})...`);
    await page.goto(`http://127.0.0.1:${port}/lab_orders_preview.html?tab=registry&theme=light`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await configureTheme(page, "light");
    await page.waitForSelector('[data-testid="dental-lab-orders-view"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="dental-lab-courier-dispatch-bar"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="lab-orders-dense-table"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    const p1 = await takeProof(
      page,
      "dental_lab_01_orders_view_desktop_light.png",
      "Реестр ЗТЛ (DentalLabOrdersView) PC Light: 1-строчный тулбар 36px, курьерская панель, сегментированные фильтры 5 этапов, таблица 32px"
    );
    proofs.push(p1);

    // ─── 2. Реестр нарядов ЗТЛ: DentalLabOrdersView (Desktop Dark) ───
    console.log("\n>>> Step 2: Switching to Lab Orders View Dark...");
    await configureTheme(page, "dark");
    await page.waitForTimeout(600);

    const p2 = await takeProof(
      page,
      "dental_lab_02_orders_view_desktop_dark.png",
      "Реестр ЗТЛ (DentalLabOrdersView) PC Dark: глубокая тёмная тема, высокая контрастность бейджей, курьерская панель, таблица 32px"
    );
    proofs.push(p2);

    // ─── 3. Прайс-матрица ЗТЛ: DentalLabPriceMatrixModal (Desktop Light) ───
    console.log("\n>>> Step 3: Opening Price Matrix Modal...");
    await configureTheme(page, "light");
    const priceMatrixBtn = await page.$('[data-testid="btn-open-price-matrix"]');
    if (priceMatrixBtn) {
      await priceMatrixBtn.click({ force: true });
      await page.waitForSelector('[data-testid="dental-lab-price-matrix-modal"]', { timeout: 10000 });
      await page.waitForTimeout(600);

      const p3 = await takeProof(
        page,
        "dental_lab_03_price_matrix_modal_desktop_light.png",
        "Прейскурант и себестоимость ЗТЛ (DentalLabPriceMatrixModal) PC Light: 8 клинических типов (ZrO2, e.max, элайнеры, бюгели), маржа клиники"
      );
      proofs.push(p3);

      // Закрываем модалку прайса
      const closeBtn = await page.$('[data-testid="btn-close-price-matrix"]');
      if (closeBtn) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(400);
      }
    } else {
      console.warn("⚠️ btn-open-price-matrix not found on page!");
    }

    // ─── 4. Модалка наряд-заказа ЗТЛ: DentalLabWorkOrderModal (Desktop Light) ───
    console.log("\n>>> Step 4: Opening Work Order Modal Light...");
    const newOrderBtn = await page.$('[data-testid="lab-orders-new-order-btn"]');
    if (newOrderBtn) {
      await newOrderBtn.click({ force: true });
      await page.waitForSelector('[data-testid="dental-lab-work-order-modal"]', { timeout: 10000 });
      await page.waitForTimeout(600);

      const p4 = await takeProof(
        page,
        "dental_lab_04_work_order_modal_desktop_light.png",
        "Создание наряд-заказа ЗТЛ (DentalLabWorkOrderModal) PC Light: ортопедические конструкции, расцветка VITA Classical/Bleach, Мандат 8e"
      );
      proofs.push(p4);

      // ─── 5. Модалка наряд-заказа ЗТЛ: DentalLabWorkOrderModal (Desktop Dark) ───
      console.log("\n>>> Step 5: Work Order Modal Dark...");
      await configureTheme(page, "dark");
      await page.waitForTimeout(600);

      const p5 = await takeProof(
        page,
        "dental_lab_05_work_order_modal_desktop_dark.png",
        "Создание наряд-заказа ЗТЛ (DentalLabWorkOrderModal) PC Dark: тёмный контрастный интерфейс, выбор оттенков VITA, расчет себестоимости"
      );
      proofs.push(p5);
    } else {
      console.warn("⚠️ lab-orders-new-order-btn not found on page!");
    }

    console.log("\n==================================================================");
    console.log(`TOTAL PROOFS CAPTURED: ${proofs.length}`);
    console.log("==================================================================");

    // Write manifest JSON
    const manifestPath = path.join(PROOFS_DIR, "dental_lab_proofs_manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(proofs, null, 2));
    console.log(`Manifest written to: ${manifestPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
