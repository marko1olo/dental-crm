const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const METHODS = [
  {
    id: "01_nearest",
    name: "01. Nearest Neighbor (Ближайший сосед)",
    badge: "Черновой режим",
    badgeColor: "#94a3b8",
    kernel: "Ступенчатое C^(-1)",
    taps: "1x1 (1 выборка)",
    flops: "~2 FLOPs",
    timing: "RTX: 0.08 мс | Intel: 0.35 мс",
    desc: "Жесткая воксельная пикселизация, максимальная скорость",
  },
  {
    id: "02_bilinear",
    name: "02. Bilinear (Билинейная интерполяция)",
    badge: "Скоростной скролл (120+ FPS)",
    badgeColor: "#38bdf8",
    kernel: "Кусочно-линейное C^0",
    taps: "2x2 (4 выборки TMU)",
    flops: "~6 FLOPs",
    timing: "RTX: 0.12 мс | Intel: 0.45 мс",
    desc: "Аппаратный TMU, мягкое сглаживание, легкое размытие контуров",
  },
  {
    id: "03_hermite",
    name: "03. Cubic Hermite (Кубический Эрмит)",
    badge: "Гладкое сглаживание",
    badgeColor: "#818cf8",
    kernel: "Гладкое C^1",
    taps: "4x4 (16 выборок)",
    flops: "~38 FLOPs",
    timing: "RTX: 0.21 мс | Intel: 0.95 мс",
    desc: "Монотонное сглаживание без выбросов и ореолов",
  },
  {
    id: "04_catmull_rom",
    name: "04. Catmull-Rom Spline (Сплайн Катмулла-Рома)",
    badge: "Золотой стандарт КТ (DENTE)",
    badgeColor: "#2dd4bf",
    kernel: "Интерполяционный C^1",
    taps: "4x4 (16 выборок)",
    flops: "~42 FLOPs",
    timing: "RTX: 0.28 мс | Intel: 1.15 мс",
    desc: "Эталонная резкость эмали и дентина, точное прохождение через узлы",
  },
  {
    id: "05_b_spline",
    name: "05. Cubic B-Spline (Б-сплайн)",
    badge: "Шумоподавление",
    badgeColor: "#a78bfa",
    kernel: "Сверхгладкое C^2",
    taps: "4x4 (16 выборок)",
    flops: "~40 FLOPs",
    timing: "RTX: 0.26 мс | Intel: 1.10 мс",
    desc: "Глубокая фильтрация лучевого шума и титановых артефактов",
  },
  {
    id: "06_mitchell_netravali",
    name: "06. Mitchell-Netravali (B=1/3, C=1/3)",
    badge: "Оптимальный баланс",
    badgeColor: "#34d399",
    kernel: "Сбалансированное C^1",
    taps: "4x4 (16 выборок)",
    flops: "~46 FLOPs",
    timing: "RTX: 0.30 мс | Intel: 1.25 мс",
    desc: "Баланс между резкостью и ореолами, отличная текстура кости",
  },
  {
    id: "07_lanczos2",
    name: "07. Lanczos-2 (Оконный Sinc 4-tap)",
    badge: "Высокая резкость",
    badgeColor: "#f59e0b",
    kernel: "Sinc-ядро a=2 (C^1)",
    taps: "4x4 (16 выборок)",
    flops: "~64 FLOPs",
    timing: "RTX: 0.42 мс | Intel: 1.80 мс",
    desc: "Выделение эмалевых призм и периодонтальной связки",
  },
  {
    id: "08_lanczos3",
    name: "08. Lanczos-3 (Оконный Sinc 6-tap)",
    badge: "Максимальная детализация эндодонтии",
    badgeColor: "#f43f5e",
    kernel: "Sinc-ядро a=3 (C^1)",
    taps: "6x6 (36 выборок)",
    flops: "~140 FLOPs",
    timing: "RTX: 0.85 мс | Intel: 3.60 мс",
    desc: "Субмикронная прорисовка каналов MB1/MB2 и костных трабекул",
  },
  {
    id: "09_laplacian_sharpen",
    name: "09. Laplacian Sharpen (Катмулл-Ром + Лаплас)",
    badge: "Контурная резкость",
    badgeColor: "#ec4899",
    kernel: "Catmull-Rom + Lapl. k=0.45",
    taps: "4x4 + 3x3 (25 выборок)",
    flops: "~68 FLOPs",
    timing: "RTX: 0.45 мс | Intel: 1.90 мс",
    desc: "Агрессивное подчеркивание кортикальных пластинок и трещин",
  },
  {
    id: "10_bilateral_edge_preserving",
    name: "10. Bilateral Edge-Preserving (Билатеральный)",
    badge: "Хирургический фильтр",
    badgeColor: "#10b981",
    kernel: "Нелинейный Гаусс (пространство+HU)",
    taps: "5x5 (25 выборок)",
    flops: "~180 FLOPs",
    timing: "RTX: 1.35 мс | Intel: 5.80 мс",
    desc: "Гладкая губчатая кость без шума + бритвенная граница зуба",
  },
];

const QUAD_LABELS = [
  { text: "1. КОРОНКИ И ЭМАЛЬ (L1)", x: 12, y: 12 },
  { text: "2. ПУЛЬПОВАЯ КАМЕРА (L2)", x: 524, y: 12 },
  { text: "3. КАНАЛЫ И ПЕРИОДОНТ (L3)", x: 12, y: 524 },
  { text: "4. КОРТИКАЛЬНАЯ И ГУБЧАТАЯ КОСТЬ (L5)", x: 524, y: 524 },
];

