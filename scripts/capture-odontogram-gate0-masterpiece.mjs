/**
 * scripts/capture-odontogram-gate0-masterpiece.mjs
 * Master Playwright Visual Atlas Runner for Tooth 46 Gate 0.
 * Mandate 8b <= 120 lines.
 */

import { existsSync, mkdirSync } from "node:fs";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";
import { OUT_DIR, STAND_BASE_URL } from "./gate0/gate0CaptureConstants.mjs";
import { captureDesktopProofs } from "./gate0/gate0DesktopCaptures.mjs";
import { captureMacroProofs } from "./gate0/gate0MacroCaptures.mjs";
import { captureMobileProofs } from "./gate0/gate0MobileCaptures.mjs";
import { ensureViteServer } from "./gate0/gate0ServerHelper.mjs";

async function main() {
	console.log(
		"===============================================================",
	);
	console.log(
		"   DENTE CRM: Tooth 46 Masterpiece Visual Atlas Capture (Gate 0)",
	);
	console.log(
		"===============================================================",
	);

	if (!existsSync(OUT_DIR)) {
		mkdirSync(OUT_DIR, { recursive: true });
	}

	let viteProc = null;
	let browser = null;
	const results = [];

	try {
		viteProc = await ensureViteServer(STAND_BASE_URL);
		browser = await launchBrowser();

		await captureDesktopProofs(browser, results);
		await captureMobileProofs(browser, results);
		await captureMacroProofs(browser, results);

		console.log(
			"\n===============================================================",
		);
		console.log(
			`  VICTORY: Captured & Validated ${results.length} Visual Atlas Proofs!`,
		);
		console.log(
			"===============================================================",
		);
		console.table(
			results.map((r) => ({
				File: r.file,
				Size_KB: (r.size / 1024).toFixed(1) + " KB",
				StdDev: r.stdDev,
				Viewport: r.viewport,
				Status: "PASS",
			})),
		);
	} catch (err) {
		console.error("\n[FATAL ERROR] Visual Atlas capture failed:", err);
		process.exitCode = 1;
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc) {
			console.log("[Vite] Terminating spawned dev server...");
			try {
				viteProc.kill();
			} catch {}
		}
	}
}

main();
