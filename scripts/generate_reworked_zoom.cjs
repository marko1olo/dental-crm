const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const REWORKED_ICONS = [
  {
    id: "DentalHandpiece",
    name: "DentalHandpiece",
    title: "1. Стоматологический турбинный наконечник",
    subtitle: "Переработан с нуля: эргономичный contra-angle изгиб 45°, быстросъемная муфта, кнопочная крышка ротора и алмазный бор FG вниз",
    wasLabel: "БЫЛО: трубка-свисток / флешка",
    svgContent: `<path d="M3 20l5.5-5.5c1.2-1.2 2.5-1.5 4-1.5l3.5-1" />
<path d="M4.5 21.5l5.5-5.5c1-1 2.2-1.2 3.5-1.2l2.5-.8" />
<path d="M3 20c-.7.7-.7 1.8 0 2.5s1.8.7 2.5 0" />
<circle cx="7" cy="18" r=".6" fill="currentColor" />
<rect x="16" y="5.5" width="5.5" height="6.5" rx="1.2" />
<path d="M17.25 5.5c0-1.2.7-2 1.5-2s1.5.8 1.5 2" />
<line x1="18.75" y1="12" x2="18.75" y2="14.5" />
<rect x="18" y="14.5" width="1.5" height="6" rx=".75" />`
  },
  {
    id: "DentalVeneer",
    name: "DentalVeneer",
    title: "2. Керамический винир (микропротезирование)",
    subtitle: "Переработан с нуля: анатомический профиль резца в сагиттальном срезе, нёбный бугорок (cingulum), пульпарный канал, уступ chamfer и тонкая керамическая накладка",
    wasLabel: "БЫЛО: лепесток цветка / огонь",
    svgContent: `<path d="M9 21.5 C7 19 5.5 16 5 13.5 c-.5-2.5-.5-5 .5-8 .5-1.5 1.5-2.5 2-3 h2 l2 1.5 v9 c.8 0 2 .5 2.5 1.5 C13.5 17 11.5 19.5 9 21.5 Z" />
<path d="M14 14.5 c1.8-3.5 1.8-8.5-.5-12 H9.5" />
<path d="M8 19 C7.2 16 7 13 7 10" stroke-dasharray="1 1.5" />`
  },
  {
    id: "CuringLight",
    name: "CuringLight",
    title: "3. Фотополимеризационная лампа",
    subtitle: "Переработана с нуля: pen-style рукоятка с кнопкой, ортогональный защитный оранжевый диск-экран, изогнутый световод 70° и направленные лучи фотополимеризации",
    wasLabel: "БЫЛО: перекошенные ножки паука",
    svgContent: `<path d="M3 18c-.8.8-.8 1.8 0 2.5s1.8.8 2.5 0" />
<line x1="3" y1="18" x2="8.5" y2="12.5" />
<line x1="5.5" y1="20.5" x2="11" y2="15" />
<circle cx="6.5" cy="16.5" r=".8" fill="currentColor" />
<line x1="7.5" y1="10.5" x2="12.5" y2="15.5" stroke-width="2.5" stroke-linecap="round" />
<path d="M9.75 13.75 L13.5 10 c1.8-1.8 3.5-.8 4 1.5" />
<line x1="19.5" y1="12" x2="22.5" y2="14" />
<line x1="19.5" y1="10" x2="22.5" y2="11" />
<line x1="18" y1="13.5" x2="19.5" y2="16.5" />`
  }
];

