import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("OfflineFiscalBatchModal Mandate 8b Decomposition Invariants", () => {
	const files = [
		"apps/web/src/components/finance/fiscal/OfflineFiscalBatchModal.tsx",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/OfflineFiscalBatchQueueTab.tsx",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/OfflineFiscalBatchReconciliationTab.tsx",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/OfflineFiscalBatchShiftsTab.tsx",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/offlineFiscalBatchStatements.ts",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/OfflineFiscalBatchSummaryBar.tsx",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/offlineFiscalBatchTypes.ts",
		"apps/web/src/components/finance/fiscal/offlineFiscalBatch/useOfflineFiscalBatchState.ts",
	];

	it("guarantees every decomposed file is strictly <= 120 lines", () => {
		for (const relativePath of files) {
			const fullPath = fs.existsSync(path.resolve(process.cwd(), relativePath))
				? path.resolve(process.cwd(), relativePath)
				: path.resolve(process.cwd(), relativePath.replace(/^apps\/web\//, ""));
			expect(fs.existsSync(fullPath)).toBe(true);
			const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			expect(lineCount).toBeLessThanOrEqual(120);
		}
	});
});
