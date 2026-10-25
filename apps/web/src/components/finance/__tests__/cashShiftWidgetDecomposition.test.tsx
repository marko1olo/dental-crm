import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("CashShiftWidget Mandate 8b Decomposition Invariants", () => {
	const files = [
		"apps/web/src/components/finance/CashShiftWidget.tsx",
		"apps/web/src/components/finance/cashShiftWidget/CashShiftActionsBar.tsx",
		"apps/web/src/components/finance/cashShiftWidget/CashShiftHeader.tsx",
		"apps/web/src/components/finance/cashShiftWidget/CashShiftMetricsGrid.tsx",
		"apps/web/src/components/finance/cashShiftWidget/CashShiftModals.tsx",
		"apps/web/src/components/finance/cashShiftWidget/CashShiftOfflineBanner.tsx",
		"apps/web/src/components/finance/cashShiftWidget/useCashShiftCalculations.ts",
		"apps/web/src/components/finance/cashShiftWidget/useCashShiftState.ts",
		"apps/web/src/components/finance/cashShiftWidget/cashShiftService.ts",
	];

	it("guarantees every decomposed file is strictly <= 120 lines", () => {
		for (const relativePath of files) {
			const fullPath = fs.existsSync(path.resolve(process.cwd(), relativePath))
				? path.resolve(process.cwd(), relativePath)
				: path.resolve(process.cwd(), relativePath.replace(/^apps\/web\//, ""));
			assert.ok(fs.existsSync(fullPath), `File must exist: ${fullPath}`);
			const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lineCount <= 120,
				`File ${relativePath} exceeds 120 lines (currently ${lineCount})`,
			);
		}
	});
});
