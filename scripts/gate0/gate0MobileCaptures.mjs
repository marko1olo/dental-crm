/**
 * scripts/gate0/gate0MobileCaptures.mjs
 * Captures 390x844 @2x Mobile Light/Dark proofs for Tooth 46.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { OUT_DIR, STAND_BASE_URL, VIEWPORTS } from "./gate0CaptureConstants.mjs";
import { setZoom, suppressOverlays, switchTheme } from "./gate0BrowserHelper.mjs";
import { verifyAntiBlankGuard } from "./gate0AntiBlankGuard.mjs";

export async function captureMobileProofs(browser, results) {
	console.log("\n=== [Phase 2] Mobile 390x844 @2x Visual Proofs ===");
	const context = await browser.newContext(VIEWPORTS.mobile);
	const page = await context.newPage();

	console.log(`[Mobile] Navigating to ${STAND_BASE_URL}...`);
	await page.goto(STAND_BASE_URL, { waitUntil: "commit", timeout: 60000 });
	await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]', { timeout: 45000 });
	await page.waitForSelector('svg[role="img"]', { timeout: 30000 });
	await suppressOverlays(page);
	await setZoom(page, 2);

	// Mobile Light
	console.log("[Mobile] Capturing Mobile Light mode (390x844@2x)...");
	await switchTheme(page, "light");
	const lightPath = path.join(OUT_DIR, "gate0_tooth46_mobile_light.png");
	await page.screenshot({ path: lightPath, fullPage: false, animations: "disabled" });
	const lightRes = verifyAntiBlankGuard(lightPath);
	console.log(`[PASS] gate0_tooth46_mobile_light.png: ${lightRes.size} bytes (stddev: ${lightRes.stdDev})`);
	results.push({ file: "gate0_tooth46_mobile_light.png", ...lightRes, viewport: "390x844@2x", theme: "Light" });

	// Mobile Dark
	console.log("[Mobile] Capturing Mobile Dark mode (390x844@2x)...");
	await switchTheme(page, "dark");
	const darkPath = path.join(OUT_DIR, "gate0_tooth46_mobile_dark.png");
	await page.screenshot({ path: darkPath, fullPage: false, animations: "disabled" });
	const darkRes = verifyAntiBlankGuard(darkPath);
	console.log(`[PASS] gate0_tooth46_mobile_dark.png: ${darkRes.size} bytes (stddev: ${darkRes.stdDev})`);
	results.push({ file: "gate0_tooth46_mobile_dark.png", ...darkRes, viewport: "390x844@2x", theme: "Dark" });

	await context.close();
}
