import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (msg) => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err));

console.log("Navigating to http://127.0.0.1:5173/?demo=true...");
await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded" });

for (let i = 0; i < 15; i++) {
	await page.waitForTimeout(1000);
	const len = await page.evaluate(() => document.body ? document.body.innerText.length : 0);
	console.log(`Waited ${i + 1}s, body text length: ${len}`);
	if (len > 50) break;
}

const title = await page.title();
const bodyText = await page.evaluate(() => document.body.innerText);
const html = await page.evaluate(() => document.getElementById("root")?.innerHTML || "");
console.log("Title:", title);
console.log("Body length:", bodyText.length);
console.log("Root innerHTML length:", html.length);
console.log("Root preview:", html.slice(0, 300));

await page.screenshot({ path: "docs/proofs/odontogram/debug_page.png" });
console.log("Saved debug_page.png");

await browser.close();
