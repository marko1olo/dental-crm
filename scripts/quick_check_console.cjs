const { chromium } = require("playwright");

async function check() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	page.on("console", (m) => console.log(`[BROWSER ${m.type()}]:`, m.text()));
	page.on("pageerror", (e) => console.log(`[BROWSER ERR]:`, e.stack || e.message));

	console.log("Navigating...");
	await page.goto("http://127.0.0.1:5173/?demo=true&waitlist-matches=true&slot=demo&drawer=true#waitlist", { waitUntil: "commit" });
	await page.waitForTimeout(10000);

	const state = await page.evaluate(() => {
		return {
			text: document.body.innerText.slice(0, 300),
			drawer: !!document.querySelector('[data-testid="waitlist-drawer"]'),
			testIds: Array.from(document.querySelectorAll("[data-testid]")).map((e) => e.getAttribute("data-testid")),
		};
	});
	console.log("STATE:", state);

	await browser.close();
}

check().catch(console.error);