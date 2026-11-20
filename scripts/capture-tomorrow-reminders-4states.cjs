/**
 * scripts/capture-tomorrow-reminders-4states.cjs
 * 4-State Visual Proof Capture for Tomorrow Appointment Reminders Modal (Communications Hub):
 * 1. docs/proofs/communications/01_tomorrow_reminders_pc_light_1440x900.png
 * 2. docs/proofs/communications/02_tomorrow_reminders_pc_dark_1440x900.png
 * 3. docs/proofs/communications/03_tomorrow_reminders_mobile_light_390x844.png
 * 4. docs/proofs/communications/04_tomorrow_reminders_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const today = new Date().toISOString().slice(0, 10);
const TARGET_URL = `http://127.0.0.1:5173/?demo=true&date=${today}#reminders`;

async function setTheme(page, themeId, isDark) {
	await page.evaluate(
		({ themeId, isDark }) => {
			document.documentElement.setAttribute("data-theme", themeId);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(themeId);
			}
			localStorage.setItem("dente_theme_mode", themeId);
		},
		{ themeId, isDark }
	);
	await page.waitForTimeout(600);
}

async function captureProof(page, targetPath) {
	await page.screenshot({ path: targetPath, fullPage: false });
	const stats = fs.statSync(targetPath);
	const sizeKb = (stats.size / 1024).toFixed(1);
	console.log(`  -> Captured: ${path.basename(targetPath)} (${sizeKb} KB)`);

	const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/56194770-85e4-4871-b840-55d2ddb01d11");
	try {
		if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
		fs.copyFileSync(targetPath, path.join(brainDir, path.basename(targetPath)));
	} catch (_) {}

	if (stats.size < 20 * 1024) {
		throw new Error(`Screenshot ${targetPath} is too small: ${sizeKb} KB (< 20 KB)`);
	}
	return targetPath;
}

async function main() {
	const proofDir = path.resolve(__dirname, "../docs/proofs/communications");
	if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// ================= 1. PC (1440x900) =================
		console.log("\n--- Phase 1: PC Desktop Tomorrow Reminders (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		const pcPage = await pcContext.newPage();

		console.log(`  -> Navigating to ${TARGET_URL}...`);
		await pcPage.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
		await pcPage.waitForSelector('[data-testid="tomorrow-reminders-modal"], .tomorrow-reminders-modal', {
			timeout: 20000,
			state: "visible",
		});
		await pcPage.waitForTimeout(800);

		// PC Light
		console.log("  -> Capturing Tomorrow Reminders PC Light...");
		await setTheme(pcPage, "light", false);
		await captureProof(pcPage, path.join(proofDir, "01_tomorrow_reminders_pc_light_1440x900.png"));

		// PC Dark
		console.log("  -> Capturing Tomorrow Reminders PC Dark...");
		await setTheme(pcPage, "dark", true);
		await captureProof(pcPage, path.join(proofDir, "02_tomorrow_reminders_pc_dark_1440x900.png"));

		await pcContext.close();

		// ================= 2. MOBILE (390x844) =================
		console.log("\n--- Phase 2: Mobile Apple HIG Tomorrow Reminders (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		});
		const mobilePage = await mobileContext.newPage();

		console.log(`  -> Navigating to ${TARGET_URL} on Mobile...`);
		await mobilePage.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
		await mobilePage.waitForSelector('[data-testid="tomorrow-reminders-modal"], .tomorrow-reminders-modal', {
			timeout: 20000,
			state: "visible",
		});
		await mobilePage.waitForTimeout(800);

		// Mobile Light
		console.log("  -> Capturing Tomorrow Reminders Mobile Light...");
		await setTheme(mobilePage, "light", false);
		await captureProof(mobilePage, path.join(proofDir, "03_tomorrow_reminders_mobile_light_390x844.png"));

		// Mobile Dark
		console.log("  -> Capturing Tomorrow Reminders Mobile Dark...");
		await setTheme(mobilePage, "dark", true);
		await captureProof(mobilePage, path.join(proofDir, "04_tomorrow_reminders_mobile_dark_390x844.png"));

		await mobileContext.close();

		console.log("\n=== ALL 4 REQUIRED TOMORROW REMINDERS PROOFS CAPTURED & VALIDATED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[Tomorrow Reminders Proof] ERROR:", err);
	process.exit(1);
});
