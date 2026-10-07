/**
 * scripts/capture_treatment_plan_roadmap_completed.cjs
 *
 * Captures 1440x900 PC Light & PC Dark screenshots of TreatmentPlanRoadmap
 * with completed stage indicators, progress bars, and zero remaining cost.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../artifacts/screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
	let browser;
	try {
		console.log("[CAPTURE] Launching Chrome browser...");
		browser = await chromium.launch({
			headless: true,
			executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		});
	} catch (e) {
		console.log("[CAPTURE] Fallback to bundled chromium:", e.message);
		browser = await chromium.launch({ headless: true });
	}

	try {
		// 1. PC Light Mode (1440x900)
		console.log("[CAPTURE] Capturing PC Light 1440x900...");
		const ctxLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1.5,
		});
		const pageLight = await ctxLight.newPage();
		await pageLight.goto(
			"http://127.0.0.1:5173/treatment_plan_roadmap_preview.html?theme=light",
			{ waitUntil: "networkidle", timeout: 15000 },
		);
		await pageLight.waitForSelector("[data-testid='treatment-plan-roadmap']", { timeout: 10000 });
		await pageLight.waitForSelector("[data-testid='roadmap-stage-1']", { timeout: 10000 });
		await pageLight.evaluate(() => {
			const stage = document.querySelector("[data-testid='roadmap-stage-1']");
			if (stage) stage.scrollIntoView({ block: 'start', behavior: 'instant' });
		});
		await pageLight.waitForTimeout(500);

		const lightPath = path.join(
			SCREENSHOTS_DIR,
			"treatment_plan_roadmap_completed_light_1440x900.png",
		);
		await pageLight.screenshot({ path: lightPath, fullPage: false });
		const lightSize = fs.statSync(lightPath).size;
		console.log(`[CAPTURE] Saved Light Screenshot: ${lightPath} (${lightSize} bytes)`);
		await ctxLight.close();

		// 2. PC Dark Mode (1440x900)
		console.log("[CAPTURE] Capturing PC Dark 1440x900...");
		const ctxDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1.5,
		});
		const pageDark = await ctxDark.newPage();
		await pageDark.goto(
			"http://127.0.0.1:5173/treatment_plan_roadmap_preview.html?theme=dark",
			{ waitUntil: "networkidle", timeout: 15000 },
		);
		await pageDark.waitForSelector("[data-testid='treatment-plan-roadmap']", { timeout: 10000 });
		await pageDark.waitForSelector("[data-testid='roadmap-stage-1']", { timeout: 10000 });
		await pageDark.evaluate(() => {
			const stage = document.querySelector("[data-testid='roadmap-stage-1']");
			if (stage) stage.scrollIntoView({ block: 'start', behavior: 'instant' });
		});
		await pageDark.waitForTimeout(500);

		const darkPath = path.join(
			SCREENSHOTS_DIR,
			"treatment_plan_roadmap_completed_dark_1440x900.png",
		);
		await pageDark.screenshot({ path: darkPath, fullPage: false });
		const darkSize = fs.statSync(darkPath).size;
		console.log(`[CAPTURE] Saved Dark Screenshot: ${darkPath} (${darkSize} bytes)`);
		await ctxDark.close();

		console.log("[CAPTURE] Finished successfully!");
	} finally {
		if (browser) await browser.close();
	}
})();
