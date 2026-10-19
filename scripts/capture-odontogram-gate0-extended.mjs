/**
 * scripts/capture-odontogram-gate0-extended.mjs
 * Gate 0 extended macro visual capture delegate (Mandate 8b <= 120 lines).
 */

import { existsSync, mkdirSync } from "node:fs";
import { OUT_DIR, STAND_BASE_URL } from "./gate0/gate0CaptureConstants.mjs";
import { ensureViteServer } from "./gate0/gate0ServerHelper.mjs";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";
import { captureMacroProofs } from "./gate0/gate0MacroCaptures.mjs";

async function run() {
	if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
	let viteProc = null;
	let browser = null;
	const results = [];

	try {
		viteProc = await ensureViteServer(STAND_BASE_URL);
		browser = await launchBrowser();
		await captureMacroProofs(browser, results);
		console.log(`[PASS] Extended macro captures complete (${results.length} proofs).`);
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc) {
			try { viteProc.kill(); } catch {}
		}
	}
}

run();
