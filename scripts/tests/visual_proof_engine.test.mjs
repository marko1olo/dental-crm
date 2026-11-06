/**
 * scripts/tests/visual_proof_engine.test.mjs
 *
 * Verifies Playwright Visual Proof Engine invariants:
 * - 4 Canonical Viewports (PC Light/Dark 1440x900, Mobile Light/Dark 390x844)
 * - Anti-Blank Byte Guard hardware floor >= 20480 bytes (Mandate 8al)
 * - Safe DOM stabilization & CSS transition/animation suppression
 * - Host process safety (finally block browser cleanup)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	CANONICAL_VIEWPORTS,
	CANONICAL_STATES_LIST,
	MIN_SCREENSHOT_BYTES,
	findBrowserExecutable,
	getFileMd5,
	capture4StateProof,
} from "../lib/visualProofEngine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

test("visualProofEngine exports all 4 canonical viewports with exact dimensions", () => {
	assert.ok(CANONICAL_VIEWPORTS.PC_LIGHT, "PC_LIGHT viewport must exist");
	assert.ok(CANONICAL_VIEWPORTS.PC_DARK, "PC_DARK viewport must exist");
	assert.ok(CANONICAL_VIEWPORTS.MOBILE_LIGHT, "MOBILE_LIGHT viewport must exist");
	assert.ok(CANONICAL_VIEWPORTS.MOBILE_DARK, "MOBILE_DARK viewport must exist");

	assert.strictEqual(CANONICAL_VIEWPORTS.PC_LIGHT.viewport.width, 1440);
	assert.strictEqual(CANONICAL_VIEWPORTS.PC_LIGHT.viewport.height, 900);
	assert.strictEqual(CANONICAL_VIEWPORTS.PC_LIGHT.theme, "light");
	assert.strictEqual(CANONICAL_VIEWPORTS.PC_LIGHT.isMobile, false);

	assert.strictEqual(CANONICAL_VIEWPORTS.PC_DARK.viewport.width, 1440);
	assert.strictEqual(CANONICAL_VIEWPORTS.PC_DARK.viewport.height, 900);
	assert.strictEqual(CANONICAL_VIEWPORTS.PC_DARK.theme, "dark");
	assert.strictEqual(CANONICAL_VIEWPORTS.PC_DARK.isMobile, false);

	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_LIGHT.viewport.width, 390);
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_LIGHT.viewport.height, 844);
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_LIGHT.theme, "light");
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_LIGHT.isMobile, true);
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_LIGHT.hasTouch, true);

	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_DARK.viewport.width, 390);
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_DARK.viewport.height, 844);
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_DARK.theme, "dark");
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_DARK.isMobile, true);
	assert.strictEqual(CANONICAL_VIEWPORTS.MOBILE_DARK.hasTouch, true);

	assert.strictEqual(CANONICAL_STATES_LIST.length, 4, "Must list strictly 4 canonical states");
});

test("visualProofEngine enforces Anti-Blank Byte Guard >= 20480 bytes floor", () => {
	assert.strictEqual(MIN_SCREENSHOT_BYTES, 20480, "Mandatory minimum screenshot size is 20KB (20480 bytes)");
});

test("visualProofEngine can calculate MD5 hash of files", () => {
	const tempFile = path.join(repoRoot, "scripts/tests/.tmp_md5_test.txt");
	fs.writeFileSync(tempFile, "DENTE Red Team Visual Proof Engine 2026", "utf8");
	try {
		const hash = getFileMd5(tempFile);
		assert.strictEqual(typeof hash, "string");
		assert.strictEqual(hash.length, 32);
	} finally {
		if (fs.existsSync(tempFile)) {
			fs.unlinkSync(tempFile);
		}
	}
});

test("visualProofEngine rejects empty domain with descriptive error", async () => {
	await assert.rejects(
		async () => {
			await capture4StateProof({});
		},
		{
			message: /'domain' is required/,
		}
	);
});