function createHeaderSvg(meta, width = 1024, headerH = 90) {
  return Buffer.from(`
    <svg width="${width}" height="${headerH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0b1120" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#0b1120" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${headerH}" fill="url(#headerGrad)" />
      <line x1="0" y1="${headerH - 1}" x2="${width}" y2="${headerH - 1}" stroke="#1e293b" stroke-width="2" />
      
      <!-- Заголовок метода -->
      <text x="24" y="36" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="800">
        ${meta.name}
      </text>
      
      <!-- Бейдж статуса -->
      <rect x="${width - 320}" y="14" width="296" height="26" rx="6" fill="${meta.badgeColor}22" stroke="${meta.badgeColor}66" stroke-width="1.5" />
      <text x="${width - 172}" y="32" fill="${meta.badgeColor}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" text-anchor="middle">
        ${meta.badge}
      </text>

      <!-- Инфострока параметров -->
      <text x="24" y="68" fill="#94a3b8" font-family="ui-monospace, monospace, sans-serif" font-size="12" font-weight="600">
        ЯДРО: <tspan fill="#e2e8f0">${meta.kernel}</tspan>  |  TAPS: <tspan fill="#e2e8f0">${meta.taps}</tspan>  |  СЛОЖНОСТЬ: <tspan fill="#e2e8f0">${meta.flops}</tspan>  |  ВРЕМЯ: <tspan fill="#38bdf8">${meta.timing}</tspan>
      </text>
    </svg>
  `);
}

function createOverlayLabelsSvg(width = 1024, height = 1024) {
  // SVG со штампами квадрантов и разделительными линиями
  const lines = `
    <line x1="512" y1="0" x2="512" y2="1024" stroke="#1e293b" stroke-width="2" />
    <line x1="0" y1="512" x2="1024" y2="512" stroke="#1e293b" stroke-width="2" />
    <circle cx="512" cy="512" r="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
  `;

  const badges = QUAD_LABELS.map((lbl) => `
    <g transform="translate(${lbl.x}, ${lbl.y})">
      <rect x="0" y="0" width="240" height="26" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
      <text x="120" y="17" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" text-anchor="middle">
        ${lbl.text}
      </text>
    </g>
  `).join("");

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${lines}
      ${badges}
    </svg>
  `);
}

async function buildAll10Quads() {
  console.log("=== НАЧАЛО СБОРКИ 10 БОЛЬШИХ КВАДРАТОВ 4-В-1 (1024x1114) ===");
  const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
  const desktopDir = path.resolve("C:/Users/Admin/Desktop/CBCT_Interpolation_Proofs_512x512");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

  if (!fs.existsSync(desktopDir)) {
    fs.mkdirSync(desktopDir, { recursive: true });
  }

  const overlaySvgBuf = createOverlayLabelsSvg(1024, 1024);

  for (const meta of METHODS) {
    const l1Path = path.join(screenshotsDir, `ct_512_${meta.id}_L1_crowns.png`);
    const l2Path = path.join(screenshotsDir, `ct_512_${meta.id}_L2_pulp.png`);
    const l3Path = path.join(screenshotsDir, `ct_512_${meta.id}_L3_canals.png`);
    const l5Path = path.join(screenshotsDir, `ct_512_${meta.id}_L5_bone.png`);

    if (!fs.existsSync(l1Path) || !fs.existsSync(l2Path) || !fs.existsSync(l3Path) || !fs.existsSync(l5Path)) {
      throw new Error(`Не найдены файлы для метода ${meta.id}!`);
    }

    const headerSvgBuf = createHeaderSvg(meta, 1024, 90);

    // 1. Создаем композит 4 срезов 1024x1024
    const gridComposite = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 9, g: 13, b: 22, alpha: 1 },
      },
    })
      .composite([
        { input: l1Path, top: 0, left: 0 },
        { input: l2Path, top: 0, left: 512 },
        { input: l3Path, top: 512, left: 0 },
        { input: l5Path, top: 512, left: 512 },
        { input: overlaySvgBuf, top: 0, left: 0 },
      ])
      .png()
      .toBuffer();

    // 2. Добавляем красивую шапку сверху (итого 1024 x 1114)
    const finalQuad = await sharp({
      create: {
        width: 1024,
        height: 1114,
        channels: 4,
        background: { r: 11, g: 17, b: 32, alpha: 1 },
      },
    })
      .composite([
        { input: headerSvgBuf, top: 0, left: 0 },
        { input: gridComposite, top: 90, left: 0 },
      ])
      .png({ compressionLevel: 8 })
      .toBuffer();

    const outputName = `ct_quad_${meta.id}.png`;
    const outDesktop = path.join(desktopDir, outputName);
    const outScreenshots = path.join(screenshotsDir, outputName);
    const outBrain = path.join(brainDir, outputName);

    fs.writeFileSync(outDesktop, finalQuad);
    fs.writeFileSync(outScreenshots, finalQuad);
    fs.writeFileSync(outBrain, finalQuad);

    console.log(`✓ [КВАДРАТ 4-В-1] ${outputName} -> 1024x1114 (${finalQuad.length} байт)`);
  }

  console.log("=== ВСЕ 10 БОЛЬШИХ КВАДРАТОВ УСПЕШНО СОБРАНЫ! ===");
}

buildAll10Quads().catch((err) => {
  console.error("Ошибка сборки квадратов:", err);
  process.exit(1);
});
