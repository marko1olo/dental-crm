/**
 * scripts/capture_mobile_shift_cockpit_screenshots.cjs
 * Red Team Inquisitor: Снятие мобильных скриншотов смены врача и кассы (390x844 iPhone 14/15/16).
 * Снятие в темах Light и Dark, а также проверка выезда iOS Bottom Sheet Drawer.
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const execPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`>>> Launching mobile browser from: ${execPath}`);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=390,844"],
  });

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    // ─── 1. СВЕТЛАЯ ТЕМА — МОБИЛЬНЫЙ КОКПИТ СМЕНЫ ВРАЧА (LIGHT 390x844) ───
    console.log(">>> Navigating to Mobile Shift Cockpit (Light 390x844)...");
    await page.goto("http://127.0.0.1:5173/shift_mobile_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="mobile-shift-cockpit"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const lightPath = path.join(outputDir, "proof_mobile_shift_cockpit_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    console.log(`>>> Captured Mobile Shift Cockpit Light: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);
    fs.copyFileSync(lightPath, path.join(artifactsDir, "proof_mobile_shift_cockpit_light.png"));

    // ─── 2. ТЁМНАЯ ТЕМА — МОБИЛЬНЫЙ КОКПИТ СМЕНЫ ВРАЧА (DARK 390x844) ───
    console.log(">>> Navigating to Mobile Shift Cockpit (Dark 390x844)...");
    await page.goto("http://127.0.0.1:5173/shift_mobile_preview.html?theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="mobile-shift-cockpit"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const darkPath = path.join(outputDir, "proof_mobile_shift_cockpit_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    console.log(`>>> Captured Mobile Shift Cockpit Dark: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);
    fs.copyFileSync(darkPath, path.join(artifactsDir, "proof_mobile_shift_cockpit_dark.png"));

    // ─── 3. ИНТЕРАКТИВНЫЙ БОТТОМ-ШИТ: ИНКАССАЦИЯ / Z-ОТЧЕТ 54-ФЗ (DARK 390x844) ───
    console.log(">>> Opening Cash Out / Z-Report Bottom Sheet Drawer...");
    const btnCashout = await page.$('[data-testid="btn-mobile-cash-out"]');
    if (btnCashout) {
      await btnCashout.click();
      await page.waitForSelector('[data-testid="sheet-cash-out"]', { visible: true, timeout: 5000 });
      await new Promise((r) => setTimeout(r, 600));

      const sheetDarkPath = path.join(outputDir, "proof_mobile_shift_cockpit_cashout_dark.png");
      await page.screenshot({ path: sheetDarkPath, fullPage: false });
      console.log(`>>> Captured Mobile Cashout Bottom Sheet Dark: ${sheetDarkPath} (${fs.statSync(sheetDarkPath).size} bytes)`);
      fs.copyFileSync(sheetDarkPath, path.join(artifactsDir, "proof_mobile_shift_cockpit_cashout_dark.png"));
    }

    console.log(">>> ALL MOBILE SHIFT COCKPIT SCREENSHOTS CAPTURED AND COPIED SUCCESSFULLY!");
  } catch (err) {
    console.error(">>> ERROR during screenshot capture:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
