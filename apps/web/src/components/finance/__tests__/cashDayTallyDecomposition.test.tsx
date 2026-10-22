import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("CashDayTally Mandate 8b Decomposition Invariants", () => {
	const files = [
		"apps/web/src/components/finance/CashDayTally.tsx",
		"apps/web/src/components/finance/cashDayTally/CashDayTallyActionsBar.tsx",
		"apps/web/src/components/finance/cashDayTally/CashDayTallyChannelsGrid.tsx",
		"apps/web/src/components/finance/cashDayTally/CashDayTallyModalZReport.tsx",
		"apps/web/src/components/finance/cashDayTally/CashDayTallyPaymentList.tsx",
		"apps/web/src/components/finance/cashDayTally/cashDayTallyStatements.ts",
		"apps/web/src/components/finance/cashDayTally/CashDayTallyZReportReceipt.tsx",
		"apps/web/src/components/finance/cashDayTally/useCashDayTallyExports.ts",
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
