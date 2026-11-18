import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", msg => console.log("CONSOLE:", msg.type(), msg.text()));
page.on("pageerror", err => console.log("PAGEERROR:", err));
page.on("requestfailed", req => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));
page.on("response", res => {
  if (res.status() >= 400) console.log("RES ERROR:", res.status(), res.url());
});

console.log("Navigating...");
await page.goto("http://127.0.0.1:5173/?standalone=orthopedics#orthopedics", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
console.log("Done waiting");
const body = await page.evaluate(() => document.body.innerHTML);
console.log("BODY HTML:", body);
await browser.close();
