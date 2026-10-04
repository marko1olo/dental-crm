/**
 * scripts/capture_mobile_payment_drawer_screenshots.cjs
 * Red Team Inquisitor: Снятие мобильных скриншотов кассы (390x844 iPhone 14/15/16).
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
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
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    // ─── 1. СВЕТЛАЯ ТЕМА (LIGHT 390x844) ───
    console.log(">>> Navigating to Mobile Payment Drawer (Light 390x844)...");
    await page.goto("http://127.0.0.1:5173/payment_modal_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="payment-modal-studio"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    const lightPath = path.join(outputDir, "proof_mobile_payment_sheet_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    console.log(`>>> Captured Light checkout screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);

    // Switch to Receipt Tab on Mobile Light
    console.log(">>> Switching to Receipt Tab on Mobile (Light)...");
    await page.click('[data-testid="btn-mobile-tab-receipt"]');
    await new Promise((r) => setTimeout(r, 1000));
    const lightReceiptPath = path.join(outputDir, "proof_mobile_receipt_tape_light.png");
    await page.screenshot({ path: lightReceiptPath, fullPage: false });
    console.log(`>>> Captured Light receipt tape screenshot: ${lightReceiptPath} (${fs.statSync(lightReceiptPath).size} bytes)`);

    // ─── 2. ТЁМНАЯ ТЕМА (DARK 390x844) ───
    console.log(">>> Navigating to Mobile Payment Drawer (Dark 390x844)...");
    await page.goto("http://127.0.0.1:5173/payment_modal_preview.html?theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="payment-modal-studio"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    const darkPath = path.join(outputDir, "proof_mobile_payment_sheet_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    console.log(`>>> Captured Dark checkout screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);

    // Switch to Receipt Tab on Mobile Dark
    console.log(">>> Switching to Receipt Tab on Mobile (Dark)...");
    await page.click('[data-testid="btn-mobile-tab-receipt"]');
    await new Promise((r) => setTimeout(r, 1000));
    const darkReceiptPath = path.join(outputDir, "proof_mobile_receipt_tape_dark.png");
    await page.screenshot({ path: darkReceiptPath, fullPage: false });
    console.log(`>>> Captured Dark receipt tape screenshot: ${darkReceiptPath} (${fs.statSync(darkReceiptPath).size} bytes)`);

    // ─── 3. ДЕСКТОПНЫЙ ВИД (DESKTOP 1440x900 LIGHT) ───
    console.log(">>> Navigating to Desktop Payment Modal (1440x900 Light)...");
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 900 });
    await desktopPage.goto("http://127.0.0.1:5173/payment_modal_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await desktopPage.waitForSelector('[data-testid="payment-modal-studio"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
    const desktopPath = path.join(outputDir, "proof_desktop_payment_modal_light.png");
    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    console.log(`>>> Captured Desktop screenshot: ${desktopPath} (${fs.statSync(desktopPath).size} bytes)`);

    console.log(">>> All mobile & desktop screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
