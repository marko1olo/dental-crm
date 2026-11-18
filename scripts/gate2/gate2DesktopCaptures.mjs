/**
 * scripts/gate2/gate2DesktopCaptures.mjs
 * Captures 1440x900 Desktop Light/Dark proofs for FDI 11, 31, 12, 32.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { CORE_TEETH, OUT_DIR, STAND_BASE_URL, VIEWPORTS } from "./gate2CaptureConstants.mjs";
import { setTooth, suppressOverlays, switchTheme } from "./gate2BrowserHelper.mjs";
import { verifyByteGuard } from "./gate2AntiBlankGuard.mjs";

export async function captureDesktopProofs(browser, results) {
	console.log("\n=== [Phase 1] Desktop PC 1440x900 Visual Proofs ===");
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	console.log(`[PC] Navigating to ${STAND_BASE_URL}...`);
	await page.goto(STAND_BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForSelector('[data-testid="tooth-incisor-gate2-stand"]', { timeout: 30000 });
	await page.waitForSelector('svg[role="img"]', { timeout: 20000 });
	await suppressOverlays(page);

	for (const t of CORE_TEETH) {
		console.log(`\n[PC Tooth ${t.num}] Selecting ${t.name}...`);
		await setTooth(page, t.num);

		// Light mode
		console.log(`[PC Tooth ${t.num}] Capturing Light mode...`);
		await switchTheme(page, "light");
		const lightFile = `gate2_tooth${t.num}_pc_light.png`;
		const lightPath = path.join(OUT_DIR, lightFile);
		await page.screenshot({ path: lightPath, fullPage: false, animations: "disabled" });
		const lightRes = verifyByteGuard(lightPath);
		console.log(`[PASS] ${lightFile}: ${lightRes.size} bytes (stddev: ${lightRes.stdDev})`);
		results.push({ file: lightFile, ...lightRes, viewport: "1440x900", theme: "Light", tooth: t.num });

		// Dark mode
		console.log(`[PC Tooth ${t.num}] Capturing Dark mode...`);
		await switchTheme(page, "dark");
		const darkFile = `gate2_tooth${t.num}_pc_dark.png`;
		const darkPath = path.join(OUT_DIR, darkFile);
		await page.screenshot({ path: darkPath, fullPage: false, animations: "disabled" });
		const darkRes = verifyByteGuard(darkPath);
		console.log(`[PASS] ${darkFile}: ${darkRes.size} bytes (stddev: ${darkRes.stdDev})`);
		results.push({ file: darkFile, ...darkRes, viewport: "1440x900", theme: "Dark", tooth: t.num });
	}

	await context.close();
}
