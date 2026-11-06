import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hygieneOutDir = path.resolve(__dirname, "../docs/proofs/hygiene");
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
    const page = await browser.newPage();
    console.log("=== Loading Live App with ?hygiene=1&demo=true on port 5178 ===");
    await page.goto("http://127.0.0.1:5178/?hygiene=1&demo=true#hygiene", { waitUntil: "commit", timeout: 45000 });
    await sleep(2500);

    await page.evaluate(() => {
      window.location.hash = "#hygiene";
      window.dispatchEvent(new CustomEvent("dente:open-hygiene"));
      window.dispatchEvent(new CustomEvent("dente-open-hygiene"));
    });
    await page.waitForSelector('[data-testid="hygiene-studio-modal"]', { timeout: 35000 });
    console.log("=== Hygiene modal mounted and verified ===");

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
        window.location.hash = "#hygiene";
        window.dispatchEvent(new CustomEvent("dente:open-hygiene"));
        window.dispatchEvent(new CustomEvent("dente-open-hygiene"));
      }, { th: s.theme });

      await page.waitForSelector('[data-testid="hygiene-studio-modal"]', { timeout: 15000 });
      await sleep(600);
      await saveProof(page, path.join(hygieneOutDir, s.name));
    }

    console.log("=== ALL HYGIENE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR capturing hygiene proofs:", err);
  process.exit(1);
});
