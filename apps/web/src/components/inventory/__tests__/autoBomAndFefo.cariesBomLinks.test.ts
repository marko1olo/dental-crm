import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { calculateAutoVisitConsumables } from "@dental/shared";

describe("1. Auto-BOM Deduction for A16.07.002 (Custom Links)", () => {
	it("техкарта лечения кариеса A16.07.002 включает композит 0.2г, адгезив, матрицу, чашку и микробраш", () => {
		const fullCariesBomLinks = [
			{
				id: "cust-link-caries-composite",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой (кариес)",
				inventoryItemId: "mat-composite-filtek",
				itemName: "Светоотверждаемый нанокомпозит (Filtek Z250 / Estelite)",
				category: "composite" as const,
				unit: "шприц_гр" as const,
				quantityPerService: 0.2,
				isMandatory: true,
				costPriceKopecks: 38000,
			},
			{
				id: "cust-link-caries-adhesive",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой (кариес)",
				inventoryItemId: "mat-adhesive-single",
				itemName: "Адгезивная система самопротравливающая (7 пок., бонд)",
				category: "composite" as const,
				unit: "dose" as const,
				quantityPerService: 1,
				isMandatory: true,
				costPriceKopecks: 12000,
			},
			{
				id: "cust-link-caries-matrix",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой (кариес)",
				inventoryItemId: "mat-matrix-sectional",
				itemName: "Секционная матрица контурная металлизированная",
				category: "composite" as const,
				unit: "шт" as const,
				quantityPerService: 1,
				isMandatory: true,
				costPriceKopecks: 4500,
			},
			{
				id: "cust-link-caries-polishing",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой (кариес)",
				inventoryItemId: "mat-polishing-cup",
				itemName: "Полировочная головка / чашка силиконовая финишная",
				category: "composite" as const,
				unit: "шт" as const,
				quantityPerService: 1,
				isMandatory: true,
				costPriceKopecks: 6500,
			},
			{
				id: "cust-link-caries-microbrush",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой (кариес)",
				inventoryItemId: "mat-microbrush",
				itemName: "Микробраш аппликатор стоматологический",
				category: "other" as const,
				unit: "шт" as const,
				quantityPerService: 2,
				isMandatory: true,
				costPriceKopecks: 1200,
			},
		];

		const consumables = calculateAutoVisitConsumables(
			[
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					quantity: 1,
					toothNumber: 36,
				},
			],
			{ includeStandardPpe: false, customLinks: fullCariesBomLinks },
		);

		const composite = consumables.find((c) => c.itemName.toLowerCase().includes("композит"));
		assert.ok(composite);
		assert.equal(composite.requiredQuantity, 0.2);

		const adhesive = consumables.find(
			(c) => c.itemName.toLowerCase().includes("адгезив") || c.itemName.toLowerCase().includes("бонд"),
		);
		assert.ok(adhesive);

		const matrix = consumables.find((c) => c.itemName.toLowerCase().includes("матриц"));
		assert.ok(matrix);
		assert.equal(matrix.requiredQuantity, 1);

		const polishing = consumables.find(
			(c) =>
				c.itemName.toLowerCase().includes("полиров") ||
				c.itemName.toLowerCase().includes("чашка") ||
				c.itemName.toLowerCase().includes("головк"),
		);
		assert.ok(polishing);
		assert.equal(polishing.requiredQuantity, 1);

		const microbrush = consumables.find(
			(c) => c.itemName.toLowerCase().includes("микробраш") || c.itemName.toLowerCase().includes("аппликатор"),
		);
		assert.ok(microbrush);
		assert.equal(microbrush.requiredQuantity, 2);
	});
});
