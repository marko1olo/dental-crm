/**
 * scripts/capture_payment_modal_proofs.cjs
 * Autonomous Red Team Inquisitor script:
 * Captures 1440x900 desktop screenshots in PC Light & PC Dark of PaymentModal + 54-FZ ReceiptPreview.
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

  console.log(`>>> Launching browser from: ${execPath}`);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ─── 1. СВЕТЛАЯ ТЕМА (LIGHT) ───
    console.log(">>> Navigating to Payment Modal Preview (Light)...");
    await page.goto("http://127.0.0.1:5173/payment_modal_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="payment-modal-studio"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="receipt-54fz-preview-container"]', { visible: true, timeout: 15000 });
    // Let fonts & SVG render cleanly
    await new Promise((r) => setTimeout(r, 2000));

    const lightPath = path.join(outputDir, "proof_payment_modal_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    console.log(`>>> Captured Light screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);

    // ─── 2. ТЁМНАЯ ТЕМА (DARK) ───
    console.log(">>> Navigating to Payment Modal Preview (Dark)...");
    await page.goto("http://127.0.0.1:5173/payment_modal_preview.html?theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="payment-modal-studio"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="receipt-54fz-preview-container"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const darkPath = path.join(outputDir, "proof_payment_modal_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    console.log(`>>> Captured Dark screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);

    console.log(">>> ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
