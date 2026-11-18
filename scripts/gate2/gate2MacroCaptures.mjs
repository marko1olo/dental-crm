/**
 * scripts/gate2/gate2MacroCaptures.mjs
 * 7 Macro & Clinical Pathology shots at 4x zoom for Incisors (Gate 2).
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { MACRO_SHOTS, OUT_DIR, STAND_BASE_URL, VIEWPORTS } from "./gate2CaptureConstants.mjs";
import { selectPreset, setTooth, setZoom, suppressOverlays, switchTheme } from "./gate2BrowserHelper.mjs";
import { verifyByteGuard } from "./gate2AntiBlankGuard.mjs";

export async function captureMacroProofs(browser, results) {
	console.log("\n=== [Phase 3] 7 Macro & Clinical Pathology Captures (4x Zoom) ===");
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	await page.goto(STAND_BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForSelector('[data-testid="tooth-incisor-gate2-stand"]', { timeout: 30000 });
	await suppressOverlays(page);
	await setZoom(page, 4);
	await switchTheme(page, "dark");

	await page.evaluate(() => {
		const hud = document.querySelector(".stand-hud");
		if (hud) hud.style.display = "none";
	});

	const svgLocator = page.locator('svg[role="img"]');
	await svgLocator.waitFor({ state: "visible", timeout: 10000 });

	for (const shot of MACRO_SHOTS) {
		console.log(`\n[Macro] Tooth ${shot.tooth} -> preset "${shot.preset}" for ${shot.label}...`);
		await setTooth(page, shot.tooth);
		await selectPreset(page, shot.preset);
		await page.waitForTimeout(500);

		const outPath = path.join(OUT_DIR, shot.file);
		await svgLocator.screenshot({ path: outPath, animations: "disabled" });

		const guardRes = verifyByteGuard(outPath);
		console.log(`[PASS] ${shot.file}: ${guardRes.size} bytes (stddev: ${guardRes.stdDev})`);
		results.push({ file: shot.file, ...guardRes, viewport: "4x Macro (Clinical)", theme: "Dark", tooth: shot.tooth });
	}

	await context.close();
}
