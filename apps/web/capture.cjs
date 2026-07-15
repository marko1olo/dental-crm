const { chromium } = require("playwright");

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	// Wait for the app to load
	await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

	// 1. Shift View
	await page.evaluate(() => {
		window.location.hash = "shift";
	});
	await page.waitForTimeout(1000);
	await page.screenshot({
		path: "screenshots/shift_view_clean.png",
		fullPage: true,
	});

	// 2. Schedule View
	await page.evaluate(() => {
		window.location.hash = "schedule";
	});
	await page.waitForTimeout(1000);
	await page.screenshot({
		path: "screenshots/schedule_view_clean.png",
		fullPage: true,
	});

	// 3. Visit View
	await page.evaluate(() => {
		window.location.hash = "visit";
	});
	await page.waitForTimeout(1000);
	await page.screenshot({
		path: "screenshots/visit_view_clean.png",
		fullPage: true,
	});

	await browser.close();
})();
