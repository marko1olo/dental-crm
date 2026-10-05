/**
 * scripts/take_mobile_hig_inquisition_proofs.cjs
 * Red Team Mobile HIG Screenshot Pipeline & Visual Proof Generator.
 *
 * Captures 10 mandatory mobile screenshots (390x844, iPhone 14/15/16 Pro emulation):
 * 1. 01_schedule_agenda_light_390x844.png - Vertical Agenda view (Light theme)
 * 2. 02_schedule_agenda_dark_390x844.png - Vertical Agenda view (Dark theme)
 * 3. 03_schedule_sheet_light_390x844.png - Schedule Bottom Sheet Drawer (Light theme)
 * 4. 04_schedule_sheet_dark_390x844.png - Schedule Bottom Sheet Drawer (Dark theme)
 * 5. 05_visit_chairside_light_390x844.png - Chairside EHR Workspace (Light theme)
 * 6. 06_visit_chairside_dark_390x844.png - Chairside EHR Workspace (Dark theme)
 * 7. 07_patient_profile_light_390x844.png - Patient Medical Card / Profile HUD (Light theme)
 * 8. 08_patient_profile_dark_390x844.png - Patient Medical Card / Profile HUD (Dark theme)
 * 9. 09_payment_checkout_light_390x844.png - 54-FZ Cashier & POS Bottom Sheet (Light theme)
 * 10. 10_payment_checkout_dark_390x844.png - 54-FZ Cashier & POS Bottom Sheet (Dark theme)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function main() {
	const outDirs = [
		path.resolve(__dirname, "../docs/screenshots/mobile_hig_inquisition"),
		path.resolve("C:/Users/Admin/.gemini/antigravity/brain/70d796c0-385d-4e68-8afb-6223942e13ae"),
	];

	for (const dir of outDirs) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	console.log("[Mobile HIG Inquisitor] Launching Chrome (iPhone 14/15 390x844 emulation)...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
	});

	const page = await context.newPage();
	const capturedFiles = [];

	async function capture(filename) {
		const targetPath = path.join(outDirs[0], filename);
		await page.screenshot({ path: targetPath, fullPage: false });

		const buf = fs.readFileSync(targetPath);
		const sizeKb = (buf.length / 1024).toFixed(1);
		const hash = crypto.createHash("md5").update(buf).digest("hex");

		if (buf.length < 25 * 1024) {
			throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 25 KB)`);
		}

		for (let i = 1; i < outDirs.length; i++) {
			fs.copyFileSync(targetPath, path.join(outDirs[i], filename));
		}

		capturedFiles.push({
			name: filename,
			path: targetPath,
			sizeKb,
			hash: hash.slice(0, 10),
		});
		console.log(`     [OK] Captured ${filename} (${sizeKb} KB, MD5: ${hash.slice(0, 10)})`);
	}

	// Helper to navigate and wait
	async function openScreen(screen, theme) {
		const url = `http://127.0.0.1:5173/mobile_hig_preview.html?screen=${screen}&theme=${theme}&hideDevBar=1`;
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(600);
	}

	// 1. Schedule Agenda (Light)
	console.log("\n[1/10] Capturing Schedule Agenda (Light, 390x844)...");
	await openScreen("schedule", "light");
	await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { state: "visible", timeout: 10000 });
	await capture("01_schedule_agenda_light_390x844.png");

	// 2. Schedule Agenda (Dark)
	console.log("\n[2/10] Capturing Schedule Agenda (Dark, 390x844)...");
	await openScreen("schedule", "dark");
	await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { state: "visible", timeout: 10000 });
	await capture("02_schedule_agenda_dark_390x844.png");

	// 3. Schedule Bottom Sheet (Light)
	console.log("\n[3/10] Capturing Schedule Bottom Sheet (Light, 390x844)...");
	await openScreen("schedule", "light");
	const apptCardLight = page.locator('[data-testid="schedule-mobile-appt-card"]').first();
	await apptCardLight.waitFor({ timeout: 5000 });
	await apptCardLight.click();
	await page.waitForSelector('[data-testid="schedule-grid-mobile-bottom-sheet"]', { state: "visible", timeout: 10000 });
	await page.waitForTimeout(400);
	await capture("03_schedule_sheet_light_390x844.png");

	// 4. Schedule Bottom Sheet (Dark)
	console.log("\n[4/10] Capturing Schedule Bottom Sheet (Dark, 390x844)...");
	await openScreen("schedule", "dark");
	const apptCardDark = page.locator('[data-testid="schedule-mobile-appt-card"]').first();
	await apptCardDark.waitFor({ timeout: 5000 });
	await apptCardDark.click();
	await page.waitForSelector('[data-testid="schedule-grid-mobile-bottom-sheet"]', { state: "visible", timeout: 10000 });
	await page.waitForTimeout(400);
	await capture("04_schedule_sheet_dark_390x844.png");

	// 5. Chairside EHR Workspace (Light)
	console.log("\n[5/10] Capturing Chairside EHR Workspace (Light, 390x844)...");
	await openScreen("chairside", "light");
	await page.waitForSelector('[data-testid="mobile-chairside-workspace"]', { state: "visible", timeout: 10000 });
	await capture("05_visit_chairside_light_390x844.png");

	// 6. Chairside EHR Workspace (Dark)
	console.log("\n[6/10] Capturing Chairside EHR Workspace (Dark, 390x844)...");
	await openScreen("chairside", "dark");
	await page.waitForSelector('[data-testid="mobile-chairside-workspace"]', { state: "visible", timeout: 10000 });
	await capture("06_visit_chairside_dark_390x844.png");

	// 7. Patient Medical Card Profile (Light)
	console.log("\n[7/10] Capturing Patient Medical Card Profile (Light, 390x844)...");
	await openScreen("patient_profile", "light");
	await page.waitForSelector('[data-testid="mobile-patient-profile-workspace"]', { state: "visible", timeout: 10000 });
	await capture("07_patient_profile_light_390x844.png");

	// 8. Patient Medical Card Profile (Dark)
	console.log("\n[8/10] Capturing Patient Medical Card Profile (Dark, 390x844)...");
	await openScreen("patient_profile", "dark");
	await page.waitForSelector('[data-testid="mobile-patient-profile-workspace"]', { state: "visible", timeout: 10000 });
	await capture("08_patient_profile_dark_390x844.png");

	// 9. Payment 54-FZ Bottom Sheet (Light)
	console.log("\n[9/10] Capturing Payment 54-FZ Bottom Sheet (Light, 390x844)...");
	await openScreen("payment", "light");
	await page.waitForSelector('[data-testid="payment-modal-studio"]', { state: "visible", timeout: 10000 });
	await capture("09_payment_checkout_light_390x844.png");

	// 10. Payment 54-FZ Bottom Sheet (Dark)
	console.log("\n[10/10] Capturing Payment 54-FZ Bottom Sheet (Dark, 390x844)...");
	await openScreen("payment", "dark");
	await page.waitForSelector('[data-testid="payment-modal-studio"]', { state: "visible", timeout: 10000 });
	await capture("10_payment_checkout_dark_390x844.png");

	await browser.close();

	console.log("\n========================================================");
	console.log("[Mobile HIG Inquisitor] ALL 10 SCREENSHOTS CAPTURED SUCCESSFULLY!");
	console.log("========================================================");
	for (const f of capturedFiles) {
		console.log(`- ${f.name}: ${f.sizeKb} KB (MD5: ${f.hash}) -> ${f.path}`);
	}
}

main().catch((err) => {
	console.error("[Mobile HIG Inquisitor] FATAL ERROR:", err);
	process.exit(1);
});
