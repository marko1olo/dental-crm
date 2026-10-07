const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

function verifyPngDimensions(filePath, expectedW = 512, expectedH = 512) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) throw new Error(`Файл ${filePath} поврежден: < 24 байт`);
  const magic = buf.subarray(0, 8);
  if (magic.toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`Файл ${filePath} не является валидным PNG!`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== expectedW || height !== expectedH) {
    throw new Error(`ФАЛЬСИФИКАЦИЯ РАЗРЕШЕНИЯ: ${filePath} имеет размер ${width}x${height}, ожидалось СТРОГО ${expectedW}x${expectedH}!`);
  }
  return { width, height };
}

const METHODS = [
  "01_nearest",
  "02_bilinear",
  "03_hermite",
  "04_catmull_rom",
  "05_b_spline",
  "06_mitchell_netravali",
  "07_lanczos2",
  "08_lanczos3",
  "09_laplacian_sharpen",
  "10_bilateral_edge_preserving",
];

const LEVELS = [
  "L1_crowns",
  "L2_pulp",
  "L3_canals",
  "L4_apices",
  "L5_bone",
];

async function run() {
  console.log("======================================================================");
  console.log("СЪЕМКА 50 АНАТОМИЧЕСКИХ СРЕЗОВ + 10 СВОДНЫХ КВАДРАТОВ КТ (СТРОГО 512x512)");
  console.log("======================================================================");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-rasterization"],
  });

  const context = await browser.newContext({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const url = "http://127.0.0.1:5173/cbct_interpolation_gallery_512.html";
  console.log(`Загрузка страницы генератора: ${url}`);

  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!res || res.status() !== 200) {
    throw new Error(`Ошибка загрузки: статус ${res ? res.status() : "нет ответа"}`);
  }

  console.log("Ожидание предзагрузки всех 5 уровней КТ в память браузера...");
  await page.evaluate(() => window.initPromise);
  console.log("Все 5 уровней КТ успешно загружены!");

  const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
  const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const hashes = new Set();
  const singleSliceResults = [];
  const compositeResults = [];

  // =========================================================================
  // ЭТАП 1: 50 ОТДЕЛЬНЫХ СРЕЗОВ (10 методов x 5 анатомических уровней)
  // =========================================================================
  console.log("\n--- ЭТАП 1: Съемка 50 анатомических срезов 512x512 ---");
  for (const methodId of METHODS) {
    for (const levelId of LEVELS) {
      const filename = `ct_512_${methodId}_${levelId}.png`;
      const outPath = path.join(screenshotsDir, filename);
      const artPath = path.join(artifactDir, filename);

      // Отрисовываем метод и уровень с гарантией двойного requestAnimationFrame
      await page.evaluate(async ({ m, l }) => {
        await window.renderSingleSlice(m, l);
      }, { m: methodId, l: levelId });

      await page.waitForTimeout(40);

      await page.screenshot({
        path: outPath,
        clip: { x: 0, y: 0, width: 512, height: 512 },
      });

      fs.copyFileSync(outPath, artPath);

      const size = fs.statSync(outPath).size;
      const hash = getMd5(outPath);
      const dims = verifyPngDimensions(outPath, 512, 512);

      if (size < 40000) {
        throw new Error(`Картинка ${filename} слишком мала: ${size} байт < 40 КБ`);
      }
      if (hashes.has(hash)) {
        throw new Error(`Обнаружен дубликат хеша для ${filename}: ${hash}`);
      }
      hashes.add(hash);

      singleSliceResults.push({ methodId, levelId, filename, size, hash, width: dims.width, height: dims.height });
      console.log(`[${singleSliceResults.length}/50] ✓ ${filename} (${dims.width}x${dims.height}, ${size} байт, MD5: ${hash})`);
    }
  }

  // =========================================================================
  // ЭТАП 2: 10 СВОДНЫХ КВАДРАТОВ (по 1 для каждого метода, 4 квадранта уровней)
  // =========================================================================
  console.log("\n--- ЭТАП 2: Съемка 10 сводных квадратов 512x512 ---");
  for (const methodId of METHODS) {
    const filename = `ct_512_composite_${methodId}.png`;
    const outPath = path.join(screenshotsDir, filename);
    const artPath = path.join(artifactDir, filename);

    // Отрисовываем сводный квадрат
    await page.evaluate(async (m) => {
      await window.renderCompositeSquare(m);
    }, methodId);

    await page.waitForTimeout(40);

    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: 512, height: 512 },
    });

    fs.copyFileSync(outPath, artPath);

    const size = fs.statSync(outPath).size;
    const hash = getMd5(outPath);
    const dims = verifyPngDimensions(outPath, 512, 512);

    if (size < 40000) {
      throw new Error(`Картинка ${filename} слишком мала: ${size} байт < 40 КБ`);
    }
    if (hashes.has(hash)) {
      throw new Error(`Обнаружен дубликат хеша для ${filename}: ${hash}`);
    }
    hashes.add(hash);

    compositeResults.push({ methodId, filename, size, hash, width: dims.width, height: dims.height });
    console.log(`[${compositeResults.length}/10] ✓ ${filename} (${dims.width}x${dims.height}, ${size} байт, MD5: ${hash})`);
  }

  await browser.close();

  // Сохраняем итоговый манифест генерации
  const manifestPath = path.join(screenshotsDir, "ct_512_generation_manifest.json");
  const manifestData = {
    totalImages: singleSliceResults.length + compositeResults.length,
    singleSlicesCount: singleSliceResults.length,
    compositesCount: compositeResults.length,
    resolution: "512x512",
    dataset: "Zakharov I.D. (Real CBCT DICOM)",
    methods: METHODS,
    levels: LEVELS,
    singleSliceResults,
    compositeResults,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf8");

  console.log("\n======================================================================");
  console.log(`УСПЕШНО СНЯТО И ПРОВЕРЕНО ВСЕГО: ${manifestData.totalImages} ПИКЧЕЙ СТРОГО 512x512!`);
  console.log(`- Отдельных срезов по анатомическим уровням: ${singleSliceResults.length}`);
  console.log(`- Сводных квадратов для каждого метода: ${compositeResults.length}`);
  console.log(`- Все размеры строго 512x512 px (доказано IHDR заголовками).`);
  console.log(`- Все 60 MD5 хешей строго уникальны!`);
  console.log("======================================================================");
}

run().catch((err) => {
  console.error("ОШИБКА генерации срезов:", err);
  process.exit(1);
});
