import { chromium, devices } from "playwright";

(async () => {
	const browser = await chromium.launch();

	// PC Context
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const pcPage = await pcContext.newPage();

	// Mobile Context (iPhone 13)
	const mobileContext = await browser.newContext({
		...devices["iPhone 13"],
	});
	const mobilePage = await mobileContext.newPage();

	const tabs = [
		{ name: "shift", href: "#shift" },
		{ name: "schedule", href: "#schedule" },
		{ name: "patients", href: "#patients" },
		{ name: "visit", href: "#visit" },
		{ name: "documents", href: "#documents" },
		{ name: "finance", href: "#finance" },
		{ name: "settings", href: "#settings" },
	];

	console.log("Capturing PC screenshots...");
	await pcPage.goto("http://localhost:5173/");
	await pcPage.waitForTimeout(1000);
	for (const tab of tabs) {
		try {
			await pcPage.click(`a[href="${tab.href}"]`);
			await pcPage.waitForTimeout(500);
			await pcPage.screenshot({ path: `screenshots/pc_${tab.name}.png` });
			console.log(`Saved PC: ${tab.name}`);
		} catch (e) {
			console.error(`Failed to capture PC ${tab.name}:`, e);
		}
	}

	console.log("Capturing Mobile screenshots...");
	await mobilePage.goto("http://localhost:5173/");
	await mobilePage.waitForTimeout(1000);
	for (const tab of tabs) {
		try {
			// In mobile, we might need to open the hamburger menu first if it's hidden
			// Wait, is there a mobile menu toggle? Let's check if the link is visible.
			// We will just evaluate setting location.hash directly to ensure it works!
			await mobilePage.evaluate((hash) => {
				window.location.hash = hash;
			}, tab.href);
			await mobilePage.waitForTimeout(500);
			// Let's close the sidebar if it's open on mobile by clicking somewhere or we just take the screenshot
			await mobilePage.screenshot({
				path: `screenshots/mobile_${tab.name}.png`,
			});
			console.log(`Saved Mobile: ${tab.name}`);
		} catch (e) {
			console.error(`Failed to capture Mobile ${tab.name}:`, e);
		}
	}

	await browser.close();
	console.log("All screenshots saved!");
})();
