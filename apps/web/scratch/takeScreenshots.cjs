const { chromium } = require("playwright");
const path = require("path");

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	console.log("Navigating to app...");
	await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
	await page.waitForTimeout(1000); // Wait for initial render

	const outputDir = path.join(__dirname, "screenshots");
	const tabs = [
		{ selector: 'button:has-text("Расписание")', name: "1_schedule" },
		{ selector: 'button:has-text("Пациенты")', name: "2_patients" },
		{ selector: 'button:has-text("Прием")', name: "3_visit" },
		{ selector: 'button:has-text("Финансы")', name: "4_finance" },
		{ selector: 'button:has-text("Документы")', name: "5_documents" },
	];

	for (const tab of tabs) {
		console.log(`Taking screenshot for ${tab.name}...`);
		try {
			await page.click(tab.selector, { timeout: 3000 });
			await page.waitForTimeout(1500); // Allow animations/data to load
			await page.screenshot({
				path: path.join(outputDir, `${tab.name}.png`),
				fullPage: true,
			});
		} catch (e) {
			console.log(`Failed to click tab ${tab.name}: ${e.message}`);
		}
	}

	await browser.close();
	console.log("Screenshots captured!");
})();
