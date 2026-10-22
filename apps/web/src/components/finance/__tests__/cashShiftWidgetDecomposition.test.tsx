import { describe, expect, it } from "vitest";
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
	];

	it("guarantees every decomposed file is strictly <= 120 lines", () => {
		for (const relativePath of files) {
			const fullPath = path.resolve(process.cwd(), relativePath);
			expect(fs.existsSync(fullPath)).toBe(true);
			const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			expect(lineCount).toBeLessThanOrEqual(120);
		}
	});
});
