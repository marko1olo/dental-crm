const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/pediatric_documents");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a9ccbfc9-586d-4435-8a7d-a41fa40260e8");

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

  const baseUrl = "http://127.0.0.1:5173/pediatric_documents_preview.html";

  // 1. Pediatric Bravery Diploma Modal Light (PC 1440x900)
  console.log("\n[1/6] Capturing Pediatric Bravery Diploma Modal (PC Light 1440x900)...");
  await page.goto(`${baseUrl}?view=diploma&theme=light`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="pediatric-bravery-diploma-modal"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  const file1 = path.join(targetDir, "proof_pediatric_diploma_pc_light.png");
  await page.screenshot({ path: file1, fullPage: false });
  fs.copyFileSync(file1, path.join(brainDir, "proof_pediatric_diploma_pc_light.png"));
  console.log(`Saved: ${file1}`);

  // 2. Pediatric Bravery Diploma Modal Dark (PC 1440x900)
  console.log("\n[2/6] Capturing Pediatric Bravery Diploma Modal (PC Dark 1440x900)...");
  await page.goto(`${baseUrl}?view=diploma&theme=dark`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="pediatric-bravery-diploma-modal"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  const file2 = path.join(targetDir, "proof_pediatric_diploma_pc_dark.png");
  await page.screenshot({ path: file2, fullPage: false });
  fs.copyFileSync(file2, path.join(brainDir, "proof_pediatric_diploma_pc_dark.png"));
  console.log(`Saved: ${file2}`);

  // 3. Documents Catalog View Light (PC 1440x900)
  console.log("\n[3/6] Capturing Documents Catalog View (PC Light 1440x900)...");
  await page.goto(`${baseUrl}?view=documents&theme=light`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="documents-catalog-view"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  const file3 = path.join(targetDir, "proof_documents_catalog_pc_light.png");
  await page.screenshot({ path: file3, fullPage: false });
  fs.copyFileSync(file3, path.join(brainDir, "proof_documents_catalog_pc_light.png"));
  console.log(`Saved: ${file3}`);

  // 4. Documents Catalog View Dark (PC 1440x900)
  console.log("\n[4/6] Capturing Documents Catalog View (PC Dark 1440x900)...");
  await page.goto(`${baseUrl}?view=documents&theme=dark`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="documents-catalog-view"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  const file4 = path.join(targetDir, "proof_documents_catalog_pc_dark.png");
  await page.screenshot({ path: file4, fullPage: false });
  fs.copyFileSync(file4, path.join(brainDir, "proof_documents_catalog_pc_dark.png"));
  console.log(`Saved: ${file4}`);

  // 5. Pediatric Adaptation Visit Tab Light (PC 1440x900)
  console.log("\n[5/6] Capturing Pediatric Adaptation Visit Tab (PC Light 1440x900)...");
  await page.goto(`${baseUrl}?view=adaptation&theme=light`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="pediatric-visit-adaptation-tab"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  const file5 = path.join(targetDir, "proof_pediatric_adaptation_pc_light.png");
  await page.screenshot({ path: file5, fullPage: false });
  fs.copyFileSync(file5, path.join(brainDir, "proof_pediatric_adaptation_pc_light.png"));
  console.log(`Saved: ${file5}`);

  // 6. Pediatric Adaptation Visit Tab Dark (PC 1440x900)
  console.log("\n[6/6] Capturing Pediatric Adaptation Visit Tab (PC Dark 1440x900)...");
  await page.goto(`${baseUrl}?view=adaptation&theme=dark`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('[data-testid="pediatric-visit-adaptation-tab"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  const file6 = path.join(targetDir, "proof_pediatric_adaptation_pc_dark.png");
  await page.screenshot({ path: file6, fullPage: false });
  fs.copyFileSync(file6, path.join(brainDir, "proof_pediatric_adaptation_pc_dark.png"));
  console.log(`Saved: ${file6}`);

  await browser.close();
  console.log("\n[All 6 Visual Proofs Captured Successfully!]");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
