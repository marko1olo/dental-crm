import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "../docs/proofs/endo");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== Capturing 4-State Red Team Proofs for Endodontic Studio ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const targets = [
    {
      file: "01_endo_studio_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      dark: false,
      mobile: false,
    },
    {
      file: "02_endo_studio_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      dark: true,
      mobile: false,
    },
    {
      file: "03_endo_studio_mobile_light_390x844.png",
      width: 390,
      height: 844,
      dark: false,
      mobile: true,
    },
    {
      file: "04_endo_studio_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      dark: true,
      mobile: true,
    },
  ];

  try {
    for (const t of targets) {
      console.log(`\nCapturing ${t.file} (${t.width}x${t.height}, dark: ${t.dark}, mobile: ${t.mobile})...`);
      const contextOptions = {
        viewport: { width: t.width, height: t.height },
        colorScheme: t.dark ? "dark" : "light",
      };
      if (t.mobile) {
        Object.assign(contextOptions, devices["iPhone 13"]);
        contextOptions.viewport = { width: t.width, height: t.height };
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      await page.goto("http://127.0.0.1:5173/?endo=1#endo", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Ensure theme class is applied on <html> and <body>
      await page.evaluate((isDark) => {
        if (isDark) {
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
      }, t.dark);

      // Wait for Endodontic Studio Modal
      await page.waitForSelector('[data-testid="endodontic-studio-modal"]', { timeout: 15000 });
      await page.waitForSelector('[data-testid="btn-endo-1click-obturation-norm"]', { timeout: 15000 });

      // Click 1-click obturation norm button to showcase the populated physiological norm
      await page.click('[data-testid="btn-endo-1click-obturation-norm"]');
      await sleep(600);

      const filePath = path.join(outDir, t.file);
      await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });

      const stat = fs.statSync(filePath);
      if (stat.size < 20480) {
        throw new Error(`[BYTE-GUARD FAILED]: ${t.file} is only ${stat.size} bytes (<20KB)`);
      }
      console.log(`[PROOF VERIFIED]: ${t.file} (${stat.size} bytes)`);

      await context.close();
    }
    console.log("\n>>> ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY! <<<");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
