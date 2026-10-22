/**
 * treatmentPlanBundlesPricingAndItems.test.ts — расчет цен и формирование позиций пакетов.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks } from "@dental/shared";
import {
	calculateBundlePrice,
	createBundlePlanItems,
	getClinicalBundleById,
	type ClinicalBundleId,
} from "../treatmentPlanBundlesEngine";

describe("treatmentPlanBundlesEngine — Расчет цен и создание позиций", () => {
	test("при полном составе цена равна базовой стоимости пакета", () => {
		const breakdown = calculateBundlePrice("caries_turnkey");
		assert.equal(breakdown.totalRub, 7500);
		assert.equal(breakdown.totalKopecks, parseKopecks(7500));
		assert.equal(breakdown.savingsRub, 0);
		assert.equal(breakdown.isFullySelected, true);
		assert.equal(breakdown.selectedItems.length, 4);
		assert.equal(breakdown.excludedItems.length, 0);
	});

	test("при исключении опциональной анестезии цена уменьшается на 900 руб.", () => {
		const breakdown = calculateBundlePrice("caries_turnkey", ["rubberdam", "restoration", "polishing"]);
		assert.equal(breakdown.totalRub, 6600);
		assert.equal(breakdown.totalKopecks, parseKopecks(6600));
		assert.equal(breakdown.savingsRub, 900);
		assert.equal(breakdown.savingsKopecks, parseKopecks(900));
		assert.equal(breakdown.isFullySelected, false);
		assert.equal(breakdown.selectedItems.length, 3);
		assert.equal(breakdown.excludedItems.length, 1);
		assert.equal(breakdown.excludedItems[0]?.id, "anesthesia");
	});

	test("создает массив TreatmentPlanItem с префиксом зуба для зубозависимых пакетов", () => {
		const items = createBundlePlanItems("caries_turnkey", 26);
		assert.equal(items.length, 4);
		for (const it of items) {
			assert.equal(it.toothNumber, 26);
			assert.ok(it.name.startsWith("[Зуб 26] "));
			assert.equal(it.isDraft, false);
			assert.equal(it.quantity, 1);
			assert.equal(it.priceRub, it.unitPriceRub);
		}
	});

	test("поддерживает объект параметров с фильтрацией позиций и кастомными ценами", () => {
		const items = createBundlePlanItems("complex_extraction", {
			toothNumber: 48,
			selectedItemIds: ["root_separation", "deep_curettage", "vicryl_suturing"],
			customPriceMap: { vicryl_suturing: 1500 },
		});
		assert.equal(items.length, 3);
		const sutureItem = items.find((it) => it.code804n === "A16.07.097");
		assert.equal(sutureItem?.priceRub, 1500);
		assert.equal(sutureItem?.toothNumber, 48);
	});

	test("использует defaultTooth, если номер зуба не передан для зубозависимого пакета", () => {
		const bundle = getClinicalBundleById("implant_turnkey")!;
		const items = createBundlePlanItems("implant_turnkey");
		assert.equal(items.length, bundle.items.length);
		for (const it of items) {
			assert.equal(it.toothNumber, bundle.defaultTooth);
		}
	});

	test("для профгигиены и слепков номер зуба не добавляется", () => {
		const itemsHyg = createBundlePlanItems("hygiene_turnkey");
		assert.equal(itemsHyg.length, 4);
		assert.equal(itemsHyg[0]?.toothNumber, undefined);

		const itemsImp = createBundlePlanItems("impression_asilicone_2jaws");
		assert.equal(itemsImp.length, 4);
		assert.equal(itemsImp[0]?.toothNumber, undefined);
	});

	test("выбрасывает ошибку при запросе несуществующего пакета", () => {
		assert.throws(() => {
			createBundlePlanItems("non_existing_bundle" as ClinicalBundleId);
		}, /Неизвестный пакет/);
	});
});
