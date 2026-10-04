const { chromium } = require("playwright");

async function probe() {
  console.log("Launching Chrome...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Chrome launched successfully!");
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("Page loaded. Title:", await page.title());
  await browser.close();
  console.log("Browser closed cleanly.");
}

probe().catch((err) => {
  console.error("Probe error:", err);
  process.exit(1);
});
