/**
 * scripts/capture_ceph_trg_screenshots.cjs
 *
 * High-resolution Playwright screenshot capture (1440x900) for Orthodontic TRG Cephalometric Analysis:
 * 1. apps/web/public/screenshots/ortho_flow/ceph_trg_analysis_light.png
 * 2. apps/web/public/screenshots/ortho_flow/ceph_trg_analysis_dark.png
 *
 * Copies to parent brain directory C:/Users/Admin/.gemini/antigravity/brain/df880520-dc90-48e7-ab9e-032bd60d9f31/
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
	path.resolve("apps/web/public/screenshots/ortho_flow"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/df880520-dc90-48e7-ab9e-032bd60d9f31"),
];

for (const d of targetDirs) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function applyTheme(page, theme) {
	console.log(`[THEME] Applying ${theme}...`);
	await page.evaluate((th) => {
		localStorage.setItem("dente_theme_mode", th);
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, theme);
	await page.waitForTimeout(1000);
}

async function takeScreen(page, fileName, description) {
	const primaryPath = path.join(targetDirs[0], fileName);
	if (fs.existsSync(primaryPath)) {
		try { fs.unlinkSync(primaryPath); } catch {}
	}
	await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled", timeout: 35000 });
	for (let i = 1; i < targetDirs.length; i++) {
		const dest = path.join(targetDirs[i], fileName);
		fs.copyFileSync(primaryPath, dest);
	}
	const stat = fs.statSync(primaryPath);
	console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
	console.log("=== STARTING CAPTURE OF ORTHODONTIC TRG CEPHALOMETRIC SCREENSHOTS ===");
	let browser;
	try {
		browser = await chromium.launch({
			channel: "chrome",
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	} catch (e) {
		console.log("Fallback to standard bundled chromium launch...");
		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	}

	try {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await page.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "live-token");
			localStorage.setItem("dente_staff_token", "live-token");
			localStorage.setItem("dente_active_role", "owner");
		});

		console.log("1. Navigating to http://127.0.0.1:5173/?ceph=demo...");
		await page.goto("http://127.0.0.1:5173/?ceph=demo", { waitUntil: "domcontentloaded" });

		console.log("2. Waiting for cephalometric modal...");
		const modal = await page.waitForSelector('[data-testid="cephalometric-analysis-modal"]', { timeout: 30000 });
		await page.waitForTimeout(2000);

		// Verify image loaded
		try {
			await page.waitForSelector('img[alt*="Lateral Cephalogram"]', { timeout: 10000 });
			console.log("3. Real lateral TRG X-ray image detected!");
		} catch {
			console.log("Notice: X-ray image selector wait timed out or canvas loaded directly");
		}

		// 1. Capture Light theme
		await applyTheme(page, "light");
		await takeScreen(page, "ceph_trg_analysis_light.png", "PC Light 1440x900 Lateral TRG with Angles Spectrum");

		// 2. Capture Dark theme
		await applyTheme(page, "dark");
		await takeScreen(page, "ceph_trg_analysis_dark.png", "PC Dark 1440x900 Lateral TRG with Angles Spectrum");

		console.log("=== ALL TRG CEPHALOMETRIC SCREENSHOTS CAPTURED SUCCESSFULLY ===");
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

main().catch((err) => {
	console.error("FATAL ERROR IN SCREENSHOT CAPTURE:", err);
	process.exit(1);
});
