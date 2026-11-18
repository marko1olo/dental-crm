import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-web-security"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("requestfailed", req => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));
  page.on("response", res => {
    if (res.status() >= 400) console.log(`HTTP ${res.status()}: ${res.url()}`);
  });

  await page.goto("http://127.0.0.1:5173/cashbox-bench.html", { waitUntil: "commit" });
  await page.waitForTimeout(5000);

  await browser.close();
})();
