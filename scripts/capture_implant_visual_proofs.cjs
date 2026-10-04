const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5cbdd8b0-1a44-41e4-8bbf-039b9627b5ad"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function take(page, name) {
  const p = path.join(targetDirs[0], name);
  await page.screenshot({ path: p, timeout: 30000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p, path.join(targetDirs[i], name));
  }
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED] ${name} (${sz} KB)`);
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });
    console.log("CBCT Studio modal opened!");

    // Click demo button if present
    const demoBtn = await page.waitForSelector('button:has-text("Демо-исследование"), [data-testid="cbct-btn-load-demo-empty"]', { timeout: 5000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking 'Демо-исследование' button...");
      await demoBtn.click();
      console.log("Waiting for slices to decode...");
      await page.waitForTimeout(4000);
    }

    // Click Implant tab
    console.log("Clicking 'Имплантация' tab in header...");
    const implantTab = await page.waitForSelector('button:has-text("Имплантация"), [data-testid="cbct-nav-tab-implant"]', { timeout: 10000 });
    await implantTab.click();
    await page.waitForTimeout(2000);

    // Verify Surgeon panel is visible
    await page.waitForSelector('[data-testid="cbct-implant-surgeon-station-panel"]', { timeout: 10000 });
    console.log("Surgeon station panel is mounted!");

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`\n=== PROCESSING THEME: ${theme.toUpperCase()} ===`);
      await applyTheme(page, theme);

      // 1. Clean, Uncluttered Station (Assistant Accordion Closed by Default)
      console.log(`Capturing Clean Station (${theme})...`);
      await take(page, `proof_implant_workspace_${theme}_clean.png`);

      // 2. Expand Clinical AI Assistant Accordion
      console.log(`Expanding Clinical AI Assistant (${theme})...`);
      const accordionSummary = await page.waitForSelector(
        '[data-testid="cbct-implant-ai-assistant-accordion"] summary',
        { timeout: 8000 }
      );
      await accordionSummary.click();
      await page.waitForTimeout(800);

      // Verify Misch HUD and IAN clearance are visible in expanded state
      await page.waitForSelector('[data-testid="cbct-implant-live-telemetry-hud"]', { timeout: 8000 });
      await page.waitForSelector('[data-testid="cbct-implant-nerve-safety-badge"]', { timeout: 8000 });

      console.log(`Capturing Expanded Telemetry (${theme})...`);
      await take(page, `proof_implant_workspace_${theme}_expanded.png`);

      // Close accordion back to maintain clean state
      await accordionSummary.click();
      await page.waitForTimeout(400);
    }

    console.log("\nALL PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
