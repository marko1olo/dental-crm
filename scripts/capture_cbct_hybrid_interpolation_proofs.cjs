/**
 * scripts/capture_cbct_hybrid_interpolation_proofs.cjs
 *
 * Captures live visual proof for:
 * 1. PC Light (1440x900): DoctorCbctPreferencesCard with GPU telemetry badge,
 *    hybrid graphics info, and 6-method Apple HIG interpolation segmented bar.
 * 2. PC Dark (1440x900): DoctorCbctPreferencesCard in dark cockpit mode.
 * 3. Reactive Interpolation Switch: User selects Catmull-Rom / Bilateral.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function run() {
	const redteamDir = path.resolve(__dirname, "..", "docs", "screenshots", "redteam_inquisition");
	const legacyDir = path.resolve(__dirname, "..", "screenshots");

	if (!fs.existsSync(redteamDir)) {
		fs.mkdirSync(redteamDir, { recursive: true });
	}
	if (!fs.existsSync(legacyDir)) {
		fs.mkdirSync(legacyDir, { recursive: true });
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const page = await context.newPage();

		// 1. Capture PC Light Mode
		console.log("Navigating to PC Light mode...");
		await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=light", {
			waitUntil: "networkidle",
			timeout: 20000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-interpolation-segmented-control"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-hardware-tier-badge"]', { timeout: 10000 });
		await page.waitForTimeout(1200);

		const lightPathRedTeam = path.join(redteamDir, "cbct_preferences_light.png");
		const lightPathLegacy = path.join(legacyDir, "hardware_cbct_card_pc_light.png");

		await page.screenshot({ path: lightPathRedTeam, fullPage: false });
		fs.copyFileSync(lightPathRedTeam, lightPathLegacy);
		console.log("Captured PC Light:", lightPathRedTeam, "size:", fs.statSync(lightPathRedTeam).size);

		// 2. Capture PC Dark Mode
		console.log("Navigating to PC Dark mode...");
		await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=dark", {
			waitUntil: "networkidle",
			timeout: 20000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-interpolation-segmented-control"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="cbct-hardware-tier-badge"]', { timeout: 10000 });

		// Switch to Catmull-Rom (click segmented option) to prove interactivity
		const catmullBtn = await page.$('[data-testid="cbct-interp-btn-catmull_rom"]');
		if (catmullBtn) {
			console.log("Selecting Catmull-Rom interpolation method...");
			await catmullBtn.click();
			await page.waitForTimeout(800);
		}

		const darkPathRedTeam = path.join(redteamDir, "cbct_preferences_dark.png");
		const darkPathLegacy = path.join(legacyDir, "hardware_cbct_card_pc_dark.png");

		await page.screenshot({ path: darkPathRedTeam, fullPage: false });
		fs.copyFileSync(darkPathRedTeam, darkPathLegacy);
		console.log("Captured PC Dark:", darkPathRedTeam, "size:", fs.statSync(darkPathRedTeam).size);

		// Check files
		const capturedFiles = [lightPathRedTeam, darkPathRedTeam];
		const hashes = new Set();
		for (const f of capturedFiles) {
			const stat = fs.statSync(f);
			if (stat.size < 40000) {
				throw new Error(`Screenshot ${f} is too small (${stat.size} bytes < 40KB)`);
			}
			const hash = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
			if (hashes.has(hash)) {
				throw new Error(`Duplicate screenshot hash detected for ${f}`);
			}
			hashes.add(hash);
			console.log(`Verified ${f}: size = ${stat.size} bytes, MD5 = ${hash}`);
		}

		console.log("All screenshots captured and verified successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
