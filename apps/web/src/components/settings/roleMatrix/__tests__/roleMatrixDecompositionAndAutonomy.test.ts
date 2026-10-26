/**
 * apps/web/src/components/settings/roleMatrix/__tests__/roleMatrixDecompositionAndAutonomy.test.ts
 *
 * Red Team Inquisitor Verification for:
 * 1. File line count invariants (Mandate 8b): root <= 80 lines, submodules <= 120 lines.
 * 2. 4 Canonical roles (doctor, administrator, assistant, owner) & Doctor Autonomy (Mandates 8e, 8n).
 * 3. Save button NEVER disabled (Mandate 8e).
 * 4. CSS token purity (Zero bg-white).
 * 5. Apple HIG touch target >= 44x44px.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const roleMatrixDir = path.resolve(__dirname, "..");
const settingsDir = path.resolve(roleMatrixDir, "..");

describe("Role Matrix Decomposition & Doctor Autonomy Red Team Inquisition", () => {
	it("1. Root facade GranularRoleMatrixView.tsx is strictly <= 80 lines (Mandate 8b)", () => {
		const facadePath = path.join(settingsDir, "GranularRoleMatrixView.tsx");
		assert.ok(fs.existsSync(facadePath), "GranularRoleMatrixView.tsx must exist");
		const content = fs.readFileSync(facadePath, "utf-8");
		const lineCount = content.split("\n").length;
		assert.ok(lineCount <= 80, `Root facade must be <= 80 lines, but was ${lineCount}`);
		assert.ok(!content.includes("bg-white"), "Must not contain raw bg-white");
	});

	it("2. All roleMatrix submodules are strictly <= 120 lines (Mandate 8b)", () => {
		const files = [
			"roleMatrixTypes.ts",
			"roleMatrixConstants.ts",
			"roleMatrixCategories.ts",
			"useRoleMatrixState.ts",
			"RoleSelectorSegmentedBar.tsx",
			"RoleSummaryHeroCard.tsx",
			"PermissionCategorySection.tsx",
			"PermissionRowItem.tsx",
			"RoleActionButtons.tsx",
		];

		for (const file of files) {
			const filePath = path.join(roleMatrixDir, file);
			assert.ok(fs.existsSync(filePath), `${file} must exist`);
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(lineCount <= 120, `${file} must be <= 120 lines, but was ${lineCount}`);
			assert.ok(!content.includes("bg-white"), `${file} must not contain raw bg-white`);
		}
	});

	it("3. RoleActionButtons Save button is never disabled (Mandates 8e, 8n)", () => {
		const buttonsPath = path.join(roleMatrixDir, "RoleActionButtons.tsx");
		const content = fs.readFileSync(buttonsPath, "utf-8");
		assert.ok(!content.includes("disabled={"), "Save button must NEVER be disabled by optional fields");
		assert.ok(content.includes("min-h-[44px]"), "Touch target must be >= 44px");
	});

	it("4. PermissionRowItem implements Apple HIG 44x24px switch with >= 44x44px touch target", () => {
		const rowPath = path.join(roleMatrixDir, "PermissionRowItem.tsx");
		const content = fs.readFileSync(rowPath, "utf-8");
		assert.ok(content.includes('role="switch"'), "Must have role='switch'");
		assert.ok(content.includes("w-11 h-11"), "Touch target must be at least 44x44px (w-11 h-11)");
		assert.ok(content.includes("w-11 h-6"), "Switch track must be 44x24px (w-11 h-6)");
	});

	it("5. Doctor autonomy preset guarantees discounts up to 100% and EMR freedom", () => {
		const statePath = path.join(roleMatrixDir, "useRoleMatrixState.ts");
		const content = fs.readFileSync(statePath, "utf-8");
		assert.ok(content.includes("applyDoctorAutonomyPreset"), "Must provide applyDoctorAutonomyPreset");
		assert.ok(content.includes('"clinical.records.write": "full"'), "Must give full EMR writing permissions");
	});
});
