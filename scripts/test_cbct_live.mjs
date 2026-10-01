import { chromium } from "playwright";

async function main() {
	console.log("Starting browser...");
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
	await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 20000 });
	console.log("DOM loaded. Waiting 3s...");
	await page.waitForTimeout(3000);
	const title = await page.title();
	console.log("Page Title:", title);
	await page.screenshot({ path: "docs/screenshots/cbct_live/test_browser_cbct_demo.png" });
	console.log("Screenshot successfully saved to docs/screenshots/cbct_live/test_browser_cbct_demo.png");
	await browser.close();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
