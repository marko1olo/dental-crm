import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5174/?demo=true#schedule", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3000);

const hasSchedule = await page.$(".workspace-shell, [data-testid='schedule-toolbar'], .schedule-filter-strip");
console.log("Has schedule toolbar:", Boolean(hasSchedule));

const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
console.log("Page text sample:", text.replace(/\n/g, " "));

await page.screenshot({ path: "docs/proofs/notifications/probe_5174.png" });
console.log("Screenshot saved, size:", fs.statSync("docs/proofs/notifications/probe_5174.png").size);

await browser.close();
