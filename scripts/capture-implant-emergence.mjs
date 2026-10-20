/**
 * scripts/capture-implant-emergence.mjs
 * Red Team Visual Proof capture for Tooth 46 Implant Emergence Profile.
 * Mandate 8b <= 120 lines.
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { verifyAntiBlankGuard } from "./gate0/gate0AntiBlankGuard.mjs";
import {
	launchBrowser,
	selectPreset,
	setZoom,
	suppressOverlays,
	switchTheme,
} from "./gate0/gate0BrowserHelper.mjs";
import {
	OUT_DIR,
	STAND_BASE_URL,
	VIEWPORTS,
} from "./gate0/gate0CaptureConstants.mjs";
import { ensureViteServer } from "./gate0/gate0ServerHelper.mjs";

const SHOTS = [
	{ name: "gate0_tooth46_macro_implant_crown.png", preset: "implant_crown", theme: "dark" },
	{ name: "gate0_tooth46_macro_implant_crown_light.png", preset: "implant_crown", theme: "light" },
	{ name: "gate0_tooth46_macro_implant_crown_screw.png", preset: "implant_crown_screw", theme: "dark" },
	{ name: "gate0_tooth46_macro_implant_crown_screw_light.png", preset: "implant_crown_screw", theme: "light" },
	{ name: "gate0_tooth46_macro_implant_healing_abutment.png", preset: "implant_healing_abutment", theme: "dark" },
	{ name: "gate0_tooth46_macro_implant_healing_abutment_light.png", preset: "implant_healing_abutment", theme: "light" },
	{ name: "gate0_tooth46_macro_implant_pure.png", preset: "implant", theme: "dark" },
	{ name: "gate0_tooth46_macro_implant_pure_light.png", preset: "implant", theme: "light" },
	{ name: "gate0_tooth46_macro_implant_temporary.png", preset: "implant_temporary", theme: "dark" },
];

async function main() {
	console.log("=== Capturing Tooth 46 Implant Emergence Profile Proofs ===");
	if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

	let viteProc = null;
	let browser = null;

	try {
		viteProc = await ensureViteServer(STAND_BASE_URL);
		browser = await launchBrowser();
		const context = await browser.newContext(VIEWPORTS.desktop);
		const page = await context.newPage();

		await page.goto(STAND_BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
		await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]', { state: "visible", timeout: 45000 });
		await suppressOverlays(page);
		await setZoom(page, 4);

		try {
			await page.evaluate(() => {
				const hud = document.querySelector(".stand-hud");
				if (hud) hud.style.display = "none";
			});
		} catch {}

		for (const shot of SHOTS) {
			console.log(`[Capture] Preset: ${shot.preset} (${shot.theme}) -> ${shot.name}...`);
			await switchTheme(page, shot.theme);
			await selectPreset(page, shot.preset);
			const svgEl = page.locator('svg[role="img"]').first();
			await svgEl.waitFor({ state: "visible", timeout: 15000 });
			await page.waitForTimeout(400);

			const outPath = path.join(OUT_DIR, shot.name);
			await svgEl.screenshot({ path: outPath, animations: "disabled", timeout: 15000 });
			const guard = verifyAntiBlankGuard(outPath);
			console.log(`[PASS] ${shot.name}: ${guard.size} bytes (stdDev: ${guard.stdDev})`);
		}

		await context.close();
		console.log("\n[VICTORY] All implant emergence profile proofs successfully captured!");
	} catch (err) {
		console.error("[ERROR] Capture failed:", err);
		process.exitCode = 1;
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc) {
			try {
				viteProc.kill();
			} catch {}
		}
	}
}

main();
