const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/4dfa75ed-f8a0-42fd-a8e4-149cd692707e";
const BASE_URL = "http://127.0.0.1:5173";

async function main() {
	if (!fs.existsSync(ARTIFACTS_DIR)) {
		fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
	}

	console.log("Launching Microsoft Edge browser for Ceph AI Visual Proof...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	try {
		console.log(`Navigating to ${BASE_URL}/?ceph=demo&tab=landmarks ...`);
		await page.goto(`${BASE_URL}/?ceph=demo&tab=landmarks`, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});

		// Wait for Cephalometric modal to render
		await page.waitForSelector('[data-testid="cephalometric-analysis-modal"]', { timeout: 15000 });
		console.log("Modal is open and mounted!");

		// Give canvas a moment to initialize image
		await page.waitForTimeout(1000);

		// Verify AI elements exist
		const aiBtn = await page.waitForSelector('[data-testid="tab1-ai-autoplacement-btn"]', { timeout: 10000 });
		console.log("Found Tab 1 AI Auto-Placement button!");

		// Click Tab 1 AI Auto-Placement button to trigger real neural calculation
		console.log("Clicking Tab 1 AI Auto-Placement button...");
		await aiBtn.click();

		// Wait for calculation to finish and toast to appear
		await page.waitForTimeout(1500);

		// Capture State 1: 16 Landmarks placed with full polygon and AI status
		const landmarksPath = path.join(ARTIFACTS_DIR, "ceph_ai_modal_landmarks_16pts.png");
		await page.screenshot({ path: landmarksPath, fullPage: false });
		console.log(`Saved Landmarks screenshot to: ${landmarksPath}`);

		// Switch to Tab 2 (Metrics) to verify geometric calculations from AI landmarks
		const tab2Btn = await page.waitForSelector('[data-testid="tab1-to-metrics-btn"]', { timeout: 5000 });
		await tab2Btn.click();
		await page.waitForTimeout(1000);

		// Capture State 2: Calculated Steiner/Tweed metrics
		const metricsPath = path.join(ARTIFACTS_DIR, "ceph_ai_modal_metrics_angles.png");
		await page.screenshot({ path: metricsPath, fullPage: false });
		console.log(`Saved Metrics screenshot to: ${metricsPath}`);

		// Switch to Tab 3 (Report)
		const tab3NavBtn = await page.$('button[title="Ортодонтический протокол ТРГ для карты"]');
		if (tab3NavBtn) {
			await tab3NavBtn.click();
			await page.waitForTimeout(1000);
		}

		// Capture State 3: Clinical Protocol for Form 043/y
		const reportPath = path.join(ARTIFACTS_DIR, "ceph_ai_modal_report_043.png");
		await page.screenshot({ path: reportPath, fullPage: false });
		console.log(`Saved Report screenshot to: ${reportPath}`);

		console.log("All 3 Visual Proof screenshots captured successfully!");
	} catch (err) {
		console.error("Error during capture:", err);
		throw err;
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
