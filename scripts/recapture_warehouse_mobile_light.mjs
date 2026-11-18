import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";

const outDir = path.resolve(process.cwd(), "docs/proofs/warehouse");

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const opts = { viewport: { width: 390, height: 844 }, ...devices["iPhone 13"] };
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();

    await page.goto("http://127.0.0.1:5173/?warehouse=1", { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
      localStorage.setItem("dente_theme", "light");
      document.documentElement.style.colorScheme = "light";
    });

    // Ждем пока исчезнет спиннер загрузки
    await page.waitForFunction(() => !document.body.innerText.includes("Загрузка склада..."), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const filePath = path.join(outDir, "warehouse_mobile_light_390x844.png");
    await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
    const stat = fs.statSync(filePath);
    console.log(`[MOBILE LIGHT RECAPTURED]: ${stat.size} bytes`);

    await ctx.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Recapture failed:", err);
  process.exit(1);
});
