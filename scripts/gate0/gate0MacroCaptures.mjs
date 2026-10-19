/**
 * scripts/gate0/gate0MacroCaptures.mjs
 * Macro clinical pathology captures at 4x zoom for Tooth 46.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";
import { verifyAntiBlankGuard } from "./gate0AntiBlankGuard.mjs";
import {
	selectPreset,
	setZoom,
	suppressOverlays,
	switchTheme,
} from "./gate0BrowserHelper.mjs";
import {
	MACRO_SHOTS,
	OUT_DIR,
	STAND_BASE_URL,
	VIEWPORTS,
} from "./gate0CaptureConstants.mjs";

export async function captureMacroProofs(browser, results) {
	console.log(
		`\n=== [Phase 3] ${MACRO_SHOTS.length} Macro Clinical Pathology Captures (4x Zoom) ===`,
	);
	const context = await browser.newContext(VIEWPORTS.desktop);
	const page = await context.newPage();

	await page.goto(STAND_BASE_URL, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]', {
		state: "visible",
		timeout: 45000,
	});
	await suppressOverlays(page);
	await setZoom(page, 4);

	try {
		await page.evaluate(() => {
			const hud = document.querySelector(".stand-hud");
			if (hud) hud.style.display = "none";
		});
	} catch {}

	for (const shot of MACRO_SHOTS) {
		console.log(
			`\n[Macro] Applying preset "${shot.preset}" for ${shot.name}...`,
		);
		let captured = false;

		for (let attempt = 1; attempt <= 3 && !captured; attempt++) {
			try {
				await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]', {
					state: "visible",
					timeout: 15000,
				});
				const svgEl = page.locator('svg[role="img"]').first();
				await svgEl.waitFor({ state: "visible", timeout: 15000 });

				const isDarkShot = Boolean(
					shot.isDark ??
						(shot.preset.includes("pulp") ||
							shot.preset.includes("periodontitis") ||
							shot.preset.includes("endo") ||
							shot.preset.includes("broken") ||
							shot.preset.includes("cyst") ||
							shot.preset.includes("necrotic") ||
							shot.preset.includes("implant")),
				);
				await switchTheme(page, isDarkShot ? "dark" : "light");
				await selectPreset(page, shot.preset);

				// Повторное ожидание svg после применения пресета
				await svgEl.waitFor({ state: "visible", timeout: 15000 });
				await page.waitForTimeout(350);

				const outPath = path.join(OUT_DIR, shot.name);
				await svgEl.screenshot({
					path: outPath,
					animations: "disabled",
					timeout: 15000,
				});
				const guardRes = verifyAntiBlankGuard(outPath);
				console.log(
					`[PASS] ${shot.name}: ${guardRes.size} bytes (stddev: ${guardRes.stdDev})`,
				);
				results.push({
					file: shot.name,
					...guardRes,
					viewport: "4x Macro",
					preset: shot.preset,
				});
				captured = true;
			} catch (err) {
				console.warn(
					`[WARN] Attempt ${attempt}/3 failed for ${shot.name} (${shot.preset}):`,
					err.message,
				);
				if (attempt < 3) {
					await page.waitForTimeout(500);
					try {
						await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
					} catch {}
				}
			}
		}
	}

	await context.close();
}
