import { chromium } from "playwright";

async function diagnose() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	const logs = [];
	page.on("console", (msg) => logs.push(`[CONSOLE ${msg.type()}] ${msg.text()}`));
	page.on("pageerror", (err) => logs.push(`[PAGE ERROR] ${err.stack || err.message}`));
	page.on("requestfailed", (req) => logs.push(`[REQ FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`));
	page.on("response", (res) => {
		if (res.status() >= 400) {
			logs.push(`[HTTP ${res.status()}] ${res.url()}`);
		}
	});

	console.log("Navigating to http://localhost:5173/ ...");
	await page.goto("http://localhost:5173/", { waitUntil: "commit" });

	await page.waitForTimeout(6000);

	const rootHtml = await page.evaluate(() => {
		const r = document.getElementById("root");
		return r ? r.innerHTML : "NO ROOT";
	});

	console.log("=== LOGS COLLECTED ===");
	console.log(logs.join("\n"));
	console.log("=== ROOT HTML (first 500 chars) ===");
	console.log(rootHtml.slice(0, 500));

	await browser.close();
}

diagnose().catch(console.error);
