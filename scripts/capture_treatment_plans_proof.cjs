const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function captureTreatmentPlanProof() {
  const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f73f0fb8-b54e-40dd-bd00-a693efe180d2");
  
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

  async function auditAndCapture(theme, fileName) {
    const url = `http://127.0.0.1:5173/treatment_plan_preview.html?theme=${theme}`;
    console.log(`\n--- Auditing Theme: ${theme} at ${url} ---`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Evaluate layout measurements
    const metrics = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="tier-card-optimum"]');
      const approveBtn = document.querySelector('[data-testid="approve-tier-btn-optimum"]');
      const toolbar = document.querySelector('[data-testid="treatment-3tier-comparison"]');
      const detailsElements = document.querySelectorAll('details');
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const cardRect = card ? card.getBoundingClientRect() : null;
      const btnRect = approveBtn ? approveBtn.getBoundingClientRect() : null;
      const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;

      // Look for the removed banners
      const hasOldDiscountsSummary = Array.from(document.querySelectorAll('summary')).some(s => s.textContent.includes('Скидки и бонусы пациента'));
      const hasOldCopilotSummary = Array.from(document.querySelectorAll('summary')).some(s => s.textContent.includes('AI Copilot'));
      const hasOldBundlesSummary = Array.from(document.querySelectorAll('summary')).some(s => s.textContent.includes('Готовые клинические пакеты'));

      return {
        windowHeight,
        docHeight,
        cardTop: cardRect ? cardRect.top : null,
        cardBottom: cardRect ? cardRect.bottom : null,
        cardHeight: cardRect ? cardRect.height : null,
        btnTop: btnRect ? btnRect.top : null,
        btnBottom: btnRect ? btnRect.bottom : null,
        toolbarTop: toolbarRect ? toolbarRect.top : null,
        hasOldDiscountsSummary,
        hasOldCopilotSummary,
        hasOldBundlesSummary,
        openDetailsCount: detailsElements.length,
      };
    });

    console.log("Metrics:", JSON.stringify(metrics, null, 2));

    const outPath1 = path.join(targetDir, fileName);
    const outPath2 = path.join(brainDir, fileName);

    await page.screenshot({ path: outPath1, fullPage: false });
    fs.copyFileSync(outPath1, outPath2);
    console.log(`Saved screenshot to ${outPath1} (${fs.statSync(outPath1).size} bytes)`);
  }

  await auditAndCapture("light", "proof_treatment_plans_viewport_clean_light.png");
  await auditAndCapture("dark", "proof_treatment_plans_viewport_clean_dark.png");

  await browser.close();
  console.log("\n[SUCCESS] Proof captures completed successfully.");
}

captureTreatmentPlanProof().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
