import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	page.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.log("[BROWSER ERROR]", err.message));

	console.log("Navigating to http://127.0.0.1:5173/?checkout=1#checkout...");
	await page.goto("http://127.0.0.1:5173/?checkout=1#checkout", { waitUntil: "commit", timeout: 20000 });
	console.log("Navigation committed. Waiting for hydration...");
	await page.waitForTimeout(12000);
	const title = await page.title();
	const bodyText = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 500) : "NO BODY");
	const buttons = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim()).filter(Boolean));
	console.log("TITLE:", title);
	console.log("BODY TEXT:", bodyText);
	console.log("BUTTONS:", buttons);
	await browser.close();
}

main().catch(console.error);
