import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5173/?standalone=orthopedics#orthopedics", { waitUntil: "commit" });
await page.waitForTimeout(4000);
await page.screenshot({ path: "docs/proofs/orthopedics/debug_page.png" });
const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log("PAGE TEXT:", text);
console.log("URL:", page.url());
await browser.close();
