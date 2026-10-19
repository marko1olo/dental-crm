/**
 * scripts/capture-odontogram-gate1-4state.mjs
 * Main entry point for Gate 1 (FDI 16 & 26) 4-state visual proof capture pipeline.
 * Mandate 8b <= 120 lines.
 */

import { STAND_BASE_URL } from "./gate1/gate1CaptureConstants.mjs";
import { ensureViteServer } from "./gate1/gate1ServerHelper.mjs";
import { launchBrowser } from "./gate1/gate1BrowserHelper.mjs";
import { captureDesktopProofs } from "./gate1/gate1DesktopCaptures.mjs";
import { captureMobileProofs } from "./gate1/gate1MobileCaptures.mjs";
import { captureMacroProofs } from "./gate1/gate1MacroCaptures.mjs";

async function main() {
	let viteProc = null;
	let browser = null;
	const results = [];

	try {
		console.log("=================================================================");
		console.log(" Gate 1 (FDI 16 & 26) Visual Proof Pipeline — Playwright Capture ");
		console.log("=================================================================");

		viteProc = await ensureViteServer(STAND_BASE_URL);
		browser = await launchBrowser();

		await captureDesktopProofs(browser, results);
		await captureMobileProofs(browser, results);
		await captureMacroProofs(browser, results);

		console.log("\n=================================================================");
		console.log(` SUMMARY: ${results.length} Screenshots Captured Successfully`);
		console.log("=================================================================");
		console.table(
			results.map((r) => ({
				Screenshot: r.file,
				Size_Bytes: r.size,
				StdDev: r.stdDev,
				Viewport: r.viewport,
				Theme: r.theme,
				Tooth: r.tooth,
				Status: "PASS",
			}))
		);

		if (results.length < 18) {
			throw new Error(`[FAIL] Expected 18 screenshots, but only captured ${results.length}!`);
		}

		console.log("\n[SUCCESS] All 18 visual proof screenshots validated with Anti-Blank Guard!");
	} catch (err) {
		console.error("\n[FATAL ERROR] Visual proof pipeline failed:", err);
		process.exitCode = 1;
	} finally {
		if (browser) {
			try {
				await browser.close();
			} catch {}
		}
		if (viteProc) {
			try {
				viteProc.kill();
			} catch {}
		}
	}
}

main();
