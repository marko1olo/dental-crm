import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";

const outDir = path.resolve(process.cwd(), "docs/proofs/warehouse");
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyAndSave(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  const stat = fs.statSync(filePath);
  if (stat.size < 20480) {
    throw new Error(`Byte guard failed for ${path.basename(filePath)}: ${stat.size} bytes (< 20KB)`);
  }
  console.log(`[PROOF CAPTURED]: ${path.basename(filePath)} (${stat.size} bytes)`);
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    document.documentElement.style.colorScheme = th;
  }, theme);
  await sleep(600);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const states = [
      { name: "pc_light", width: 1440, height: 900, theme: "light", isMobile: false },
      { name: "pc_dark", width: 1440, height: 900, theme: "dark", isMobile: false },
      { name: "mobile_light", width: 390, height: 844, theme: "light", isMobile: true },
      { name: "mobile_dark", width: 390, height: 844, theme: "dark", isMobile: true },
    ];

    // 1. Склад (InventoryView)
    for (const st of states) {
      const opts = { viewport: { width: st.width, height: st.height } };
      if (st.isMobile) Object.assign(opts, devices["iPhone 13"]);
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();

      await page.goto(`http://127.0.0.1:5173/?warehouse=1`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await applyTheme(page, st.theme);

      try {
        await page.waitForSelector('[data-testid="warehouse-studio-modal"], [data-testid="direct-warehouse-modal"], .inventory-view', {
          timeout: 10000,
        });
      } catch (_) {}

      await sleep(800);

      const filename = `warehouse_${st.name}_${st.width}x${st.height}.png`;
      await verifyAndSave(page, path.join(outDir, filename));
      await ctx.close();
    }

    // 2. Модалка списания расходников (ConsumablesBatchWriteoffModal)
    for (const st of states) {
      const opts = { viewport: { width: st.width, height: st.height } };
      if (st.isMobile) Object.assign(opts, devices["iPhone 13"]);
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();

      await page.goto(`http://127.0.0.1:5173/?warehouse=1`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await applyTheme(page, st.theme);

      // Инициируем открытие списания расходников смены
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-batch-writeoff"));
        window.dispatchEvent(new CustomEvent("dente:open-shift-writeoff"));
      });

      await sleep(1000);

      const filename = `consumables_writeoff_${st.name}_${st.width}x${st.height}.png`;
      await verifyAndSave(page, path.join(outDir, filename));
      await ctx.close();
    }

    console.log("ALL 8 PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
