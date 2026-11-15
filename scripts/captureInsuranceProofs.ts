import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const proofsDir = path.resolve(process.cwd(), "docs", "proofs", "insurance");
  if (!fs.existsSync(proofsDir)) {
    fs.mkdirSync(proofsDir, { recursive: true });
  }

  const url = "http://127.0.0.1:5173/?demo=true&standalone=insurance";
  console.log("Launching Chromium for 4-State Proofs...");
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_demo_showcase", "true");
  });

  const page = await context.newPage();
  console.log("Navigating to application once...");
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".dms-modal-window", { timeout: 30000 });
  await sleep(1000);

  // 1. PC Light (1440x900)
  console.log("1. Capturing PC Light (1440x900)...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });
  await sleep(600);
  const pcLightPath = path.join(proofsDir, "pc_light_dms_studio.png");
  await page.screenshot({ path: pcLightPath, fullPage: false });
  console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

  // 2. PC Dark (1440x900)
  console.log("2. Capturing PC Dark (1440x900)...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  });
  await sleep(600);
  const pcDarkPath = path.join(proofsDir, "pc_dark_dms_studio.png");
  await page.screenshot({ path: pcDarkPath, fullPage: false });
  console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

  // 3. Mobile Light (390x844)
  console.log("3. Capturing Mobile Light (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });
  await sleep(600);
  const mobLightPath = path.join(proofsDir, "mobile_light_dms_studio.png");
  await page.screenshot({ path: mobLightPath, fullPage: false });
  console.log(`Saved: ${mobLightPath} (${fs.statSync(mobLightPath).size} bytes)`);

  // 4. Mobile Dark (390x844)
  console.log("4. Capturing Mobile Dark (390x844)...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  });
  await sleep(600);
  const mobDarkPath = path.join(proofsDir, "mobile_dark_dms_studio.png");
  await page.screenshot({ path: mobDarkPath, fullPage: false });
  console.log(`Saved: ${mobDarkPath} (${fs.statSync(mobDarkPath).size} bytes)`);

  await browser.close();
  console.log("SUCCESS: All 4-State Proofs captured cleanly in docs/proofs/insurance/!");
}

main().catch((err) => {
  console.error("Error capturing insurance proofs:", err);
  process.exit(1);
});
