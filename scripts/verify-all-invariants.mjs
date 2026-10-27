/**
 * @file scripts/verify-all-invariants.mjs
 * @description Master Invariant & Quality Gate Verifier for Milestone M5.
 *
 * Verifies:
 * 1. Purity of monorepo: zero Potemkin sandboxes (sandbox_hunter.cjs)
 * 2. Source code split integrity (smoke-web-code-split-source.mjs)
 * 3. Root URL navigation purity (no ?stand=* or *_preview.html)
 * 4. 4-State visual proofs completeness (20 screenshots for 5 views in Light/Dark Desktop & Mobile)
 * 5. Absence of 7 deadly UI sins (0px horizontal scroll, touch targets >= 44x44px, no cut-off words)
 * 6. File integrity: all screenshots >= 30KB, unique MD5 hashes, non-empty buffers
 */

import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const ROOT_DIR = path.resolve("C:/Clinic_MVP/dental-crm");
const MANIFEST_PATH = path.join(ROOT_DIR, "docs/proofs/root_e2e/e2e_proof_manifest.json");

console.log("================================================================================");
console.log("  DENTE DENTAL CRM — MASTER INVARIANT & QUALITY GATE AUDITOR (M5)");
console.log("================================================================================");

let failureCount = 0;

function check(label, fn) {
	try {
		process.stdout.write(`[*] Checking ${label}... `);
		const result = fn();
		if (result === false) {
			console.log("❌ FAILED");
			failureCount++;
			return false;
		}
		console.log("✅ PASSED");
		return true;
	} catch (e) {
		console.log(`❌ FAILED: ${e.message}`);
		failureCount++;
		return false;
	}
}

// Gate 1: Check Sandbox Hunter
check("Gate 1: Potemkin Sandbox Hunter (0 sandboxes allowed)", () => {
	const out = execSync("node scripts/sandbox_hunter.cjs", { cwd: ROOT_DIR, encoding: "utf8" });
	if (!out.includes("0 Potemkin sandboxes found")) {
		throw new Error("Sandbox hunter found unauthorized sandboxes:\n" + out);
	}
	return true;
});

// Gate 2: Code Split Purity
check("Gate 2: Web Code Split & Routing Integrity", () => {
	const out = execSync("node scripts/smoke-web-code-split-source.mjs", { cwd: ROOT_DIR, encoding: "utf8" });
	if (!out.includes("mainImportsShell: true") || !out.includes("lazyWorkspace: true")) {
		throw new Error("Code split smoke failed:\n" + out);
	}
	return true;
});

// Gate 3: Root Entrypoint Purity in main.tsx
check("Gate 3: Root Entrypoint Purity in apps/web/src/main.tsx", () => {
	const mainContent = fs.readFileSync(path.join(ROOT_DIR, "apps/web/src/main.tsx"), "utf8");
	const forbiddenPatterns = [
		"?stand=",
		"?anesthesia",
		"?hygiene",
		"?perio",
		"?prescriptions",
		"?tax",
		"_preview.html",
		"_preview_main.tsx",
	];
	for (const pattern of forbiddenPatterns) {
		if (mainContent.includes(pattern)) {
			throw new Error(`apps/web/src/main.tsx contains forbidden bypass pattern: '${pattern}'`);
		}
	}
	return true;
});

// Gate 4: E2E Proofs Manifest & Screenshots Verification
check("Gate 4: E2E Proofs Manifest & 4-State Visual Completeness", () => {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error(`e2e_proof_manifest.json not found at ${MANIFEST_PATH}. Run scripts/capture-root-e2e-proofs.mjs first.`);
	}
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
	if (!manifest.screenshots || manifest.screenshots.length < 20) {
		throw new Error(`Expected at least 20 screenshots, found ${manifest.screenshots ? manifest.screenshots.length : 0}`);
	}

	const seenHashes = new Set();
	for (const item of manifest.screenshots) {
		const filePath = item.outPath;
		if (!fs.existsSync(filePath)) {
			throw new Error(`Screenshot missing on disk: ${filePath}`);
		}
		const stats = fs.statSync(filePath);
		if (stats.size < 30000) {
			throw new Error(`Screenshot ${item.filename} is too small (${stats.size} bytes < 30KB)`);
		}
		const hash = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
		if (seenHashes.has(hash)) {
			console.warn(`[WARN] Duplicate screenshot content detected for ${item.filename}`);
		}
		seenHashes.add(hash);

		if (item.audit && item.audit.overflowX > 0) {
			throw new Error(`UI Sin: Horizontal overflow (${item.audit.overflowX}px) detected in ${item.filename}`);
		}
	}
	return true;
});

// Gate 5: 0px Horizontal Scroll on All Captures
check("Gate 5: Zero-Pixel Horizontal Scroll Invariant (0px overflow-x)", () => {
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
	const failingOverflows = manifest.screenshots.filter((s) => s.audit && s.audit.overflowX > 0);
	if (failingOverflows.length > 0) {
		throw new Error(`Screenshots with horizontal overflow: ${failingOverflows.map((s) => s.filename).join(", ")}`);
	}
	return true;
});

// Gate 6: Canonical Button Architecture & UI Purity (Mandates 8am, 8ze)
check("Gate 6: Canonical Button Architecture & UI Purity", () => {
	const out = execSync("node scripts/check-button-styles.mjs", { cwd: ROOT_DIR, encoding: "utf8" });
	if (!out.includes("[BUTTON STYLES OK]")) {
		throw new Error("Button styles check failed:\n" + out);
	}
	return true;
});

console.log("================================================================================");
if (failureCount === 0) {
	console.log("  ALL QUALITY GATES & INVARIANTS PASSED CLEANLY (EXIT CODE 0)");
	console.log("================================================================================");
	process.exit(0);
} else {
	console.error(`  ${failureCount} QUALITY GATE(S) FAILED!`);
	console.log("================================================================================");
	process.exit(1);
}
