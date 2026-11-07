/**
 * scripts/capture-egisz-journal-canonical.mjs
 *
 * Captures canonical 4-State Proofs for EGISZ REMD Journal using visualProofEngine.mjs
 * Mandate 8al (PC Light/Dark 1440x900, Mobile Light/Dark 390x844), Anti-Blank Byte Guard >= 20KB.
 */

import path from "node:path";
import fs from "node:fs";
import { capture4StateProof, launchProofBrowser } from "./lib/visualProofEngine.mjs";

const CONV_ID = "96425d87-58e2-4062-bd4a-341bd3fa3ca3";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

async function main() {
	console.log("[INQUISITION] Capturing Canonical 4-State Proofs for EGISZ REMD Journal...");
	const browser = await launchProofBrowser();

	try {
		const results = await capture4StateProof({
			domain: "egisz",
			screenName: "egisz_remd_journal",
			baseUrl: "http://127.0.0.1:5173/?egisz=1&demo=true",
			readySelector: ".egisz-modal-container, .egisz-modal-backdrop, .egisz-remd-shell",
			outputDir: path.resolve(process.cwd(), "docs/proofs/egisz"),
			brainDir: BRAIN_DIR,
			browser,
			actionBeforeCapture: async (page) => {
				await page.addStyleTag({
					content: `
						[data-testid="global-toast"],
						.chairside-toast-container,
						.chairside-toast-card,
						.toast-card,
						.status-banner,
						.offline-banner,
						[role="alert"] {
							display: none !important;
							visibility: hidden !important;
						}
					`
				});
				const journalTab = await page.$('.egisz-tab-btn:has-text("Журнал"), button:has-text("Журнал отправки")');
				if (journalTab) {
					console.log("   -> Switching to 'Журнал отправки' tab...");
					await journalTab.click();
					await page.waitForTimeout(500);
				}
				await page.evaluate(() => {
					document.querySelectorAll('.toast, [role="alert"], .status-banner, .offline-banner, .chairside-toast-container').forEach(el => el.remove());
				});
			},
		});

		// Also create 01_.. 04_.. numbered aliases in docs/proofs/egisz for strict DoD
		const egiszDir = path.resolve(process.cwd(), "docs/proofs/egisz");
		const mapping = [
			{ src: "egisz_remd_journal_pc_light_1440x900.png", alias: "01_egisz_journal_pc_light_1440x900.png" },
			{ src: "egisz_remd_journal_pc_dark_1440x900.png", alias: "02_egisz_journal_pc_dark_1440x900.png" },
			{ src: "egisz_remd_journal_mobile_light_390x844.png", alias: "03_egisz_journal_mobile_light_390x844.png" },
			{ src: "egisz_remd_journal_mobile_dark_390x844.png", alias: "04_egisz_journal_mobile_dark_390x844.png" },
		];
		for (const { src, alias } of mapping) {
			const srcPath = path.join(egiszDir, src);
			const aliasPath = path.join(egiszDir, alias);
			if (fs.existsSync(srcPath)) {
				fs.copyFileSync(srcPath, aliasPath);
				console.log(`   -> Copied numbered alias: ${alias}`);
			}
		}

		console.log(`✓ EGISZ REMD Journal: ${results.length} canonical proofs successfully captured.`);
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
