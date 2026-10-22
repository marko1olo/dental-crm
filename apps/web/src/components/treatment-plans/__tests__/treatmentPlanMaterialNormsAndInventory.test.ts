/**
 * treatmentPlanMaterialNormsAndInventory.test.ts — нормы расхода материалов 804н и сопоставление со складом.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	type InventoryItemLookup,
	matchMaterialToInventoryItem,
	ORDER_804N_MATERIAL_NORMS_MAP,
} from "../treatmentPlanMaterialEngine";

describe("treatmentPlanMaterialEngine — Нормы 804н и складской маппинг", () => {
	test("Все нормы расхода материалов содержат корректные единицы измерения и цены", () => {
		const codes = Object.keys(ORDER_804N_MATERIAL_NORMS_MAP);
		assert.ok(codes.length >= 10);

		for (const code of codes) {
			const norms = ORDER_804N_MATERIAL_NORMS_MAP[code]!;
			assert.ok(norms.length > 0);
			for (const norm of norms) {
				assert.ok(norm.id.length > 0);
				assert.ok(norm.materialName.length > 0);
				assert.ok(norm.quantityPerProcedure > 0);
				assert.ok(["г", "мл", "шт.", "карп.", "компл.", "порц.", "упак.", "см"].includes(norm.unitOfMeasure));
				assert.ok(norm.defaultUnitCostRub > 0);
			}
		}
	});

	test("matchMaterialToInventoryItem находит точные и частичные совпадения со складом", () => {
		const mockInventory: InventoryItemLookup[] = [
			{ id: "inv-1", name: "Нанокомпозит светоотверждаемый Estelite Asteria Syringe", stockQuantity: 15, unitCostRub: "1350" },
			{ id: "inv-2", name: "Анестетик артикаиновый 4% Убистезин Форте", stockQuantity: 100, unitCostRub: "195" },
		];

		const matchExact = matchMaterialToInventoryItem("Нанокомпозит светоотверждаемый Estelite Asteria Syringe", mockInventory);
		assert.equal(matchExact?.id, "inv-1");

		const matchKeyword = matchMaterialToInventoryItem("Нанокомпозит светоотверждаемый (Estelite Asteria / Filtek)", mockInventory);
		assert.equal(matchKeyword?.id, "inv-1");

		const noMatch = matchMaterialToInventoryItem("Неизвестный материал XYZ", mockInventory);
		assert.equal(noMatch, undefined);
	});

	test("Нормы расхода ТМЦ для эндодонтии пропорциональны числу каналов", () => {
		for (let canals = 1; canals <= 4; canals++) {
			const prepCode = `A16.07.030.00${canals}`;
			const prepNorms = ORDER_804N_MATERIAL_NORMS_MAP[prepCode]!;
			assert.ok(prepNorms.length >= 3);
			const paperPoints = prepNorms.find((n) => n.materialName.includes("бумажные"));
			assert.equal(paperPoints?.quantityPerProcedure, canals * 3);

			const obtCode = `A16.07.008.00${canals}`;
			const obtNorms = ORDER_804N_MATERIAL_NORMS_MAP[obtCode]!;
			const gutta = obtNorms.find((n) => n.materialName.includes("Гуттаперчевые"));
			assert.equal(gutta?.quantityPerProcedure, canals);
		}

		assert.ok(ORDER_804N_MATERIAL_NORMS_MAP["A16.07.091"]?.some((n) => n.materialName.includes("UltraCal")));
		assert.ok(ORDER_804N_MATERIAL_NORMS_MAP["A16.07.082"]?.some((n) => n.materialName.includes("D-Solv") || n.materialName.includes("Эндосольв")));
	});
});
