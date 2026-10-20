const { chromium } = require("playwright");

(async () => {
	console.log("Launching browser...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	console.log("Navigating to clinical-modals-studio...");
	await page.goto("http://127.0.0.1:5173/?clinical-modals-studio#clinical-modals-studio", {
		waitUntil: "domcontentloaded",
		timeout: 15000,
	});
	await page.waitForSelector("[data-testid='open-clinical-writeoff-modal-btn']", { timeout: 10000 });
	console.log("Found open-clinical-writeoff-modal-btn!");
	await page.click("[data-testid='open-clinical-writeoff-modal-btn']");
	await page.waitForSelector("[data-testid='clinical-writeoff-modal']", { timeout: 5000 });
	console.log("SUCCESS: ClinicalWriteoffModal is rendered and interactive!");
	await browser.close();
})().catch((e) => {
	console.error("FAILED:", e.message);
	process.exit(1);
});
