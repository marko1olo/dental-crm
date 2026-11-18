/**
 * scripts/capture-family-wallet-canonical-4state.mjs
 *
 * Captures 4-state visual proofs for canonical Family Wallet Modal (SSOT):
 * - PC Light (1440x900)
 * - PC Dark (1440x900)
 * - Mobile Light (390x844)
 * - Mobile Dark (390x844)
 */

import path from "node:path";
import fs from "node:fs";
import { capture4StateProof } from "./lib/visualProofEngine.mjs";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/family_wallet");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
	console.log("[Family Wallet Proof] Starting 4-state capture via visualProofEngine...");

	const results = await capture4StateProof({
		domain: "family_wallet",
		screenName: "family_wallet",
		hashRoute: "#patients",
		outputDir: OUT_DIR,
		readySelector: "[data-testid='patients-view'], .patients-panel, [data-patient-id], main",
		actionBeforeCapture: async (page, stateInfo) => {
			console.log(`[Action] Opening Family Wallet Modal for state ${stateInfo.state}...`);
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("dente-open-family-wallet", {
						detail: {
							patientId: "01a00000-0000-0000-0000-000000000001",
							patientName: "Воронова Светлана Сергеевна",
						},
					}),
				);
			});

			await page.waitForSelector("[data-testid='family-wallet-modal']", {
				state: "visible",
				timeout: 10000,
			});
			await page.waitForTimeout(500);
			console.log(`[Action] Family Wallet Modal is visible in DOM for ${stateInfo.state}!`);
		},
	});

	console.log("[Family Wallet Proof] Engine capture completed with results:", results.length);

	// Also create standard 01..04 copies for test suite compatibility
	const mapping = {
		pc_light: "01_family_wallet_pc_light_1440x900.png",
		pc_dark: "02_family_wallet_pc_dark_1440x900.png",
		mobile_light: "03_family_wallet_mobile_light_390x844.png",
		mobile_dark: "04_family_wallet_mobile_dark_390x844.png",
	};

	for (const r of results) {
		const targetName = mapping[r.state];
		if (targetName) {
			const targetPath = path.join(OUT_DIR, targetName);
			fs.copyFileSync(r.filePath, targetPath);
			console.log(`[Proof Aliased] ${r.filename} -> ${targetName} (${r.sizeKb} KB)`);
		}
	}

	console.log("\n=== ALL 4-STATE FAMILY WALLET PROOFS GENERATED AND VERIFIED ===");
}

main().catch((err) => {
	console.error("[FATAL] Family Wallet Capture Failed:", err);
	process.exit(1);
});
