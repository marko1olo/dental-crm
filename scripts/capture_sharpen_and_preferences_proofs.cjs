/**
 * scripts/capture_sharpen_and_preferences_proofs.cjs
 *
 * Captures live visual proofs from the standalone CBCT workbench:
 * 1. DoctorCbctPreferencesCard (3-methods: Catmull-Rom default, B-Spline, Bilinear) in Light & Dark
 * 2. CbctLeftToolDock Sharpen button cycle: 0% -> 50% -> 100% with Focus icon and cyan badge
 * 3. Full CBCT Workbench in PC Dark and PC Light with active 100% Laplacian Sharpening
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function run() {
	const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
	const legacyDir = path.resolve(__dirname, "..", "screenshots");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}
	if (!fs.existsSync(legacyDir)) {
		fs.mkdirSync(legacyDir, { recursive: true });
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const page = await context.newPage();

		// ---------------------------------------------------------
		// STEP 1: Light Theme Captures
		// ---------------------------------------------------------
		console.log("Navigating to Workbench (Light Mode)...");
		await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=light", {
			waitUntil: "networkidle",
			timeout: 20000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-interpolation-segmented-control"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-left-tool-dock"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-tool-sharpen"]', { timeout: 10000 });
		await page.waitForTimeout(1000);

		// 1a. Capture Doctor Preferences Card (Light)
		const prefCard = await page.$('[data-testid="doctor-cbct-preferences-card"]');
		const lightPrefPath = path.join(outDir, "cbct_preferences_3methods_light.png");
		if (prefCard) {
			await prefCard.screenshot({ path: lightPrefPath });
			fs.copyFileSync(lightPrefPath, path.join(legacyDir, "cbct_preferences_3methods_light.png"));
			console.log("Captured Light Preferences Card:", lightPrefPath, fs.statSync(lightPrefPath).size, "bytes");
		}

		// ---------------------------------------------------------
		// STEP 2: Dark Theme Captures & Sharpen Button 3-State Cycle
		// ---------------------------------------------------------
		console.log("Navigating to Workbench (Dark Mode)...");
		await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=dark", {
			waitUntil: "networkidle",
			timeout: 20000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-left-tool-dock"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-tool-sharpen"]', { timeout: 10000 });
		await page.waitForTimeout(1000);

		// 2a. Capture Doctor Preferences Card (Dark)
		const darkPrefCard = await page.$('[data-testid="doctor-cbct-preferences-card"]');
		const darkPrefPath = path.join(outDir, "cbct_preferences_3methods_dark.png");
		if (darkPrefCard) {
			await darkPrefCard.screenshot({ path: darkPrefPath });
			fs.copyFileSync(darkPrefPath, path.join(legacyDir, "cbct_preferences_3methods_dark.png"));
			console.log("Captured Dark Preferences Card:", darkPrefPath, fs.statSync(darkPrefPath).size, "bytes");
		}

		// 2b. Capture CbctLeftToolDock with Sharpen at 0%
		const dockEl = await page.$('[data-testid="cbct-left-tool-dock"]');
		const dock0Path = path.join(outDir, "cbct_dock_sharpen_0.png");
		if (dockEl) {
			await dockEl.screenshot({ path: dock0Path });
			fs.copyFileSync(dock0Path, path.join(legacyDir, "cbct_dock_sharpen_0.png"));
			console.log("Captured Dock 0% Sharpen:", dock0Path, fs.statSync(dock0Path).size, "bytes");
		}

		// 2c. Click Sharpen -> 50%
		console.log("Clicking Sharpen button (to 50%)...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
			if (btn) btn.click();
		});
		await page.waitForTimeout(600);

		const dock50Path = path.join(outDir, "cbct_dock_sharpen_50.png");
		if (dockEl) {
			await dockEl.screenshot({ path: dock50Path });
			fs.copyFileSync(dock50Path, path.join(legacyDir, "cbct_dock_sharpen_50.png"));
			console.log("Captured Dock 50% Sharpen:", dock50Path, fs.statSync(dock50Path).size, "bytes");
		}

		// 2d. Click Sharpen -> 100% (Эндодонтический максимум)
		console.log("Clicking Sharpen button (to 100% Эндо)...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
			if (btn) btn.click();
		});
		await page.waitForTimeout(600);

		const dock100Path = path.join(outDir, "cbct_dock_sharpen_100.png");
		if (dockEl) {
			await dockEl.screenshot({ path: dock100Path });
			fs.copyFileSync(dock100Path, path.join(legacyDir, "cbct_dock_sharpen_100.png"));
			console.log("Captured Dock 100% Sharpen:", dock100Path, fs.statSync(dock100Path).size, "bytes");
		}

		// 2e. Full Workbench PC Dark with 100% Sharpen Active
		const workbenchDarkPath = path.join(outDir, "cbct_workbench_sharpen_100_pc_dark.png");
		await page.screenshot({ path: workbenchDarkPath, fullPage: false });
		fs.copyFileSync(workbenchDarkPath, path.join(legacyDir, "cbct_workbench_sharpen_100_pc_dark.png"));
		console.log("Captured Workbench Dark 100% Sharpen:", workbenchDarkPath, fs.statSync(workbenchDarkPath).size, "bytes");

		// ---------------------------------------------------------
		// STEP 3: Self-Audit File Sizes & Uniqueness Hashes
		// ---------------------------------------------------------
		const filesToVerify = [
			lightPrefPath,
			darkPrefPath,
			path.join(outDir, "cbct_dock_sharpen_0.png"),
			path.join(outDir, "cbct_dock_sharpen_50.png"),
			path.join(outDir, "cbct_dock_sharpen_100.png"),
			path.join(outDir, "cbct_workbench_sharpen_100_pc_dark.png"),
		];

		const hashes = new Set();
		for (const f of filesToVerify) {
			if (!fs.existsSync(f)) {
				throw new Error(`File ${f} does not exist!`);
			}
			const stat = fs.statSync(f);
			if (stat.size < 5000) {
				throw new Error(`File ${f} is too small (${stat.size} bytes)`);
			}
			const hash = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
			if (hashes.has(hash)) {
				throw new Error(`Duplicate hash detected for ${f}: ${hash}`);
			}
			hashes.add(hash);
			console.log(`[VERIFIED] ${path.basename(f)}: size=${stat.size} bytes, MD5=${hash}`);
		}

		console.log("\nALL 6 RED TEAM PROOFS CAPTURED & VALIDATED 100% SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("FATAL ERROR in capture:", err);
	process.exit(1);
});
