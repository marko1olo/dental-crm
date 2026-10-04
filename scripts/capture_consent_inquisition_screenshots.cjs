/**
 * scripts/capture_consent_inquisition_screenshots.cjs
 * Автономный Red Team скрипт снятия скриншотов честных информированных согласий (ИДС):
 * - Paper Physical Mode (Empty State скана, unconfirmed status)
 * - Tablet Touch Pad Mode (Blank canvas, disabled CTA, unsigned telemetry)
 * - SMS OTP Mode (4-digit code, status)
 * - Mobile Touch (390x844 Apple HIG)
 * - Light & Dark темы
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

async function findActivePort() {
  const candidatePorts = [5173, 5174, 5175];
  for (const port of candidatePorts) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/consent_signing_preview.html`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return port;
    } catch {}
  }
  return 5173;
}

async function main() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const activePort = await findActivePort();
  const baseUrl = `http://127.0.0.1:${activePort}`;
  console.log(`>>> Detected active preview server at: ${baseUrl}`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const execPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`>>> Launching browser from: ${execPath}`);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  try {
    const page = await browser.newPage();

    // ─── 1. ДЕСКТОП: БУМАЖНЫЙ РЕЖИМ (LIGHT) ───
    await page.setViewport({ width: 1440, height: 960 });
    console.log(">>> Navigating to Paper Mode (Light)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=light&method=paper_physical`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="paper-scan-upload-container"]', { visible: true, timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('.consent-paper-box')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const paperLightPath = path.join(outputDir, "proof_consent_paper_empty_state_light.png");
    await page.screenshot({ path: paperLightPath, fullPage: false });
    console.log(`>>> Captured: ${paperLightPath} (${fs.statSync(paperLightPath).size} bytes)`);

    // ─── 2. ДЕСКТОП: БУМАЖНЫЙ РЕЖИМ (DARK) ───
    console.log(">>> Navigating to Paper Mode (Dark)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=dark&method=paper_physical`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="paper-scan-upload-container"]', { visible: true, timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('.consent-paper-box')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const paperDarkPath = path.join(outputDir, "proof_consent_paper_empty_state_dark.png");
    await page.screenshot({ path: paperDarkPath, fullPage: false });
    console.log(`>>> Captured: ${paperDarkPath} (${fs.statSync(paperDarkPath).size} bytes)`);

    // ─── 3. ДЕСКТОП: ПЛАНШЕТ/РОСПИСЬ (LIGHT) ───
    console.log(">>> Navigating to Tablet Stylus Mode (Light)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=light&method=tablet_stylus`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="consent-vector-pad-svg"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="status-tablet-unsigned"]', { visible: true, timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('.consent-paper-box')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const tabletLightPath = path.join(outputDir, "proof_consent_tablet_empty_state_light.png");
    await page.screenshot({ path: tabletLightPath, fullPage: false });
    console.log(`>>> Captured: ${tabletLightPath} (${fs.statSync(tabletLightPath).size} bytes)`);

    // ─── 4. ДЕСКТОП: ПЛАНШЕТ/РОСПИСЬ (DARK) ───
    console.log(">>> Navigating to Tablet Stylus Mode (Dark)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=dark&method=tablet_stylus`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="consent-vector-pad-svg"]', { visible: true, timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('.consent-paper-box')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const tabletDarkPath = path.join(outputDir, "proof_consent_tablet_empty_state_dark.png");
    await page.screenshot({ path: tabletDarkPath, fullPage: false });
    console.log(`>>> Captured: ${tabletDarkPath} (${fs.statSync(tabletDarkPath).size} bytes)`);

    // ─── 5. ДЕСКТОП: СМС-КОД 4 ЗНАКА (LIGHT) ───
    console.log(">>> Navigating to SMS Mode (Light)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=light&method=sms_otp`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    const smsTab = await page.$('[data-testid="tab-method-sms"]');
    if (smsTab) {
      await smsTab.click();
    }
    await page.waitForSelector('[data-testid="input-sms-otp-code"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('[data-testid="input-sms-otp-code"]')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const smsLightPath = path.join(outputDir, "proof_consent_sms_empty_state_light.png");
    await page.screenshot({ path: smsLightPath, fullPage: false });
    console.log(`>>> Captured: ${smsLightPath} (${fs.statSync(smsLightPath).size} bytes)`);

    // ─── 6. МОБИЛЬНЫЙ У КРЕСЛА (APPLE HIG 390x844 LIGHT) ───
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    console.log(">>> Navigating to Mobile Touch (Light)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=light&method=tablet_stylus`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="btn-confirm-sign-mobile"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('.consent-touch-signature-box, .consent-vector-pad')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const mobileLightPath = path.join(outputDir, "proof_consent_mobile_light.png");
    await page.screenshot({ path: mobileLightPath, fullPage: false });
    console.log(`>>> Captured: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // ─── 7. МОБИЛЬНЫЙ У КРЕСЛА (APPLE HIG 390x844 DARK) ───
    console.log(">>> Navigating to Mobile Touch (Dark)...");
    await page.goto(`${baseUrl}/consent_signing_preview.html?theme=dark&method=tablet_stylus`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="btn-confirm-sign-mobile"]', { timeout: 15000 });
    await page.evaluate(() => {
      document.querySelector('.consent-touch-signature-box, .consent-vector-pad')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 1500));
    const mobileDarkPath = path.join(outputDir, "proof_consent_mobile_dark.png");
    await page.screenshot({ path: mobileDarkPath, fullPage: false });
    console.log(`>>> Captured: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    console.log(">>> All 7 Red Team screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(">>> Error capturing screenshots:", err);
  process.exit(1);
});
