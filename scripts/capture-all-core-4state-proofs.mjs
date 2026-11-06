/**
 * scripts/capture_all_core_4state_proofs.mjs
 *
 * DENTE Dental CRM — Canonical Master Runner for 4-State Proofs Across Core Domains
 * Mandate 8al (4-State Proof: PC Light/Dark 1440x900, Mobile Light/Dark 390x844),
 * Mandate 8d (Zero 7 Deadly Sins), Mandate 26 (Host Process Safety & finally { await browser.close() }),
 * Rule 23 (Live Application Root Navigation: http://127.0.0.1:5173/?demo=true).
 *
 * Captured Domains:
 * 1. Schedule (Расписание и таймлайн)
 * 2. Visit (Визит врача у кресла, протокол SOAP)
 * 3. Odontogram (Интерактивная зубная формула FDI)
 * 4. Finance (Касса, счета и 54-ФЗ чекаут)
 * 5. Warehouse (Склад, остатки и партии)
 */

import path from "node:path";
import { runVisualProofSuite } from "./lib/visualProofEngine.mjs";

const CONV_ID = process.env.CONV_ID || "5ad0cd63-d865-49c8-aeb6-6721712598a2";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

const CORE_DOMAINS_SUITE = [
	{
		domain: "schedule",
		screenName: "schedule",
		hashRoute: "#schedule",
		brainDir: BRAIN_DIR,
	},
	{
		domain: "visit",
		screenName: "visit",
		hashRoute: "#visit",
		brainDir: BRAIN_DIR,
	},
	{
		domain: "odontogram",
		screenName: "odontogram",
		hashRoute: "#odontogram",
		brainDir: BRAIN_DIR,
	},
	{
		domain: "finance",
		screenName: "finance",
		hashRoute: "#finance",
		brainDir: BRAIN_DIR,
	},
	{
		domain: "warehouse",
		screenName: "warehouse",
		hashRoute: "#warehouse",
		brainDir: BRAIN_DIR,
	},
];

async function main() {
	console.log(`[MASTER RUNNER] Executing Canonical 4-State Proof Engine for ${CORE_DOMAINS_SUITE.length} Core Domains...`);
	const startTime = Date.now();

	const suiteResults = await runVisualProofSuite(CORE_DOMAINS_SUITE);

	const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n======================================================`);
	console.log(`✓ MASTER 4-STATE PROOF RUN COMPLETED IN ${elapsedSec}s!`);
	console.log(`======================================================`);

	let totalProofs = 0;
	for (const [domain, proofs] of Object.entries(suiteResults)) {
		console.log(`\n• Domain [${domain.toUpperCase()}]:`);
		for (const p of proofs) {
			console.log(`   - ${p.state.padEnd(12)}: ${p.filename} (${p.sizeKb} KB, MD5: ${p.md5.slice(0, 8)})`);
			totalProofs++;
		}
	}
	console.log(`\nTotal verified 4-state screenshots: ${totalProofs}`);
}

main().catch((err) => {
	console.error("[MASTER RUNNER FATAL ERROR]:", err);
	process.exit(1);
});
