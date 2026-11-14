import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("FamilyCombinedBillingModal Mandate 8b Decomposition Invariants", () => {
	it("verifies legacy duplicate FamilyCombinedBillingModal is decommissioned in favor of CashRegisterStudioModal SSOT", () => {
		const legacyModalPath = path.resolve(process.cwd(), "apps/web/src/components/finance/FamilyCombinedBillingModal.tsx");
		expect(fs.existsSync(legacyModalPath)).toBe(false);
	});
});
