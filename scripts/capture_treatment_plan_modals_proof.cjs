const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/treatment_plans_modals");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/9cc0b94b-6d6e-470c-9b2f-20fead8eb9d3");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  console.log("[Playwright] Launching Chrome at 1440x900...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const baseUrl = "http://127.0.0.1:5173/treatment_plan_modals_preview.html";

  // 1. Bundles Modal Light
  console.log("\n[1/4] Capturing Bundles Modal (PC Light 1440x900)...");
  await page.goto(`${baseUrl}?modal=bundles&theme=light`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="clinical-service-bundles-modal"]', { timeout: 10000 });
  // Expand first bundle composition
  const expandBtnLight = await page.$('[data-testid="toggle-expand-caries_turnkey"]');
  if (expandBtnLight) {
    await expandBtnLight.click();
    await page.waitForTimeout(400);
  }
  const file1 = path.join(targetDir, "tp_bundles_modal_light.png");
  await page.screenshot({ path: file1, fullPage: false });
  fs.copyFileSync(file1, path.join(brainDir, "tp_bundles_modal_light.png"));
  console.log(`Saved: ${file1}`);

  // 2. Bundles Modal Dark
  console.log("\n[2/4] Capturing Bundles Modal (PC Dark 1440x900)...");
  await page.goto(`${baseUrl}?modal=bundles&theme=dark`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="clinical-service-bundles-modal"]', { timeout: 10000 });
  const expandBtnDark = await page.$('[data-testid="toggle-expand-caries_turnkey"]');
  if (expandBtnDark) {
    await expandBtnDark.click();
    await page.waitForTimeout(400);
  }
  const file2 = path.join(targetDir, "tp_bundles_modal_dark.png");
  await page.screenshot({ path: file2, fullPage: false });
  fs.copyFileSync(file2, path.join(brainDir, "tp_bundles_modal_dark.png"));
  console.log(`Saved: ${file2}`);

  // 3. Add Service Modal Light
  console.log("\n[3/4] Capturing Add Service Modal (PC Light 1440x900)...");
  await page.goto(`${baseUrl}?modal=add_service&theme=light`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="add-service-from-catalog-modal"]', { timeout: 10000 });
  // Click first service item to show details
  const itemLight = await page.$('[data-testid="catalog-item-A16.07.002.001"]');
  if (itemLight) {
    await itemLight.click();
    await page.waitForTimeout(400);
  }
  const file3 = path.join(targetDir, "tp_add_service_modal_light.png");
  await page.screenshot({ path: file3, fullPage: false });
  fs.copyFileSync(file3, path.join(brainDir, "tp_add_service_modal_light.png"));
  console.log(`Saved: ${file3}`);

  // 4. Add Service Modal Dark
  console.log("\n[4/4] Capturing Add Service Modal (PC Dark 1440x900)...");
  await page.goto(`${baseUrl}?modal=add_service&theme=dark`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="add-service-from-catalog-modal"]', { timeout: 10000 });
  const itemDark = await page.$('[data-testid="catalog-item-A16.07.002.001"]');
  if (itemDark) {
    await itemDark.click();
    await page.waitForTimeout(400);
  }
  const file4 = path.join(targetDir, "tp_add_service_modal_dark.png");
  await page.screenshot({ path: file4, fullPage: false });
  fs.copyFileSync(file4, path.join(brainDir, "tp_add_service_modal_dark.png"));
  console.log(`Saved: ${file4}`);

  await browser.close();
  console.log("\n[All 4 Visual Proofs Captured Successfully!]");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
