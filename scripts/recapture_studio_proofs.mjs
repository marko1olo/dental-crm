import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";

const anesthOutDir = path.resolve(process.cwd(), "docs/proofs/anesthesia");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyAndSave(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  const stat = fs.statSync(filePath);
  if (stat.size < 20480) throw new Error(`Byte guard failed: ${stat.size} bytes`);
  console.log(`[PROOF VERIFIED]: ${path.basename(filePath)} (${stat.size} bytes)`);
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

    for (const st of states) {
      const opts = { viewport: { width: st.width, height: st.height } };
      if (st.isMobile) Object.assign(opts, devices["iPhone 13"]);
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();

      await page.goto(`http://127.0.0.1:5173/anesthesia-preview.html?theme=${st.theme}&studio=1`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector('[data-testid="anesthesia-studio-modal"]', { timeout: 15000 });
      await sleep(600);

      const filename = `anesthesia_studio_modal_${st.name}_${st.width}x${st.height}.png`;
      await verifyAndSave(page, path.join(anesthOutDir, filename));
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
