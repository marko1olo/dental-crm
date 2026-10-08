import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots/anesthesia_inquisition");
if (!fs.existsSync(SCREENSHOT_DIR)) {
	fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
	console.log("Launching Microsoft Edge via Playwright...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const page = await context.newPage();
		page.on("console", (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
		page.on("pageerror", (err) => console.error("[Browser Error]:", err));

		console.log("Navigating to http://127.0.0.1:5173/test-anesthesia.html...");
		await page.goto("http://127.0.0.1:5173/test-anesthesia.html", { waitUntil: "networkidle" });
		await page.waitForTimeout(1000);

		// ==========================================
		// PHASE 1: LIGHT THEME
		// ==========================================
		console.log("Applying Light Theme...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await page.waitForTimeout(600);

		// 1. Capture Anesthesia QuickBar in Light Theme
		const lightQuickbarPath = path.join(SCREENSHOT_DIR, "anesthesia_quickbar_pc_light.png");
		await page.screenshot({ path: lightQuickbarPath, fullPage: false });
		console.log(`Saved: ${lightQuickbarPath}`);

		// 2. Open Emergency HUD in Light Theme
		console.log("Opening Emergency HUD in Light Theme...");
		const openEmergencyBtnLight = await page.waitForSelector('[data-testid="btn-open-emergency-hud"]', { timeout: 5000 });
		await openEmergencyBtnLight.click();
		await page.waitForSelector('.emergency-modal-container', { state: "visible", timeout: 5000 });
		await page.waitForTimeout(800);

		const lightEmergencyPath = path.join(SCREENSHOT_DIR, "emergency_rescue_hud_pc_light.png");
		await page.screenshot({ path: lightEmergencyPath, fullPage: false });
		console.log(`Saved: ${lightEmergencyPath}`);

		// Close modal
		const closeBtn = await page.$('.emergency-close-btn');
		if (closeBtn) {
			await closeBtn.click();
			await page.waitForTimeout(400);
		}

		// ==========================================
		// PHASE 2: DARK THEME
		// ==========================================
		console.log("Applying Dark Theme...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(600);

		// 3. Capture Anesthesia QuickBar in Dark Theme
		const darkQuickbarPath = path.join(SCREENSHOT_DIR, "anesthesia_quickbar_pc_dark.png");
		await page.screenshot({ path: darkQuickbarPath, fullPage: false });
		console.log(`Saved: ${darkQuickbarPath}`);

		// 4. Open Emergency HUD in Dark Theme
		console.log("Opening Emergency HUD in Dark Theme...");
		const openEmergencyBtnDark = await page.waitForSelector('[data-testid="btn-open-emergency-hud"]', { timeout: 5000 });
		await openEmergencyBtnDark.click();
		await page.waitForSelector('.emergency-modal-container', { state: "visible", timeout: 5000 });
		await page.waitForTimeout(800);

		const darkEmergencyPath = path.join(SCREENSHOT_DIR, "emergency_rescue_hud_pc_dark.png");
		await page.screenshot({ path: darkEmergencyPath, fullPage: false });
		console.log(`Saved: ${darkEmergencyPath}`);

		console.log("All 4 screenshots successfully captured!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
