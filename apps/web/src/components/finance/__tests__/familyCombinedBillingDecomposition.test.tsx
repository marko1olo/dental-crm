import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("FamilyCombinedBillingModal Mandate 8b Decomposition Invariants", () => {
	const files = [
		"apps/web/src/components/finance/FamilyCombinedBillingModal.tsx",
		"apps/web/src/components/finance/familyCombinedBilling/FamilyCombinedBillingFooter.tsx",
		"apps/web/src/components/finance/familyCombinedBilling/FamilyCombinedBillingHeader.tsx",
		"apps/web/src/components/finance/familyCombinedBilling/FamilyCombinedBillingItemsTab.tsx",
		"apps/web/src/components/finance/familyCombinedBilling/FamilyCombinedBillingTaxTab.tsx",
		"apps/web/src/components/finance/familyCombinedBilling/useFamilyCombinedBillingState.ts",
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
