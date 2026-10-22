import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { calculateAutoVisitConsumables } from "@dental/shared";

describe("1. Auto-BOM Deduction for A16.07.002 (Default Catalog)", () => {
	it("дефолтный каталог сопоставляет код кариеса A16.07.002 с композитом 0.2г и адгезивом", () => {
		const defaultConsumables = calculateAutoVisitConsumables(
			[
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой",
					quantity: 1,
					toothNumber: 46,
				},
			],
			{ includeStandardPpe: false },
		);

		const comp = defaultConsumables.find((c) => c.itemName.includes("нанокомпозит"));
		assert.ok(comp);
		assert.equal(comp.requiredQuantity, 0.2);

		const adh = defaultConsumables.find((c) => c.itemName.includes("Адгезивная система"));
		assert.ok(adh);
		assert.equal(adh.requiredQuantity, 1);
	});
});
