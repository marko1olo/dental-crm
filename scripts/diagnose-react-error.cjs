const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	const page = await context.newPage();
	page.on("console", (msg) => console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text()));
	page.on("pageerror", (err) => console.log(`[PAGE ERROR]:`, err.stack || err.message));
	page.on("requestfailed", (req) => console.log(`[NET FAIL]:`, req.method(), req.url(), req.failure()?.errorText));

	console.log("Navigating to http://127.0.0.1:5173/ ...");
	try {
		await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "commit", timeout: 20000 });
		console.log("Committed! Waiting 5s for logs...");
		await page.waitForTimeout(5000);
		const html = await page.evaluate(() => document.body.innerText.slice(0, 300));
		console.log("Page text snippet:", html);
	} catch (e) {
		console.log("Navigation error:", e.message);
	}

	await browser.close();
}

main().catch(console.error);
