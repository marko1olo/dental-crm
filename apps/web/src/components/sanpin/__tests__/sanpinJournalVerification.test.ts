import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	SANPIN_REGULATORY_AUTHORITIES,
} from "@dental/shared";
import {
	SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET,
	SANPIN_AUTOCLAVE_PRION_134_PRESET,
	SANPIN_AUTOCLAVE_DELICATE_121_PRESET,
	SANPIN_DRY_HEAT_180_60_PRESET,
	SANPIN_DRY_HEAT_160_150_PRESET,
	STATUTORY_KRAFT_SIZES,
	STATUTORY_CHEMICAL_INDICATOR_OPTIONS,
	formatPsoAzopyramResult,
	formatPsoPhenolphthaleinResult,
	calculatePsoSamplingCount,
	createQuickUniversalCycle,
	createQuickPrionCycle,
	createQuickDelicateCycle,
	createQuickDryHeat180Cycle,
	createQuickDryHeat160Cycle,
	createQuickCombinedPsoRecord,
} from "../../sterilization/sterilizationPresets";
import {
	SANPIN_WASTE_PACKAGING_TYPES,
	SANPIN_MEDICAL_WASTE_CLASSES,
} from "../waste/medicalWastePresets";
import {
	calculateWasteWeights,
	generateWasteSealNumber,
	generateWasteBarcode,
	createQuickClassBWasteRecord,
	createQuickClassGWasteRecord,
} from "../waste/medicalWasteEngine";

