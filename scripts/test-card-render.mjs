import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => console.log(`[CONSOLE ${msg.type()}]:`, msg.text()));
page.on("pageerror", (err) => console.log(`[PAGE ERROR]:`, err.stack || err.message));

const targetUrl = "http://127.0.0.1:5173/?stand=1&patient_card=1";
console.log("Navigating to:", targetUrl);
await page.goto(targetUrl, { waitUntil: "commit" });

await page.waitForTimeout(4000);

const evalResult = await page.evaluate(() => {
	return {
		search: window.location.search,
		hash: window.location.hash,
		rootHtml: document.getElementById("root")?.innerHTML?.slice(0, 400),
	};
});
console.log("Eval result:", evalResult);

await browser.close();
