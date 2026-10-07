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
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== expectedW || height !== expectedH) {
    throw new Error(`Invalid dimensions: ${width}x${height}`);
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

async function run() {
  console.log("=== ПЕРЕСЪЕМКА 10 СВОДНЫХ КВАДРАТОВ С ЧИСТОЙ ВЕРСТКОЙ И ЗУМОМ ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-rasterization"],
  });

  const page = await browser.newPage({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1,
  });

  await page.goto("http://127.0.0.1:5173/cbct_interpolation_gallery_512.html", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.initPromise);

  const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
  const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

  for (const methodId of METHODS) {
    const filename = `ct_512_composite_${methodId}.png`;
    const outPath = path.join(screenshotsDir, filename);
    const artPath = path.join(artifactDir, filename);

    await page.evaluate(async (m) => {
      await window.renderCompositeSquare(m);
    }, methodId);

    await page.waitForTimeout(50);

    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: 512, height: 512 },
    });

    fs.copyFileSync(outPath, artPath);
    const dims = verifyPngDimensions(outPath, 512, 512);
    const hash = getMd5(outPath);
    console.log(`✓ [${methodId}] Сохранен: ${filename} (${dims.width}x${dims.height}, MD5: ${hash})`);
  }

  await browser.close();
  console.log("=== ВСЕ 10 СВОДНЫХ КВАДРАТОВ УСПЕШНО ОБНОВЛЕНЫ ===");
}

run();
