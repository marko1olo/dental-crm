const { chromium } = require("playwright");

async function check() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	page.on("pageerror", (err) => console.log("PAGE ERROR:", err.stack || err.message));
	page.on("console", (msg) => console.log(`CONSOLE ${msg.type()}:`, msg.text()));
	await page.goto("http://127.0.0.1:5174/?demo=true&waitlist-matches=true&slot=demo&drawer=true#waitlist", { waitUntil: "commit" });
	await page.waitForTimeout(4000);
	await browser.close();
}

check().catch(console.error);