describe("SanPiN 3.3686-21 & 2.1.3684-21 Harmonization Verification", () => {
	describe("1. Sterilization Log (Form 257/у) — Class B Autoclave Regimes", () => {
		it("verifies Universal 134°C / 2.1 bar / 5 min regime parameters", () => {
			const preset = SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;
			assert.equal(preset.temperatureC, 134);
			assert.equal(preset.pressureBar, 2.1);
			assert.equal(preset.exposureMinutes, 5);
			assert.equal(preset.sterilizerType, "autoclave_class_b");
			assert.ok(preset.programName?.includes("Универсальная 134°C / 2.1 бар / 5 мин"));
			assert.equal(preset.indicatorClass, 5);
			assert.equal(preset.indicatorVerdict, "Цвет эталона достигнут / Стерильно");
			assert.equal(preset.kraftSize, "100x200");
			assert.equal(preset.shelfLifeDays, 50);
			assert.equal(preset.batchVerdict, "ГОДНА");
		});

		it("verifies Fast / Prion 134°C / 2.1 bar / 20 min regime parameters", () => {
			const preset = SANPIN_AUTOCLAVE_PRION_134_PRESET;
			assert.equal(preset.temperatureC, 134);
			assert.equal(preset.pressureBar, 2.1);
			assert.equal(preset.exposureMinutes, 20);
			assert.equal(preset.sterilizerType, "autoclave_class_b");
			assert.ok(preset.programName?.includes("Prion 134°C / 20 мин"));
			assert.equal(preset.indicatorClass, 5);
			assert.equal(preset.indicatorVerdict, "Цвет эталона достигнут / Стерильно");
			assert.equal(preset.kraftSize, "150x250");
			assert.equal(preset.shelfLifeDays, 50);
			assert.equal(preset.batchVerdict, "ГОДНА");
		});

		it("verifies Delicate 121°C / 1.1 bar / 20 min regime for handpieces and plastics", () => {
			const preset = SANPIN_AUTOCLAVE_DELICATE_121_PRESET;
			assert.equal(preset.temperatureC, 121);
			assert.equal(preset.pressureBar, 1.1);
			assert.equal(preset.exposureMinutes, 20);
			assert.equal(preset.sterilizerType, "autoclave_class_b");
			assert.ok(preset.programName?.includes("Деликатная 121°C / 1.1 бар / 20 мин"));
			assert.equal(preset.indicatorClass, 4);
			assert.equal(preset.indicatorVerdict, "Цвет эталона достигнут / Стерильно");
			assert.equal(preset.kraftSize, "75x150");
			assert.equal(preset.shelfLifeDays, 50);
		});
	});

	describe("2. Sterilization Log (Form 257/у) — Dry-Heat Ovens (ГП-10/20/40 СПУ)", () => {
		it("includes GP-10, GP-20, and GP-40 SPU in popular sterilizer brand presets", () => {
			const gp10 = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "dryheat_gp10");
			const gp20 = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "dryheat_gp20");
			const gp40 = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "dryheat_gp40");

			assert.ok(gp10, "ГП-10 СПУ preset must exist");
			assert.equal(gp10?.chamberVolumeLiters, 10);
			assert.equal(gp10?.deviceType, "dry_heat");

			assert.ok(gp20, "ГП-20 СПУ preset must exist");
			assert.equal(gp20?.chamberVolumeLiters, 20);
			assert.equal(gp20?.deviceType, "dry_heat");

			assert.ok(gp40, "ГП-40 СПУ preset must exist");
			assert.equal(gp40?.chamberVolumeLiters, 40);
			assert.equal(gp40?.deviceType, "dry_heat");
		});

		it("verifies Dry-Heat 180°C / 60 min preset", () => {
			const preset = SANPIN_DRY_HEAT_180_60_PRESET;
			assert.equal(preset.temperatureC, 180);
			assert.equal(preset.pressureBar, 0);
			assert.equal(preset.exposureMinutes, 60);
			assert.equal(preset.sterilizerType, "dry_heat");
			assert.equal(preset.indicatorClass, 4);
			assert.equal(preset.indicatorBrand, "Медтест");
			assert.equal(preset.indicatorVerdict, "Цвет эталона достигнут / Стерильно");
			assert.equal(preset.bowieDickResult, "not_performed");
		});

		it("verifies Dry-Heat 160°C / 150 min preset", () => {
			const preset = SANPIN_DRY_HEAT_160_150_PRESET;
			assert.equal(preset.temperatureC, 160);
			assert.equal(preset.pressureBar, 0);
			assert.equal(preset.exposureMinutes, 150);
			assert.equal(preset.sterilizerType, "dry_heat");
			assert.equal(preset.indicatorClass, 4);
			assert.equal(preset.indicatorVerdict, "Цвет эталона достигнут / Стерильно");
		});
	});

	describe("3. Chemical Indicators & Kraft Package Specifications", () => {
		it("provides Class 4 and Class 5 indicators from Медтест, DGM Steriguard, and Винар", () => {
			assert.ok(STATUTORY_CHEMICAL_INDICATOR_OPTIONS.length >= 6);

			const vinar = STATUTORY_CHEMICAL_INDICATOR_OPTIONS.filter((i) => i.manufacturer === "Винар");
			const dgm = STATUTORY_CHEMICAL_INDICATOR_OPTIONS.filter((i) => i.manufacturer === "DGM Steriguard");
			const medtest = STATUTORY_CHEMICAL_INDICATOR_OPTIONS.filter((i) => i.manufacturer === "Медтест");

			assert.ok(vinar.length >= 2, "Винар indicators must exist");
			assert.ok(dgm.length >= 2, "DGM indicators must exist");
			assert.ok(medtest.length >= 2, "Медтест indicators must exist");

			for (const opt of STATUTORY_CHEMICAL_INDICATOR_OPTIONS) {
				assert.equal(
					opt.standardResultVerdict,
					"Цвет эталона достигнут / Стерильно",
					`Option ${opt.id} must have standard statutory verdict`
				);
				assert.ok([4, 5].includes(opt.indicatorClass));
			}
		});

		it("defines statutory kraft package sizes 75x150, 100x200, 150x250 with 50-day shelf life", () => {
			assert.equal(STATUTORY_KRAFT_SIZES.length, 3);

			const size75 = STATUTORY_KRAFT_SIZES.find((s) => s.id === "size_75x150");
			const size100 = STATUTORY_KRAFT_SIZES.find((s) => s.id === "size_100x200");
			const size150 = STATUTORY_KRAFT_SIZES.find((s) => s.id === "size_150x250");

			assert.ok(size75);
			assert.equal(size75?.dimensionsMm, "75x150 мм");
			assert.equal(size75?.maxShelfLifeDays, 50);

			assert.ok(size100);
			assert.equal(size100?.dimensionsMm, "100x200 мм");
			assert.equal(size100?.maxShelfLifeDays, 50);

			assert.ok(size150);
			assert.equal(size150?.dimensionsMm, "150x250 мм");
			assert.equal(size150?.maxShelfLifeDays, 50);
		});
	});

	describe("4. Pre-Sterilization Cleaning (ПСО, Форма № 366/у) — Azopyram & Phenolphthalein", () => {
		it("calculates 1% sample size with statutory minimum (3 items for standard, 5 for surgical)", () => {
			assert.equal(calculatePsoSamplingCount(50, false), 3);
			assert.equal(calculatePsoSamplingCount(200, false), 3);
			assert.equal(calculatePsoSamplingCount(400, false), 4); // 1% of 400 = 4
			assert.equal(calculatePsoSamplingCount(1200, false), 12); // 1% of 1200 = 12

			assert.equal(calculatePsoSamplingCount(30, true), 5); // surgical min floor = 5
			assert.equal(calculatePsoSamplingCount(600, true), 6); // 1% of 600 = 6
		});

		it("formats Azopyram test result correctly per SanPiN 3.3686-21", () => {
			assert.equal(
				formatPsoAzopyramResult("negative"),
				"Отрицательная — окрашивания нет"
			);
			assert.equal(
				formatPsoAzopyramResult("positive"),
				"Положительная — сине-фиолетовое окрашивание"
			);
		});

		it("formats Phenolphthalein test result correctly per SanPiN 3.3686-21", () => {
			assert.equal(
				formatPsoPhenolphthaleinResult("negative"),
				"Отрицательная — окрашивания нет"
			);
			assert.equal(
				formatPsoPhenolphthaleinResult("positive"),
				"Положительная — розовое окрашивание"
			);
		});

		it("creates combined 1-click PSO record conforming to Form 366/у", () => {
			const record = createQuickCombinedPsoRecord("Иванова М.И.", "Стоматологические зеркала и зонды");
			assert.equal(record.testType, "both");
			assert.equal(record.azopyramResult, "negative");
			assert.equal(record.phenolphthaleinResult, "negative");
			assert.equal(record.isApproved, true);
			assert.equal(record.operatorName, "Иванова М.И.");
			assert.ok(record.notes.includes("азопирам"));
			assert.ok(record.notes.includes("фенолфталеин"));
		});
	});

	describe("5. Medical Waste (Classes B & G, SanPiN 2.1.3684-21)", () => {
		it("supports marked container packaging for Class G toxicological waste", () => {
			const container = SANPIN_WASTE_PACKAGING_TYPES.find(
				(p) => p.id === "marked_container_class_g"
			);
			assert.ok(container, "marked_container_class_g must exist in packaging types");
			assert.equal(container?.applicableClasses ? container.applicableClasses[0] : container?.wasteClass, "class_G");
			assert.ok(container?.nameRu.includes("Маркированная тара"));
		});

		it("identifies Class B items: carpules with blood, wipes, gloves, extracted teeth", () => {
			const classB = SANPIN_MEDICAL_WASTE_CLASSES.find((c) => c.id === "class_B");
			assert.ok(classB);
			assert.ok(classB?.dentalSpecificItemsRu.some((item) => item.includes("Карпулы от анестетиков с кровью")));
			assert.ok(classB?.dentalSpecificItemsRu.some((item) => item.includes("Салфетки, марлевые турунды и ватные валики")));
			assert.ok(classB?.dentalSpecificItemsRu.some((item) => item.includes("перчатки")));
			assert.ok(classB?.dentalSpecificItemsRu.some((item) => item.includes("Удаленные зубы")));
		});

		it("identifies Class G items: lamps, disinfectants, X-ray chemicals", () => {
			const classG = SANPIN_MEDICAL_WASTE_CLASSES.find((c) => c.id === "class_G");
			assert.ok(classG);
			assert.ok(classG?.dentalSpecificItemsRu.some((item) => item.includes("Люминесцентные и бактерицидные лампы")));
			assert.ok(classG?.dentalSpecificItemsRu.some((item) => item.includes("Отработанные дезинфектанты")));
			assert.ok(classG?.dentalSpecificItemsRu.some((item) => item.includes("Рентген-реактивы")));
		});

		it("creates deterministic Class B waste record with exact net weight in kg", () => {
			const record = createQuickClassBWasteRecord({
				grossWeightKg: 2.45,
				counter: 12,
			});
			assert.equal(record.wasteClass, "class_B");
			assert.equal(record.packageType, "yellow_bag");
			assert.equal(record.grossWeightKg, 2.45);
			assert.equal(record.tareWeightKg, 0.08);
			assert.equal(record.netWeightKg, 2.37);
			assert.ok(record.sealNumber.includes("ПЛ-Б-"));
			assert.ok(record.sealNumber.includes("00012"));
			assert.ok(record.barcode.includes("CLASS_B"));
			assert.ok(record.notes?.includes("карпулы от анестетиков с кровью"));
		});

		it("creates deterministic Class G waste record with marked container", () => {
			const record = createQuickClassGWasteRecord({
				grossWeightKg: 5.0,
				counter: 7,
			});
			assert.equal(record.wasteClass, "class_G");
			assert.equal(record.packageType, "marked_container_class_g");
			assert.equal(record.grossWeightKg, 5.0);
			assert.equal(record.tareWeightKg, 0.50);
			assert.equal(record.netWeightKg, 4.50);
			assert.ok(record.sealNumber.includes("ПЛ-Г-"));
			assert.ok(record.sealNumber.includes("00007"));
			assert.ok(record.barcode.includes("CLASS_G"));
			assert.ok(record.notes?.includes("люминесцентные и бактерицидные лампы"));
		});
	});

	describe("6. Quick Cycle Factory Methods (Form 257/у)", () => {
		it("generates Universal cycle record with sequence and operator", () => {
			const cycle = createQuickUniversalCycle(3, "Ковалева Е.С.");
			assert.equal(cycle.cycleNumber, 3);
			assert.equal(cycle.operatorName, "Ковалева Е.С.");
			assert.equal(cycle.temperatureC, 134);
			assert.equal(cycle.exposureMinutes, 5);
			assert.ok(cycle.id.includes("cycle-univ-"));
		});

		it("generates Prion cycle record", () => {
			const cycle = createQuickPrionCycle(4);
			assert.equal(cycle.cycleNumber, 4);
			assert.equal(cycle.temperatureC, 134);
			assert.equal(cycle.exposureMinutes, 20);
			assert.equal(cycle.kraftSize, "150x250");
		});

		it("generates Delicate cycle record", () => {
			const cycle = createQuickDelicateCycle(2);
			assert.equal(cycle.cycleNumber, 2);
			assert.equal(cycle.temperatureC, 121);
			assert.equal(cycle.pressureBar, 1.1);
			assert.equal(cycle.exposureMinutes, 20);
		});

		it("generates Dry-Heat 180°C and 160°C cycle records", () => {
			const cycle180 = createQuickDryHeat180Cycle(1);
			assert.equal(cycle180.temperatureC, 180);
			assert.equal(cycle180.exposureMinutes, 60);
			assert.equal(cycle180.sterilizerType, "dry_heat");

			const cycle160 = createQuickDryHeat160Cycle(2);
			assert.equal(cycle160.temperatureC, 160);
			assert.equal(cycle160.exposureMinutes, 150);
			assert.equal(cycle160.sterilizerType, "dry_heat");
		});
	});
});
