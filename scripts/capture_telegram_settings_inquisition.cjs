const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function capture() {
  const outDir = path.resolve("docs/screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox"],
  });

  const themes = [
    { mode: "light", file: "proof_telegram_settings_pc_light.png" },
    { mode: "dark", file: "proof_telegram_settings_pc_dark.png" },
  ];

  for (const theme of themes) {
    console.log(`\n[Capture] Starting ${theme.mode.toUpperCase()} (1440x900)...`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    const url = `http://127.0.0.1:5173/telegram_studio_preview.html?theme=${theme.mode}`;
    console.log(`[Capture] Navigating to ${url}...`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector(".telegram-settings", { visible: true, timeout: 15000 });
    await page.waitForTimeout(1500);

    const outPath = path.join(outDir, theme.file);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`[Capture] Screenshot saved: ${outPath} (${Math.round(stat.size / 1024)} KB)`);

    await context.close();
  }

  await browser.close();
  console.log("\n[Capture] Finished successfully.");
}

capture().catch((err) => {
  console.error("[Capture Error]", err);
  process.exit(1);
});
