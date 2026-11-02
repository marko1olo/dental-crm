import { after, before, describe } from "node:test";
import { registerFiscalAndTaxCases } from "./fiscalAndTaxCases.test.js";
import { registerInventoryAndPayoutCases } from "./inventoryAndPayoutCases.test.js";
import { registerSberbankAndScheduleCases } from "./sberbankAndScheduleCases.test.js";
import { createTier2Fixture } from "./tier2Fixture.js";

export function runTier2Suite(): void {
	describe("Tier 2: Boundary & Corner Cases (Stress & Edge-Condition Testing)", () => {
		const { ctx, setup, teardown } = createTier2Fixture();

		before(async () => {
			await setup();
		});

		after(async () => {
			await teardown();
		});

		registerFiscalAndTaxCases();
		registerSberbankAndScheduleCases(ctx);
		registerInventoryAndPayoutCases(ctx);
	});
}

runTier2Suite();
