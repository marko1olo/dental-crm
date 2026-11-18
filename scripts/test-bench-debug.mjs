import { chromium } from "playwright";

(async () => {
  console.log("Launching standard Playwright Chromium...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));

  console.log("Navigating to http://127.0.0.1:5173/cashbox-bench.html...");
  await page.goto("http://127.0.0.1:5173/cashbox-bench.html", { waitUntil: "load", timeout: 10000 });
  console.log("Page loaded!");

  await page.waitForTimeout(1000);
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log("Body innerHTML length:", html.length);
  console.log("Has modal:", html.includes("data-testid=\"cash-register-studio-modal\""));

  await browser.close();
  console.log("SUCCESS!");
})();
