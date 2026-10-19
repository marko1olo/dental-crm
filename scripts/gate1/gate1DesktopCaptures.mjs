/**
 * scripts/gate1/gate1DesktopCaptures.mjs
 * Captures 1440x900 Desktop Light/Dark proofs for FDI 16 and 26.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { OUT_DIR, STAND_BASE_URL, VIEWPORTS } from "./gate1CaptureConstants.mjs";
import { setTooth, suppressOverlays, switchTheme } from "./gate1BrowserHelper.mjs";
import { verifyByteGuard } from "./gate1AntiBlankGuard.mjs";

export async function captureDesktopProofs(browser, results) {
	console.log("\n=== [Phase 1] Desktop PC 1440x900 Visual Proofs ===");
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	console.log(`[PC] Navigating to ${STAND_BASE_URL}...`);
	await page.goto(STAND_BASE_URL, { waitUntil: "load", timeout: 30000 });
	await page.waitForSelector('[data-testid="tooth-16-gate1-stand"]', { timeout: 20000 });
	await page.waitForSelector('svg[role="img"]', { timeout: 15000 });
	await suppressOverlays(page);

	const teeth = [
		{ num: 16, lightFile: "gate1_tooth16_pc_light.png", darkFile: "gate1_tooth16_pc_dark.png" },
		{ num: 26, lightFile: "gate1_tooth26_pc_light.png", darkFile: "gate1_tooth26_pc_dark.png" },
	];

	for (const t of teeth) {
		console.log(`\n[PC Tooth ${t.num}] Selecting tooth...`);
		await setTooth(page, t.num);

		// Light mode
		console.log(`[PC Tooth ${t.num}] Capturing Light mode...`);
		await switchTheme(page, "light");
		const lightPath = path.join(OUT_DIR, t.lightFile);
		await page.screenshot({ path: lightPath, fullPage: false, animations: "disabled" });
		const lightRes = verifyByteGuard(lightPath);
		console.log(`[PASS] ${t.lightFile}: ${lightRes.size} bytes (stddev: ${lightRes.stdDev})`);
		results.push({ file: t.lightFile, ...lightRes, viewport: "1440x900", theme: "Light", tooth: t.num });

		// Dark mode
		console.log(`[PC Tooth ${t.num}] Capturing Dark mode...`);
		await switchTheme(page, "dark");
		const darkPath = path.join(OUT_DIR, t.darkFile);
		await page.screenshot({ path: darkPath, fullPage: false, animations: "disabled" });
		const darkRes = verifyByteGuard(darkPath);
		console.log(`[PASS] ${t.darkFile}: ${darkRes.size} bytes (stddev: ${darkRes.stdDev})`);
		results.push({ file: t.darkFile, ...darkRes, viewport: "1440x900", theme: "Dark", tooth: t.num });
	}

	await context.close();
}
