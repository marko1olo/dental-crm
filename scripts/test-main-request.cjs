const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("requestfailed", req => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));
  page.on("response", res => {
    if (res.status() >= 400) console.log(`HTTP ${res.status()}: ${res.url()}`);
    if (res.url().includes("main.tsx")) console.log(`MAIN.TSX STATUS: ${res.status()}`);
  });

  console.log("Navigating to http://127.0.0.1:5173/?stand=cashbox#checkout...");
  await page.goto("http://127.0.0.1:5173/?stand=cashbox#checkout", { waitUntil: "commit" });
  await page.waitForTimeout(4000);

  await browser.close();
})();
