import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/cashbox");
const SCREEN_DIR = path.resolve(__dirname, "../docs/screenshots/cashbox");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SCREEN_DIR, { recursive: true });

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function main() {
  console.log("=== Launching Playwright Chromium for Cashbox Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const studioStates = [
    {
      name: "01_cashbox_studio_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      theme: "light",
      isMobile: false,
    },
    {
      name: "02_cashbox_studio_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      theme: "dark",
      isMobile: false,
    },
    {
      name: "03_cashbox_studio_mobile_light_390x844.png",
      width: 390,
      height: 844,
      theme: "light",
      isMobile: true,
    },
    {
      name: "04_cashbox_studio_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      theme: "dark",
      isMobile: true,
    },
  ];

  for (const st of studioStates) {
    console.log(`\n--- Capturing Cashbox: ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      isMobile: st.isMobile,
      hasTouch: st.isMobile,
      deviceScaleFactor: st.isMobile ? 2 : 1,
      colorScheme: st.theme,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`[PAGE LOG ERROR]: ${msg.text()}`);
    });

    const targetUrl = "http://127.0.0.1:5173/cashbox-bench.html";
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });

    // Set theme
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
      }
      document.documentElement.style.colorScheme = th;
    }, st.theme);

    await page.waitForSelector('[data-testid="cash-register-studio-modal"]', { state: "visible", timeout: 15000 });
    console.log("Modal visible! Waiting 1s for fonts & CSS...");
    await page.waitForTimeout(1000);

    const proofPath = path.join(PROOFS_DIR, st.name);
    await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(proofPath, path.join(SCREEN_DIR, st.name));

    verifyProof(proofPath);
    await context.close();
  }

  await browser.close();
  console.log("\n=======================================================");
  console.log(">>> [VICTORY] All 4 Cashbox Visual Proofs captured successfully! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
