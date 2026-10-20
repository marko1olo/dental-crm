/**
 * scripts/gate0/gate0DesktopCaptures.mjs
 * Captures 1440x900 Desktop Light/Dark proofs for Tooth 46.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { verifyAntiBlankGuard } from "./gate0AntiBlankGuard.mjs";
import {
	setZoom,
	suppressOverlays,
	switchTheme,
} from "./gate0BrowserHelper.mjs";
import {
	OUT_DIR,
	STAND_BASE_URL,
	VIEWPORTS,
} from "./gate0CaptureConstants.mjs";

export async function captureDesktopProofs(browser, results) {
	console.log("\n=== [Phase 1] Desktop PC 1440x900 Visual Proofs ===");
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	console.log(`[PC] Navigating to ${STAND_BASE_URL}...`);
	await page.goto(STAND_BASE_URL, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]', {
		timeout: 60000,
	});
	await page.waitForSelector('svg[role="img"]', { timeout: 45000 });
	await suppressOverlays(page);
	await setZoom(page, 2);

	// Light mode
	console.log("[PC] Capturing Desktop Light mode (1440x900)...");
	await switchTheme(page, "light");
	const lightPath = path.join(OUT_DIR, "gate0_tooth46_pc_light.png");
	await page.screenshot({
		path: lightPath,
		fullPage: false,
		animations: "disabled",
	});
	const lightRes = verifyAntiBlankGuard(lightPath);
	console.log(
		`[PASS] gate0_tooth46_pc_light.png: ${lightRes.size} bytes (stddev: ${lightRes.stdDev})`,
	);
	results.push({
		file: "gate0_tooth46_pc_light.png",
		...lightRes,
		viewport: "1440x900",
		theme: "Light",
	});

	// Dark mode
	console.log("[PC] Capturing Desktop Dark mode (1440x900)...");
	await switchTheme(page, "dark");
	const darkPath = path.join(OUT_DIR, "gate0_tooth46_pc_dark.png");
	await page.screenshot({
		path: darkPath,
		fullPage: false,
		animations: "disabled",
	});
	const darkRes = verifyAntiBlankGuard(darkPath);
	console.log(
		`[PASS] gate0_tooth46_pc_dark.png: ${darkRes.size} bytes (stddev: ${darkRes.stdDev})`,
	);
	results.push({
		file: "gate0_tooth46_pc_dark.png",
		...darkRes,
		viewport: "1440x900",
		theme: "Dark",
	});

	await context.close();
}
