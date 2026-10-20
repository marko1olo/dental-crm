/**
 * scripts/capture-odontogram-gate2-4state.mjs
 * Main entry point for Gate 2 (Incisors: FDI 11, 21, 12, 22, 31, 41, 32, 42) visual proof capture.
 * Mandate 8b <= 120 lines.
 */

import { STAND_BASE_URL } from "./gate2/gate2CaptureConstants.mjs";
import { ensureViteServer } from "./gate2/gate2ServerHelper.mjs";
import { launchBrowser } from "./gate2/gate2BrowserHelper.mjs";
import { captureDesktopProofs } from "./gate2/gate2DesktopCaptures.mjs";
import { captureMobileProofs } from "./gate2/gate2MobileCaptures.mjs";
import { captureMacroProofs } from "./gate2/gate2MacroCaptures.mjs";

async function main() {
	let viteProc = null;
	let browser = null;
	const results = [];

	try {
		console.log("=================================================================");
		console.log(" Gate 2 (Incisors 11-42) Visual Proof Pipeline — Playwright Capture ");
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
			throw new Error(`[FAIL] Expected at least 18 screenshots, but only captured ${results.length}!`);
		}

		console.log("\n[SUCCESS] All Gate 2 visual proof screenshots validated with Anti-Blank Guard!");
	} catch (err) {
		console.error("\n[FATAL ERROR] Gate 2 visual proof pipeline failed:", err);
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
