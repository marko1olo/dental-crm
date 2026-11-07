/**
 * scripts/capture-egisz-mdlp-proofs.mjs
 *
 * Captures 4-State Proofs for EGISZ REMD Journal and MDLP Chestny Znak Scanning & Disposal.
 * Mandate 8al (PC Light/Dark 1440x900, Mobile Light/Dark 390x844), Anti-Blank Byte Guard >= 20KB.
 */

import path from "node:path";
import { capture4StateProof, launchProofBrowser } from "./lib/visualProofEngine.mjs";

const CONV_ID = "03924535-c9da-4a1c-83f3-fd16fc08e6c5";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

async function main() {
	console.log("[INQUISITION] Starting 4-State Visual Proof Capture for EGISZ REMD & MDLP...");
	const browser = await launchProofBrowser();

	try {
		// 1. EGISZ REMD Journal
		console.log("\n--- Capturing EGISZ REMD Journal 4-State Proofs ---");
		const egiszResults = await capture4StateProof({
			domain: "egisz",
			screenName: "egisz_remd_journal",
			baseUrl: "http://127.0.0.1:5173/?egisz=1&tab=journal",
			readySelector: ".egisz-modal-container, .egisz-modal-backdrop, .egisz-remd-shell",
			outputDir: path.resolve(process.cwd(), "docs/proofs/egisz"),
			brainDir: BRAIN_DIR,
			browser,
		});

		console.log(`✓ EGISZ REMD Journal: ${egiszResults.length} proofs verified.`);

		// 2. MDLP Chestny Znak Disposal
		console.log("\n--- Capturing MDLP Chestny Znak Disposal 4-State Proofs ---");
		const mdlpResults = await capture4StateProof({
			domain: "mdlp",
			screenName: "mdlp_disposal",
			baseUrl: "http://127.0.0.1:5173/?mdlp=1",
			readySelector: ".mdlp-scanning-overlay, [data-testid='mdlp-crpt-status-strip'], .mdlp-scanning-modal",
			outputDir: path.resolve(process.cwd(), "docs/proofs/mdlp"),
			brainDir: BRAIN_DIR,
			browser,
		});

		console.log(`✓ MDLP Chestny Znak Disposal: ${mdlpResults.length} proofs verified.`);

		console.log("\n=======================================================");
		console.log("✓ ALL EGISZ AND MDLP 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
		console.log("=======================================================");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
