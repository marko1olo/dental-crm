const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  console.log("Clicking implant tab...");
  await page.click('[data-testid="cbct-nav-tab-implant"]');
  await page.waitForTimeout(2000);

  // Take clean light screenshot
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.screenshot({ path: path.join(outDir, "proof_implant_workspace_light_clean.png") });
  console.log("Saved proof_implant_workspace_light_clean.png");

  // Click accordion to expand optional assistant
  console.log("Expanding clinical assistant accordion...");
  await page.click('[data-testid="cbct-implant-ai-assistant-accordion"] summary');
  await page.waitForTimeout(1000);

  // Take expanded light screenshot
  await page.screenshot({ path: path.join(outDir, "proof_implant_workspace_light_expanded.png") });
  console.log("Saved proof_implant_workspace_light_expanded.png");

  // Apply dark theme
  console.log("Applying dark theme...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(800);

  // Take expanded dark screenshot
  await page.screenshot({ path: path.join(outDir, "proof_implant_workspace_dark_expanded.png") });
  console.log("Saved proof_implant_workspace_dark_expanded.png");

  // Close accordion
  console.log("Closing clinical assistant accordion...");
  await page.click('[data-testid="cbct-implant-ai-assistant-accordion"] summary');
  await page.waitForTimeout(500);

  // Take clean dark screenshot
  await page.screenshot({ path: path.join(outDir, "proof_implant_workspace_dark_clean.png") });
  console.log("Saved proof_implant_workspace_dark_clean.png");

  // Copy to brain directory for view_file
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5cbdd8b0-1a44-41e4-8bbf-039b9627b5ad");
  if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

  const files = [
    "proof_implant_workspace_light_clean.png",
    "proof_implant_workspace_light_expanded.png",
    "proof_implant_workspace_dark_expanded.png",
    "proof_implant_workspace_dark_clean.png"
  ];
  for (const f of files) {
    fs.copyFileSync(
      path.join(outDir, f),
      path.join(brainDir, f)
    );
  }
  console.log("All screenshots copied to brain dir successfully!");

  await browser.close();
  console.log("Done!");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
