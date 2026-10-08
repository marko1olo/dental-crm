import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();

page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => console.error(`[BROWSER ERROR] ${err.message}`));

console.log("Navigating to http://127.0.0.1:5173/#schedule...");
await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });

console.log("Initial check for schedule-toolbar:", await page.$('[data-testid="schedule-toolbar"]') ? "found" : "not found");

console.log("Waiting for .schedule-filter-strip...");
try {
  const el = await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 10000 });
  console.log(".schedule-filter-strip visible:", !!el);
} catch (e) {
  console.log(".schedule-filter-strip timeout:", e.message);
  console.log("Current body text preview:", (await page.evaluate(() => document.body.innerText)).slice(0, 300));
}

await browser.close();
