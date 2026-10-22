import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type CompletedClinicalService,
	aggregateWriteoffFromServices,
} from "../writeoff/clinicalWriteoffEngine.js";
import {
	DENTAL_CABINET_STOCK_PRESETS,
	getProcedureCatalogServiceNorm,
	getOrder804nServiceNorm,
} from "../writeoff/clinicalWriteoffPresets.js";

describe("Clinical Procedure Service Norms & BOM Specifications", () => {
	it("Спецификация A16.07.002.001 (пломбирование зуба) включает полный комплект", () => {
		const cariesNorm = getProcedureCatalogServiceNorm("A16.07.002.001");
		assert.ok(cariesNorm);

		const materialIds = cariesNorm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_articaine_ultracain"));
		assert.ok(materialIds.includes("mat_dental_needle_30g"));
		assert.ok(materialIds.includes("mat_cofferdam_sheet"));
		assert.ok(materialIds.includes("mat_matrix_sectional_system"));
		assert.ok(materialIds.includes("mat_dental_burs_set"));
		assert.ok(materialIds.includes("mat_filtek_ultimate"));
		assert.ok(materialIds.includes("mat_single_bond_universal"));
		assert.ok(materialIds.includes("mat_phosphoric_acid_37"));
	});

	it("Спецификация A16.07.030.001 (Инфильтрационная анестезия) включает артикаин, иглу 30G и гель", () => {
		const anesNorm = getOrder804nServiceNorm("A16.07.030.001");
		assert.ok(anesNorm);

		const materialIds = anesNorm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_articaine_ultracain"));
		assert.ok(materialIds.includes("mat_dental_needle_30g"));
		assert.ok(materialIds.includes("mat_topical_anesthesia_gel"));
		assert.ok(materialIds.includes("mat_cotton_rolls"));
	});

	it("Спецификация A16.07.055 (Синус-лифтинг и НКР) включает Bio-Oss, Bio-Gide, Prolene 5-0 и артикаин Форте", () => {
		const gbrNorm = getOrder804nServiceNorm("A16.07.055");
		assert.ok(gbrNorm);

		const materialIds = gbrNorm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_bio_oss_graft"));
		assert.ok(materialIds.includes("mat_bio_gide_membrane"));
		assert.ok(materialIds.includes("mat_prolene_50"));
		assert.ok(materialIds.includes("mat_articaine_ultracain"));
		assert.ok(materialIds.includes("mat_surg_blade_15"));
	});

	it("aggregateWriteoffFromServices формирует точные строки списания со склада кабинета", () => {
		const completedServices: CompletedClinicalService[] = [
			{ serviceCode: "A16.07.002.001", toothNumber: 26, serviceTitle: "Лечение кариеса", quantityMultiplier: 1 },
			{ serviceCode: "A16.07.030.001", toothNumber: 26, serviceTitle: "Анестезия", quantityMultiplier: 1 },
		];

		const lines = aggregateWriteoffFromServices(
			completedServices,
			DENTAL_CABINET_STOCK_PRESETS,
			"cab_01_therapy",
			"2026-08-22",
		);

		assert.ok(lines.length >= 8);
		assert.ok(lines.some((l) => l.nameRu.includes("Ультракаин")));
		assert.ok(lines.some((l) => l.nameRu.includes("коффердам")));
		assert.ok(lines.some((l) => l.nameRu.includes("матричн")));
		assert.ok(lines.some((l) => l.nameRu.includes("Бор алмазный")));
		assert.ok(lines.some((l) => l.nameRu.includes("Filtek")));

		for (const line of lines) {
			assert.equal(line.toothNumber, 26);
			assert.ok(line.serviceCode === "A16.07.002.001" || line.serviceCode === "A16.07.030.001");
			assert.ok(line.standardQuantity > 0);
			assert.ok(line.unitCostKopecks > 0);
		}
	});
});
