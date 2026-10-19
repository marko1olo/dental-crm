/**
 * scripts/gate1/gate1MacroCaptures.mjs
 * 10 Macro & Clinical Pathology shots at 4x zoom for Tooth 16.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { MACRO_SHOTS, OUT_DIR, STAND_BASE_URL, VIEWPORTS } from "./gate1CaptureConstants.mjs";
import { selectPreset, setTooth, setZoom, suppressOverlays, switchTheme } from "./gate1BrowserHelper.mjs";
import { verifyByteGuard } from "./gate1AntiBlankGuard.mjs";

export async function captureMacroProofs(browser, results) {
	console.log("\n=== [Phase 3] 10 Macro & Clinical Pathology Captures (4x Zoom) ===");
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	await page.goto(STAND_BASE_URL, { waitUntil: "load", timeout: 30000 });
	await page.waitForSelector('[data-testid="tooth-16-gate1-stand"]', { timeout: 20000 });
	await suppressOverlays(page);
	await setTooth(page, 16);
	await setZoom(page, 4);
	await switchTheme(page, "dark");

	await page.evaluate(() => {
		const hud = document.querySelector(".stand-hud");
		if (hud) hud.style.display = "none";
	});

	const svgLocator = page.locator('svg[role="img"]');
	await svgLocator.waitFor({ state: "visible", timeout: 10000 });

	for (const shot of MACRO_SHOTS) {
		console.log(`\n[Macro] Applying preset "${shot.preset}" for ${shot.name}...`);
		await selectPreset(page, shot.preset);
		await page.waitForTimeout(500);

		const outPath = path.join(OUT_DIR, shot.name);
		await svgLocator.screenshot({ path: outPath, animations: "disabled" });

		const guardRes = verifyByteGuard(outPath);
		console.log(`[PASS] ${shot.name}: ${guardRes.size} bytes (stddev: ${guardRes.stdDev})`);
		results.push({ file: shot.name, ...guardRes, viewport: "4x Macro (Clinical)", theme: "Dark", tooth: 16 });
	}

	await context.close();
}
