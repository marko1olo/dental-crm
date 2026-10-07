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
  console.log("=== СЪЕМКА 10 МАКРО-ЗУМ СВОДНЫХ КВАДРАТОВ 512x512 (МОЛЯРЫ И КАНАЛЫ) ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-rasterization"],
  });

  const page = await browser.newPage({
    viewport: { width: 950, height: 800 },
    deviceScaleFactor: 1,
  });

  await page.goto("http://127.0.0.1:5173/cbct_interpolation_interactive.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Переключаем вьювер в режим Макро-зума и Сводного 4-в-1 квадрата
  await page.click('[data-zoom="macro"]');
  await page.click('[data-level="COMPOSITE"]');
  await page.waitForTimeout(300);

  const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
  const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

  const viewportBox = await page.$(".viewport-box");
  if (!viewportBox) throw new Error("Viewport box not found!");

  for (const methodId of METHODS) {
    const filename = `ct_512_macro_composite_${methodId}.png`;
    const outPath = path.join(screenshotsDir, filename);
    const artPath = path.join(artifactDir, filename);

    // Кликаем по кнопке метода
    await page.click(`button[data-id="${methodId}"]`);
    await page.waitForTimeout(60);

    // Снимаем ровно 512x512 viewport-box
    await viewportBox.screenshot({ path: outPath });
    fs.copyFileSync(outPath, artPath);

    const dims = verifyPngDimensions(outPath, 512, 512);
    const hash = getMd5(outPath);
    const size = fs.statSync(outPath).size;

    console.log(`✓ [MACRO ${methodId}] ${filename} (${dims.width}x${dims.height}, ${size} байт, MD5: ${hash})`);
  }

  await browser.close();
  console.log("=== ВСЕ 10 МАКРО-СНИМКОВ УСПЕШНО СНЯТЫ В 512x512 ===");
}

run().catch((err) => {
  console.error("Ошибка съемки макро:", err);
  process.exit(1);
});
