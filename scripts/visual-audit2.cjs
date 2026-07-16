const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	await page.setViewport({ width: 1440, height: 900 });

	const delay = (ms) => new Promise((res) => setTimeout(res, ms));

	const artifactsDir =
		"C:/Users/Admin/.gemini/antigravity/brain/e413e738-71c0-4b21-884d-6f53c4ba6235/";

	const takeScreenshot = async (name) => {
		const path = `${artifactsDir}audit_${name}.png`;
		await page.screenshot({ path });
		console.log(`Saved ${path}`);
	};

	try {
		console.log("Navigating to app...");
		await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });

		await delay(2000);

		// Click demo mode if visible
		const demoBtn = await page.$(".wizard-card"); // "Попробовать демо-режим" is usually a wizard-card
		if (demoBtn) {
			console.log("Clicking Demo Mode...");
			// Wait, there are multiple wizard-cards. The first one is Demo.
			const cards = await page.$$(".wizard-card");
			if (cards.length > 0) {
				await cards[0].click();
				await delay(1000);

				// It might show "Go to dashboard" button
				const proceedBtn = await page.$(".primary-button");
				if (proceedBtn) {
					await proceedBtn.click();
				}
				await delay(3000);
			}
		}

		// Now wait for .app-shell
		await page
			.waitForSelector(".app-shell", { timeout: 10000 })
			.catch(() => console.log("Timeout waiting for .app-shell"));
		await delay(3000);

		// 1. Dashboard / Schedule
		await takeScreenshot("schedule");

		// 2. Patients
		await page.evaluate(() => {
			window.location.hash = "patients";
		});
		await delay(3000);
		await takeScreenshot("patients");

		// 3. Settings
		await page.evaluate(() => {
			window.location.hash = "settings";
		});
		await delay(3000);
		await takeScreenshot("settings");

		// 4. Imaging / CT
		await page.evaluate(() => {
			window.location.hash = "imaging";
		});
		await delay(3000);
		await takeScreenshot("imaging");
	} catch (err) {
		console.error("Error during audit:", err);
	} finally {
		await browser.close();
	}
})();
