import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pedOutDir = path.resolve(__dirname, "../docs/proofs/pediatric");
const hygieneOutDir = path.resolve(__dirname, "../docs/proofs/hygiene");
fs.mkdirSync(pedOutDir, { recursive: true });
fs.mkdirSync(hygieneOutDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveProof(page, outPath) {
  await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
  const stat = fs.statSync(outPath);
  if (stat.size < 20480) {
    throw new Error(`[BYTE-GUARD FAILED]: ${outPath} is only ${stat.size} bytes (<20KB)`);
  }
  console.log(`[PROOF VERIFIED]: ${path.basename(outPath)} (${stat.size} bytes)`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("=== Loading Live DENTE Application ===");
    await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1500);

    // 1. PEDIATRIC STUDIO 4-STATE PROOFS
    console.log("=== Capturing Pediatric Studio 4-State Proofs ===");
    const pedStates = [
      { name: "01_pediatric_teeth_chart_pc_light_1440x900.png", width: 1440, height: 900, theme: "light" },
      { name: "02_pediatric_teeth_chart_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark" },
      { name: "03_pediatric_teeth_chart_mobile_light_390x844.png", width: 390, height: 844, theme: "light" },
      { name: "04_pediatric_teeth_chart_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark" },
    ];

    for (const s of pedStates) {
      await page.setViewportSize({ width: s.width, height: s.height });
      await page.evaluate(({ th }) => {
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }
        window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
      }, { th: s.theme });

      await page.waitForSelector('[data-testid="pediatric-studio-modal"]', { timeout: 15000 });
      await sleep(600);
      await saveProof(page, path.join(pedOutDir, s.name));
    }

    // Close pediatric modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="btn-close-pediatric-studio"]');
      if (closeBtn) closeBtn.click();
    });
    await sleep(500);

    // 2. HYGIENE INDICES PANEL 4-STATE PROOFS
    console.log("=== Capturing Hygiene Indices Panel 4-State Proofs ===");
    const hygieneStates = [
      { name: "01_hygiene_indices_panel_pc_light_1440x900.png", width: 1440, height: 900, theme: "light" },
      { name: "02_hygiene_indices_panel_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark" },
      { name: "03_hygiene_indices_panel_mobile_light_390x844.png", width: 390, height: 844, theme: "light" },
      { name: "04_hygiene_indices_panel_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark" },
    ];

    for (const s of hygieneStates) {
      await page.setViewportSize({ width: s.width, height: s.height });
      await page.evaluate(({ th }) => {
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }
        window.dispatchEvent(new CustomEvent("dente:open-hygiene"));
      }, { th: s.theme });

      await page.waitForSelector('[data-testid="hygiene-studio-modal"]', { timeout: 15000 });
      await sleep(600);
      await saveProof(page, path.join(hygieneOutDir, s.name));
    }

    console.log("=== ALL 8 4-STATE PROOFS SUCCESSFULLY CAPTURED! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR capturing proofs:", err);
  process.exit(1);
});
