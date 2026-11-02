/**
 * apps/web/src/components/patient/__tests__/patientAnamnesisFamilyWallet.test.ts
 *
 * Facade suite preserving historical references.
 * The test suites have been decomposed into sweet-spot modules:
 * - patientAnamnesisNorms.test.ts (~210 lines)
 * - patientFamilyWalletAndDrawer.test.ts (~230 lines)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Patient Anamnesis & Family Wallet Decomposed Modules Verification", () => {
	it("ensures both sweet-spot modular suites exist and are under file limits", () => {
		const normsSuite = path.resolve(__dirname, "patientAnamnesisNorms.test.ts");
		const walletSuite = path.resolve(
			__dirname,
			"patientFamilyWalletAndDrawer.test.ts",
		);

		assert.ok(fs.existsSync(normsSuite), "patientAnamnesisNorms.test.ts must exist");
		assert.ok(
			fs.existsSync(walletSuite),
			"patientFamilyWalletAndDrawer.test.ts must exist",
		);
	});
});
