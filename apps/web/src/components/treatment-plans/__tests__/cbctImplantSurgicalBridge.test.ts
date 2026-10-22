/**
 * cbctImplantSurgicalBridge.test.ts — тестирование формирования хирургического пакета имплантации по КЛКТ.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	buildImplantSurgicalPackageItems,
	type CbctImplantFinding,
} from "../ctImplantIntegrationBridge";

describe("cbctAutoPlanIntegrationBridge — 1. Хирургический пакет имплантации", () => {
	test("позиционирование виртуального имплантата на КЛКТ формирует полный хирургический комплекс", () => {
		const implantFinding: CbctImplantFinding = {
			toothFdi: 46,
			brand: "dentium",
			diameterMm: 4.5,
			lengthMm: 10.0,
			angulationDeg: 1.5,
			ridgeHeightMm: 12.8,
			ridgeWidthMm: 7.6,
			meanHU: 720,
			mischClass: "D2",
			nerveClearanceMm: 4.8,
			recommendedTorqueNcm: "35-45 Н·см",
			drillingProtocol: "Пилот 2.0 -> Сверло 3.4 -> Формирующее 4.0",
		};

		const items = buildImplantSurgicalPackageItems(implantFinding, "standard");
		assert.equal(items.length, 4);

		const codes = items.map((it) => it.code804n);
		assert.ok(codes.includes("A16.07.054.001"), "Должен содержать код имплантации A16.07.054.001");
		assert.ok(codes.includes("A16.07.054.002"), "Должен содержать формирователь десны A16.07.054.002");
		assert.ok(codes.includes("A11.07.012"), "Должен содержать местную анестезию A11.07.012");
		assert.ok(codes.includes("A16.07.097"), "Должен содержать наложение швов A16.07.097");

		for (const item of items) {
			assert.equal(item.toothNumber, 46);
		}

		const implantItem = items.find((it) => it.code804n === "A16.07.054.001")!;
		assert.ok(implantItem.clinicalRationale?.includes("D2"));
		assert.ok(implantItem.clinicalRationale?.includes("720 HU"));
		assert.ok(implantItem.clinicalRationale?.includes("4.8 мм"));
		assert.ok(implantItem.materials?.toLowerCase().includes("dentium"));
	});

	test("предупреждает в обосновании при критическом зазоре до нижнечелюстного канала (< 2.0 мм)", () => {
		const implantFinding: CbctImplantFinding = {
			toothFdi: 37,
			brand: "osstem",
			diameterMm: 4.5,
			lengthMm: 10.0,
			ridgeHeightMm: 10.5,
			ridgeWidthMm: 6.8,
			meanHU: 650,
			mischClass: "D3",
			nerveClearanceMm: 1.4,
		};

		const items = buildImplantSurgicalPackageItems(implantFinding, "standard");
		const implantItem = items.find((it) => it.code804n === "A16.07.054.001")!;
		assert.ok(
			implantItem.clinicalRationale?.includes("ВНИМАНИЕ: зазор до нижнечелюстного нерва"),
			"Должно содержать предупреждение о критической близости к нерву",
		);
	});

	test("дифференцирует бренды имплантатов по сценариям (Эконом: Osstem, Оптимум: Dentium, Премиум: Straumann)", () => {
		const finding: CbctImplantFinding = { toothFdi: 15 };
		const econItems = buildImplantSurgicalPackageItems(finding, "economy");
		const optItems = buildImplantSurgicalPackageItems(finding, "standard");
		const premItems = buildImplantSurgicalPackageItems(finding, "optimum");

		const econImplant = econItems.find((it) => it.code804n === "A16.07.054.001")!;
		const optImplant = optItems.find((it) => it.code804n === "A16.07.054.001")!;
		const premImplant = premItems.find((it) => it.code804n === "A16.07.054.001")!;

		assert.ok(econImplant.name.toLowerCase().includes("osstem"));
		assert.ok(optImplant.name.toLowerCase().includes("dentium"));
		assert.ok(premImplant.name.toLowerCase().includes("straumann"));

		assert.ok(econImplant.priceRub < optImplant.priceRub);
		assert.ok(optImplant.priceRub < premImplant.priceRub);
	});
});
