/**
 * scripts/gate0/gate0MacroCaptures.mjs
 * Macro clinical pathology captures at 4x zoom for Tooth 46.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { MACRO_SHOTS, OUT_DIR, STAND_BASE_URL, VIEWPORTS } from "./gate0CaptureConstants.mjs";
import { selectPreset, setZoom, suppressOverlays, switchTheme } from "./gate0BrowserHelper.mjs";
import { verifyAntiBlankGuard } from "./gate0AntiBlankGuard.mjs";

export async function captureMacroProofs(browser, results) {
	console.log(`\n=== [Phase 3] ${MACRO_SHOTS.length} Macro Clinical Pathology Captures (4x Zoom) ===`);
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	await page.goto(STAND_BASE_URL, { waitUntil: "commit", timeout: 60000 });
	await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]', { timeout: 45000 });
	await suppressOverlays(page);
	await setZoom(page, 4);

	await page.evaluate(() => {
		const hud = document.querySelector(".stand-hud");
		if (hud) hud.style.display = "none";
	});

	const svgLocator = page.locator('svg[role="img"]');
	await svgLocator.waitFor({ state: "visible", timeout: 10000 });

	for (const shot of MACRO_SHOTS) {
		console.log(`\n[Macro] Applying preset "${shot.preset}" for ${shot.name}...`);
		// Special theme handling for contrast: Light for cusps/caries/crowns, Dark for canals/granuloma/implant
		const isDarkShot = shot.preset.includes("pulp") || shot.preset.includes("periodontitis") ||
			shot.preset.includes("endo") || shot.preset.includes("broken") || shot.preset.includes("cyst");
		await switchTheme(page, isDarkShot ? "dark" : "light");

		await selectPreset(page, shot.preset);
		await page.waitForTimeout(450);

		const outPath = path.join(OUT_DIR, shot.name);
		await svgLocator.screenshot({ path: outPath, animations: "disabled" });

		const guardRes = verifyAntiBlankGuard(outPath);
		console.log(`[PASS] ${shot.name}: ${guardRes.size} bytes (stddev: ${guardRes.stdDev})`);
		results.push({ file: shot.name, ...guardRes, viewport: "4x Macro", preset: shot.preset });
	}

	await context.close();
}
