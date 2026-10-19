/**
 * scripts/capture-odontogram-gate0-4state.mjs
 * Gate 0 4-state visual capture delegate (Mandate 8b <= 120 lines).
 */

import { existsSync, mkdirSync } from "node:fs";
import { OUT_DIR, STAND_BASE_URL } from "./gate0/gate0CaptureConstants.mjs";
import { ensureViteServer } from "./gate0/gate0ServerHelper.mjs";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";
import { captureDesktopProofs } from "./gate0/gate0DesktopCaptures.mjs";
import { captureMobileProofs } from "./gate0/gate0MobileCaptures.mjs";

async function run() {
	if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
	let viteProc = null;
	let browser = null;
	const results = [];

	try {
		viteProc = await ensureViteServer(STAND_BASE_URL);
		browser = await launchBrowser();
		await captureDesktopProofs(browser, results);
		await captureMobileProofs(browser, results);
		console.log(`[PASS] 4-state captures complete (${results.length} proofs).`);
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc) {
			try { viteProc.kill(); } catch {}
		}
	}
}

run();