function generateZoomHtml() {
  const cardsHtml = REWORKED_ICONS.map(icon => `
    <div class="icon-card">
      <div class="card-header">
        <div class="badge-num">RED TEAM РАУНД 2</div>
        <div class="card-title">${icon.title}</div>
        <div class="card-subtitle">${icon.subtitle}</div>
      </div>
      
      <div class="preview-row">
        <!-- 96px Ultra Close-up -->
        <div class="size-box">
          <div class="box-label">96px (Ultra Macro)</div>
          <div class="icon-frame" style="width: 120px; height: 120px;">
            <svg class="preview-svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              ${icon.svgContent}
            </svg>
          </div>
        </div>

        <!-- 48px Hero View -->
        <div class="size-box">
          <div class="box-label">48px (Hero Tile)</div>
          <div class="icon-frame" style="width: 80px; height: 80px;">
            <svg class="preview-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              ${icon.svgContent}
            </svg>
          </div>
        </div>

        <!-- 24px Lucide Canon -->
        <div class="size-box">
          <div class="box-label">24px (Канон Lucide)</div>
          <div class="icon-frame" style="width: 56px; height: 56px;">
            <svg class="preview-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              ${icon.svgContent}
            </svg>
          </div>
        </div>

        <!-- 16px Micro Button -->
        <div class="size-box">
          <div class="box-label">16px (Интерфейс)</div>
          <div class="icon-frame" style="width: 48px; height: 48px;">
            <svg class="preview-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              ${icon.svgContent}
            </svg>
          </div>
        </div>
      </div>
    </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>DENTE — 3 переработанные стоматологические иконки (Zoom-In)</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --card-border: #1e293b;
      --frame-bg: #1e293b;
      --frame-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --tag-bg: rgba(56, 189, 248, 0.15);
      --tag-text: #38bdf8;
    }
    body.light-theme {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --frame-bg: #f1f5f9;
      --frame-border: #cbd5e1;
      --text: #0f172a;
      --text-muted: #64748b;
      --accent: #0284c7;
      --tag-bg: #e0f2fe;
      --tag-text: #0284c7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 36px 32px;
      line-height: 1.5;
    }
    .header {
      max-width: 1200px;
      margin: 0 auto 32px;
      padding: 24px 28px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      background: var(--tag-bg);
      color: var(--tag-text);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .icon-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px 28px;
    }
    .card-header {
      margin-bottom: 20px;
    }
    .badge-num {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      padding: 2px 8px;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
    }
    .card-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
      max-width: 800px;
    }
    .preview-row {
      display: flex;
      align-items: flex-end;
      gap: 28px;
      padding-top: 12px;
      border-top: 1px solid var(--card-border);
    }
    .size-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .box-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .icon-frame {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--frame-bg);
      border: 1px solid var(--frame-border);
      border-radius: 12px;
      color: var(--text);
      transition: all 0.2s ease;
    }
    .preview-svg {
      color: var(--text);
    }
  </style>
</head>
<body class="dark-theme">
  <div class="header">
    <div>
      <h1 class="header-title">DENTE CRM — Приемка 3 переработанных стоматологических иконок</h1>
      <p class="header-desc">Хирургическая переработка по замечаниям Red Team: Турбинный наконечник, Керамический винир, Фотополимеризационная лампа</p>
    </div>
    <div class="badge">Red Team Round 2 — 100% Вектор Lucide</div>
  </div>

  <div class="container">
    ${cardsHtml}
  </div>
</body>
</html>`;
}

async function main() {
  const htmlPath = path.resolve('docs/screenshots/dental_icons_reworked_zoom.html');
  const html = generateZoomHtml();
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`Saved zoom HTML to: ${htmlPath}`);

  const browserCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const executablePath = browserCandidates.find(p => fs.existsSync(p));
  console.log(`Using browser: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1260, height: 980, deviceScaleFactor: 2 });
    const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // 1. Dark
    const darkPath = path.resolve('docs/screenshots/dental_icons_reworked_zoom_dark.png');
    await page.evaluate(() => { document.body.className = 'dark-theme'; });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: darkPath, fullPage: true });
    console.log(`Saved Dark zoom to: ${darkPath}`);

    // 2. Light
    const lightPath = path.resolve('docs/screenshots/dental_icons_reworked_zoom_light.png');
    await page.evaluate(() => { document.body.className = 'light-theme'; });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: lightPath, fullPage: true });
    console.log(`Saved Light zoom to: ${lightPath}`);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("Zoom generator failed:", err);
  process.exit(1);
});
