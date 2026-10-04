const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const targetDirs = [
  path.resolve("docs/screenshots/surgery_live"),
  path.resolve("docs/screenshots/inquisition_live"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function capture() {
  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  const page = await context.newPage();

  const views = [
    { id: "extraction", filename: "proof_surgery_extraction", selector: '[data-testid="extraction-cockpit-section"]' },
    { id: "sinus_gbr", filename: "proof_surgery_sinus_gbr", selector: '[data-testid="sinus-gbr-cockpit-section"]' },
    { id: "implant", filename: "proof_surgery_implant", selector: '[data-testid="implant-cockpit-section"]' },
    { id: "protocol_tab", filename: "proof_surgery_protocol_tab", selector: '[data-testid="protocol-tab-section"]' },
    { id: "passport_card", filename: "proof_implant_passport_card", selector: '[data-testid="passport-card-section"]' },
    { id: "passport_modal", filename: "proof_implant_passport_modal", selector: '.implant-passport-card-container' },
    { id: "perio", filename: "proof_perio_chart_florida", selector: '[data-testid="perio-chart-section"]' },
  ];

  const themes = ["light", "dark"];

  for (const theme of themes) {
    for (const v of views) {
      const url = `http://127.0.0.1:5173/surgery_cockpit_preview.html?theme=${theme}&view=${v.id}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(800);

      // Verify element is visible
      const element = page.locator(v.selector);
      await element.waitFor({ state: "visible", timeout: 15000 });

      const shotName = `${v.filename}_${theme}.png`;
      const primaryPath = path.join(targetDirs[0], shotName);
      
      // Capture screenshot of the full viewport
      await page.screenshot({ path: primaryPath, fullPage: false });
      console.log(`[Captured] ${primaryPath}`);

      // Copy to secondary target dir
      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(primaryPath, path.join(targetDirs[i], shotName));
      }
    }
  }

  await browser.close();
  console.log("\n[SUCCESS] All 14 surgery, implantology & periodontology screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
