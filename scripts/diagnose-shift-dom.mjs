import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
	page.on("pageerror", (err) => console.error(`[BROWSER PAGEERROR]`, err.message));

	const url = "http://127.0.0.1:5173/?stand=shift&demo=true#shift-closing";
	console.log("Navigating to:", url);
	await page.goto(url, { waitUntil: "commit" });
	await page.waitForTimeout(4000);

	const title = await page.title();
	console.log("Page title:", title);

	const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
	console.log("Body text preview:\n", bodyText);

	const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.slice(0, 500));
	console.log("Root HTML preview:\n", html);

	await browser.close();
}

main().catch(console.error);
