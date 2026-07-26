const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const distDir = path.join(__dirname, '..', 'apps', 'web', 'dist');
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1fecd2ac-51cd-4ae1-bf1e-713d41b83fd7";

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
};

// 1. Create static HTTP server on port 5199
const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';
  const filePath = path.join(distDir, reqUrl);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback to index.html for SPA routing
    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
  }
});

const PORT = 5199;

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[HTTP SERVER] Running on http://127.0.0.1:${PORT}`);
  try {
    await captureScreenshots();
  } catch (err) {
    console.error("[FATAL SCREENSHOT ERROR]", err);
  } finally {
    server.close();
    console.log("[HTTP SERVER] Closed.");
    printFileStats();
  }
});

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });

  const views = [
    { id: 'shift', name: 'ShiftView' },
    { id: 'schedule', name: 'ScheduleView' },
    { id: 'patients', name: 'PatientsView' },
    { id: 'imaging', name: 'ImagingView' },
    { id: 'visit', name: 'VisitView' },
    { id: 'finance', name: 'FinanceView' }
  ];

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  async function ensureWorkspaceLoaded(page) {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clinicName: "Демо Клиника DENTE",
          todayIso: new Date().toISOString().split("T")[0],
          clinicSettings: {
            profile: {
              id: "demo-org",
              organizationId: "demo-org",
              clinicName: "Демо Клиника DENTE",
              legalName: "ООО Демо Клиника",
              timezone: "Europe/Moscow"
            },
            staff: [
              { id: "s-1", fullName: "Петров Иван Иванович", role: "owner", active: true }
            ],
            chairs: [
              { id: "c-1", name: "Кресло 1", active: true }
            ]
          },
          appointments: [],
          serviceCatalog: [],
          treatmentPlanScenarios: [],
          billingSummary: {
            totalPlannedRub: 150000,
            totalPaidRub: 50000,
            totalDueRub: 100000,
            unpaidDocuments: 1,
            taxDeductionEligibleRub: 50000
          }
        })
      });
    });

    await page.goto(`http://127.0.0.1:${PORT}/#shift`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate(() => {
      localStorage.setItem('dente_clinic_token', 'valid_demo_token');
      localStorage.setItem('dente_staff_token', 'valid_staff_token');
      localStorage.removeItem('dental-crm:onboarding:v1');
      localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, showFullOnboardingGuide: false }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForSelector('.workspace, .app-shell', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
  }

  async function navigateToView(page, viewId) {
    await page.evaluate((id) => {
      window.location.hash = id;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, viewId);
    await page.waitForTimeout(600);
  }

  function saveScreenshot(buffer, filename) {
    const mainPath = path.join(screenshotsDir, filename);
    const artPath = path.join(artifactDir, filename);
    fs.writeFileSync(mainPath, buffer);
    fs.writeFileSync(artPath, buffer);
  }

  // 1. PC Screenshots (1280x800)
  console.log("--- Capturing 12 PC Screenshots ---");
  const pcContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pcPage = await pcContext.newPage();
  await ensureWorkspaceLoaded(pcPage);

  for (const view of views) {
    await navigateToView(pcPage, view.id);

    // Light Mode
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode', 'dark');
      document.body.classList.add('light-mode', 'light');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    });
    await pcPage.waitForTimeout(400);
    const lightBuf = await pcPage.screenshot();
    saveScreenshot(lightBuf, `screen_pc_light_${view.id}.png`);

    // Dark Mode
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode', 'light');
      document.body.classList.add('dark-mode', 'dark');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
    });
    await pcPage.waitForTimeout(400);
    const darkBuf = await pcPage.screenshot();
    saveScreenshot(darkBuf, `screen_pc_dark_${view.id}.png`);
  }
  await pcContext.close();

  // 2. Mobile Screenshots (375x812)
  console.log("--- Capturing 12 Mobile Screenshots ---");
  const mobContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobPage = await mobContext.newPage();
  await ensureWorkspaceLoaded(mobPage);

  for (const view of views) {
    await navigateToView(mobPage, view.id);

    // Light Mode
    await mobPage.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode', 'dark');
      document.body.classList.add('light-mode', 'light');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    });
    await mobPage.waitForTimeout(400);
    const lightBuf = await mobPage.screenshot();
    saveScreenshot(lightBuf, `screen_mobile_light_${view.id}.png`);

    // Dark Mode
    await mobPage.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode', 'light');
      document.body.classList.add('dark-mode', 'dark');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
    });
    await mobPage.waitForTimeout(400);
    const darkBuf = await mobPage.screenshot();
    saveScreenshot(darkBuf, `screen_mobile_dark_${view.id}.png`);
  }
  await mobContext.close();

  await browser.close();
  console.log("Playwright capture finished.");
}

function printFileStats() {
  console.log("\n=======================================================");
  console.log("HARDWARE FILE SYSTEM STATS (C:\\Clinic_MVP\\dental-crm\\screenshots)");
  console.log("=======================================================");
  const files = fs.readdirSync(screenshotsDir).sort();
  for (const file of files) {
    const filePath = path.join(screenshotsDir, file);
    const stat = fs.statSync(filePath);
    console.log(`${file.padEnd(35)} | ${String(stat.size).padStart(8)} bytes | mtime: ${stat.mtime.toISOString()}`);
  }
  console.log("=======================================================\n");
}
