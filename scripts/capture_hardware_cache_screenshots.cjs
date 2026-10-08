/**
 * capture_hardware_cache_screenshots.cjs
 *
 * Captures live visual proof for:
 * 1. PC Light (1440x900): DoctorCbctPreferencesCard with "Переоценить" button and tier badge.
 * 2. PC Dark (1440x900): DoctorCbctPreferencesCard in dark mode.
 * 3. Low Battery Mode (1440x900): DoctorCbctPreferencesCard with active BatteryLow badge (30 FPS cap).
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function run() {
	const outDir = path.resolve(__dirname, "screenshots");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
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
		await page.goto("http://localhost:5173/hardware_profiler_preview.html?theme=light", {
			waitUntil: "networkidle",
			timeout: 15000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		await page.waitForTimeout(1000);

		const lightPath = path.join(outDir, "hardware_cbct_card_pc_light.png");
		await page.screenshot({ path: lightPath, fullPage: false });
		console.log("Captured PC Light:", lightPath, "size:", fs.statSync(lightPath).size);

		// 2. Capture PC Dark Mode
		console.log("Navigating to PC Dark mode...");
		await page.goto("http://localhost:5173/hardware_profiler_preview.html?theme=dark", {
			waitUntil: "networkidle",
			timeout: 15000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		await page.waitForTimeout(1000);

		const darkPath = path.join(outDir, "hardware_cbct_card_pc_dark.png");
		await page.screenshot({ path: darkPath, fullPage: false });
		console.log("Captured PC Dark:", darkPath, "size:", fs.statSync(darkPath).size);

		// 3. Capture Low Battery State (Simulate Battery API discharging <= 20%)
		console.log("Injecting Low Battery telemetry into page context...");
		await page.addInitScript(() => {
			navigator.getBattery = async () => ({
				charging: false,
				level: 0.15,
				addEventListener: () => {},
				removeEventListener: () => {},
			});
		});

		await page.goto("http://localhost:5173/hardware_profiler_preview.html?theme=dark", {
			waitUntil: "networkidle",
			timeout: 15000,
		});

		await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { timeout: 10000 });
		// Trigger reevaluate or wait for battery listener
		const reevalBtn = await page.$('[data-testid="button-reevaluate-hardware"]');
		if (reevalBtn) {
			await reevalBtn.click();
			await page.waitForTimeout(600);
		}

		const batteryPath = path.join(outDir, "hardware_cbct_card_battery_low.png");
		await page.screenshot({ path: batteryPath, fullPage: false });
		console.log("Captured Battery Low:", batteryPath, "size:", fs.statSync(batteryPath).size);

		// Verify files
		const files = [lightPath, darkPath, batteryPath];
		const hashes = new Set();
		for (const f of files) {
			const stat = fs.statSync(f);
			if (stat.size < 40000) {
				throw new Error(`Screenshot ${f} is too small (${stat.size} bytes < 40KB)`);
			}
			const hash = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
			if (hashes.has(hash)) {
				throw new Error(`Screenshot ${f} has duplicate hash ${hash}`);
			}
			hashes.add(hash);
		}

		console.log("ALL SCREENSHOTS SUCCESSFULLY CAPTURED AND PASSED MD5 / SIZE INTEGRITY CHECK!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
