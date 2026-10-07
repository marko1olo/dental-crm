const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

const METHODS_LIST = [
  { id: "01_nearest", filename: "01_interpolation_nearest_512.png" },
  { id: "02_bilinear", filename: "02_interpolation_bilinear_512.png" },
  { id: "03_hermite", filename: "03_interpolation_hermite_512.png" },
  { id: "04_catmull_rom", filename: "04_interpolation_catmull_rom_512.png" },
  { id: "05_b_spline", filename: "05_interpolation_b_spline_512.png" },
  { id: "06_mitchell_netravali", filename: "06_interpolation_mitchell_netravali_512.png" },
  { id: "07_lanczos2", filename: "07_interpolation_lanczos2_512.png" },
  { id: "08_lanczos3", filename: "08_interpolation_lanczos3_512.png" },
  { id: "09_laplacian_sharpen", filename: "09_interpolation_laplacian_sharpen_512.png" },
  { id: "10_bilateral_edge_preserving", filename: "10_interpolation_bilateral_edge_preserving_512.png" },
];

async function run() {
  console.log("=== СЪЕМКА 10 ОТДЕЛЬНЫХ ПИКЧЕЙ МЕТОДОВ ИНТЕРПОЛЯЦИИ КТ (512x512) ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-rasterization"],
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 1600 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const url = "http://127.0.0.1:5173/cbct_interpolation_10_methods.html";
  console.log(`Загрузка страницы: ${url}`);

  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!res || res.status() !== 200) {
    throw new Error(`Ошибка загрузки: статус ${res ? res.status() : "нет ответа"}`);
  }

  // Ожидаем флаг завершения рендеринга всех 10 холстов
  console.log("Ожидание рендеринга 10 методов...");
  await page.waitForSelector("#render-complete-flag", { timeout: 25000 });
  await page.waitForTimeout(1000);

  const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
  const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const capturedFiles = [];
  const hashes = new Set();

  for (const item of METHODS_LIST) {
    const cardSelector = `#card-${item.id}`;
    const cardEl = await page.$(cardSelector);
    if (!cardEl) {
      throw new Error(`Элемент ${cardSelector} не найден!`);
    }

    const outPath = path.join(screenshotsDir, item.filename);
    await cardEl.screenshot({ path: outPath });

    const artPath = path.join(artifactDir, item.filename);
    fs.copyFileSync(outPath, artPath);

    const size = fs.statSync(outPath).size;
    const hash = getMd5(outPath);

    if (size < 40000) {
      throw new Error(`Картинка ${item.filename} слишком мала: ${size} байт < 40 КБ`);
    }
    if (hashes.has(hash)) {
      throw new Error(`Обнаружен дубликат хеша для ${item.filename}: ${hash}`);
    }
    hashes.add(hash);
    capturedFiles.push({ filename: item.filename, size, hash, outPath });
    console.log(`✓ [${item.id}] Сохранен: ${item.filename} (${size} байт, MD5: ${hash})`);
  }

  await browser.close();
  console.log("\n=== ВСЕ 10 ОТДЕЛЬНЫХ ПИКЧЕЙ УСПЕШНО СНЯТЫ И ПРОВЕРЕНЫ НА УНИКАЛЬНОСТЬ! ===");
}

run().catch((err) => {
  console.error("Ошибка при съемке 10 методов:", err);
  process.exit(1);
});
