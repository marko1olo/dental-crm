import { chromium } from "playwright";

async function test() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	console.log("Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(4000);

	const info = await page.evaluate(() => {
		return {
			title: document.title,
			bodyText: document.body.innerText,
			htmlSnippet: document.body.innerHTML.slice(0, 1000),
		};
	});

	console.log("ROOT PAGE INFO:", JSON.stringify(info, null, 2));

	await browser.close();
}

test().catch(console.error);
