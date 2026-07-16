const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	await page.setViewport({ width: 1440, height: 900 });

	const delay = (ms) => new Promise((res) => setTimeout(res, ms));

	// Ensure artifacts dir exists
	const artifactsDir =
		"C:/Users/Admin/.gemini/antigravity/brain/e413e738-71c0-4b21-884d-6f53c4ba6235/";
	if (!fs.existsSync(artifactsDir)) {
		fs.mkdirSync(artifactsDir, { recursive: true });
	}

	const takeScreenshot = async (name) => {
		const path = `${artifactsDir}audit_${name}.png`;
		await page.screenshot({ path });
		console.log(`Saved ${path}`);
	};

	try {
		console.log("Navigating to app...");
		await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });

		// Wait for the main shell to load
		await page
			.waitForSelector(".app-shell", { timeout: 10000 })
			.catch(() => console.log("Timeout waiting for .app-shell"));
		await delay(2000);

		// 1. Dashboard / Schedule
		await takeScreenshot("schedule");

		// 2. Patients
		const patientsLink = await page.$(
			'a[href="#patients"], button[aria-label="Пациенты"]',
		);
		if (patientsLink) {
			await patientsLink.click();
			await delay(2000);
			await takeScreenshot("patients");
		} else {
			// Force navigate
			await page.evaluate(() => {
				window.location.hash = "patients";
			});
			await delay(2000);
			await takeScreenshot("patients");
		}

		// 3. Settings
		await page.evaluate(() => {
			window.location.hash = "settings";
		});
		await delay(2000);
		await takeScreenshot("settings");

		// 4. Imaging / CT
		await page.evaluate(() => {
			window.location.hash = "imaging";
		});
		await delay(2000);
		await takeScreenshot("imaging");
	} catch (err) {
		console.error("Error during audit:", err);
	} finally {
		await browser.close();
	}
})();
