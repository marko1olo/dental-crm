import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	SANPIN_PACKAGE_SIZES,
	SANPIN_PACKAGING_MATERIALS,
	SANPIN_STERILIZATION_REGIMES,
	SANPIN_CHEMICAL_INDICATOR_CLASSES,
	SANPIN_PSO_CONSTANTS,
	calculatePsoSamplingRequirement,
	calculatePackageExpiryDate,
	validateSterilizationCycleParameters,
	getSanpinPackagingMaterial,
	getSanpinPackageSize,
	getSanpinSterilizationRegime,
} from "../sanpin/sanpinPackagingSsot.js";

describe("SANPIN 3.3686-21 PACKAGING & STERILIZATION SSOT SUITE", () => {
	describe("1. Dental Kraft Package Dimensions & Presets", () => {
		it("provides standard dental kraft package sizes with verified dimensions", () => {
			assert.equal(SANPIN_PACKAGE_SIZES.length, 5);

			const size75x150 = getSanpinPackageSize("size_75x150");
			assert.equal(size75x150.widthMm, 75);
			assert.equal(size75x150.heightMm, 150);
			assert.match(size75x150.dentalApplicationRu, /боры|эндо/i);

			const size100x200 = getSanpinPackageSize("size_100x200");
			assert.equal(size100x200.widthMm, 100);
			assert.equal(size100x200.heightMm, 200);
			assert.match(size100x200.dentalApplicationRu, /щипцы|элеваторы/i);

			const size100x250 = getSanpinPackageSize("size_100x250");
			assert.equal(size100x250.widthMm, 100);
			assert.equal(size100x250.heightMm, 250);
			assert.match(size100x250.dentalApplicationRu, /наконечники/i);

			const size150x250 = getSanpinPackageSize("size_150x250");
			assert.equal(size150x250.widthMm, 150);
			assert.equal(size150x250.heightMm, 250);
			assert.match(size150x250.dentalApplicationRu, /имплантации|хирургический/i);

			const size200x300 = getSanpinPackageSize("size_200x300");
			assert.equal(size200x300.widthMm, 200);
			assert.equal(size200x300.heightMm, 300);
		});

		it("falls back safely for unknown package size", () => {
			const fallback = getSanpinPackageSize("unknown_size" as any);
			assert.ok(fallback);
			assert.equal(fallback.id, "size_100x200");
		});
	});

	describe("2. Statutory Sterility Lifespan Norms", () => {
		it("enforces exact SanPiN 3.3686-21 statutory shelf lives", () => {
			const selfSeal = getSanpinPackagingMaterial("kraft_self_seal");
			assert.equal(selfSeal.statutoryShelfLifeDays, 50);
			assert.equal(selfSeal.isHeatSealed, false);
			assert.equal(selfSeal.isImmediateUseOnly, false);

			const heatSealRoll = getSanpinPackagingMaterial("heat_seal_roll");
			assert.equal(heatSealRoll.statutoryShelfLifeDays, 20);
			assert.equal(heatSealRoll.isHeatSealed, true);
			assert.equal(heatSealRoll.isImmediateUseOnly, false);

			const heatSealPouch = getSanpinPackagingMaterial("heat_seal_pouch");
			assert.equal(heatSealPouch.statutoryShelfLifeDays, 60);
			assert.equal(heatSealPouch.isHeatSealed, true);

			const crepeWrap = getSanpinPackagingMaterial("crepe_paper_wrap");
			assert.equal(crepeWrap.statutoryShelfLifeDays, 60);

			const unpacked = getSanpinPackagingMaterial("unpacked_immediate");
			assert.equal(unpacked.statutoryShelfLifeDays, 0);
			assert.equal(unpacked.isImmediateUseOnly, true);
		});

		it("falls back to default material on unknown id", () => {
			const fallback = getSanpinPackagingMaterial("non_existent" as any);
			assert.equal(fallback.id, "kraft_self_seal");
		});
	});

	describe("3. Autoclave Regimes & Thermodynamic Tolerances", () => {
		it("provides canonical dental sterilization regimes", () => {
			const steam134 = getSanpinSterilizationRegime("steam_134_5min");
			assert.equal(steam134.targetTemperatureCelsius, 134);
			assert.equal(steam134.targetPressureBar, 2.1);
			assert.equal(steam134.targetExposureMinutes, 5);
			assert.equal(steam134.methodType, "steam_autoclave");
			assert.equal(steam134.recommendedIndicatorClass, 5);

			const steam121 = getSanpinSterilizationRegime("steam_121_20min");
			assert.equal(steam121.targetTemperatureCelsius, 121);
			assert.equal(steam121.targetPressureBar, 1.1);
			assert.equal(steam121.targetExposureMinutes, 20);
			assert.equal(steam121.methodType, "steam_autoclave");

			const dryHeat = getSanpinSterilizationRegime("dry_heat_180_60min");
			assert.equal(dryHeat.targetTemperatureCelsius, 180);
			assert.equal(dryHeat.targetPressureBar, 0);
			assert.equal(dryHeat.targetExposureMinutes, 60);
			assert.equal(dryHeat.methodType, "dry_heat_air");

			const steam132 = getSanpinSterilizationRegime("steam_132_20min");
			assert.equal(steam132.targetTemperatureCelsius, 132);
			assert.equal(steam132.targetPressureBar, 2.0);
			assert.equal(steam132.targetExposureMinutes, 20);
		});
	});

	describe("4. Chemical Indicators Classes 4, 5 and 6", () => {
		it("defines all three chemical indicator classes strictly per GOST ISO 11140-1", () => {
			assert.equal(SANPIN_CHEMICAL_INDICATOR_CLASSES.length, 3);
			const classes = SANPIN_CHEMICAL_INDICATOR_CLASSES.map((c) => c.classNumber);
			assert.deepEqual(classes, [4, 5, 6]);

			const class5 = SANPIN_CHEMICAL_INDICATOR_CLASSES.find((c) => c.classNumber === 5);
			assert.ok(class5);
			assert.match(class5.titleRu, /Интегрирующие/i);
			assert.match(class5.clinicalSignificanceRu, /Золотой стандарт/i);
		});
	});

	describe("5. PSO Chemical Sampling Formula (1%, min 3–5 items)", () => {
		it("calculates 1% sample with minimum floor of 3 for general dental instruments", () => {
			const res50 = calculatePsoSamplingRequirement(50, false, 1);
			assert.equal(res50.batchCount, 50);
			assert.equal(res50.calculatedPercentCount, 1);
			assert.equal(res50.minSampleRequired, 3);

			const res100 = calculatePsoSamplingRequirement(100, false, 1);
			assert.equal(res100.calculatedPercentCount, 1);
			assert.equal(res100.minSampleRequired, 3);

			const res500 = calculatePsoSamplingRequirement(500, false, 1);
			assert.equal(res500.calculatedPercentCount, 5);
			assert.equal(res500.minSampleRequired, 5);
		});

		it("enforces minimum floor of 5 for surgical/critical instruments", () => {
			const resSurg30 = calculatePsoSamplingRequirement(30, true, 1);
			assert.equal(resSurg30.calculatedPercentCount, 1);
			assert.equal(resSurg30.minSampleRequired, 5);

			const resSurg800 = calculatePsoSamplingRequirement(800, true, 1);
			assert.equal(resSurg800.calculatedPercentCount, 8);
			assert.equal(resSurg800.minSampleRequired, 8);
		});

		it("multiplies floor across multiple item categories", () => {
			const resMulti = calculatePsoSamplingRequirement(100, false, 3);
			assert.equal(resMulti.itemsTypesCount, 3);
			assert.equal(resMulti.floorPerItem, 3);
			assert.equal(resMulti.minSampleRequired, 9);
		});

		it("handles zero, negative, or degenerate input gracefully", () => {
			const res = calculatePsoSamplingRequirement(0, false, 0);
			assert.equal(res.batchCount, 1);
			assert.equal(res.itemsTypesCount, 1);
			assert.equal(res.minSampleRequired, 3);
		});
	});

	describe("6. Expiry Calculation & Sterility Monitoring", () => {
		it("accurately projects expiry date for 50-day self-seal kraft bag", () => {
			const baseDate = new Date("2026-10-01T10:00:00Z");
			const refDate = new Date("2026-10-01T10:00:00Z");

			const result = calculatePackageExpiryDate(baseDate, "kraft_self_seal", { referenceDate: refDate });
			assert.equal(result.shelfLifeDays, 50);
			assert.equal(result.daysRemaining, 50);
			assert.equal(result.status, "valid");
			assert.equal(result.isExpired, false);
			assert.equal(result.isExpiringSoon, false);
			assert.equal(result.packDateFormatted, "2026-10-01");
			assert.equal(result.expiryDateFormatted, "2026-11-20");
		});

		it("detects expiring soon status within 7 days", () => {
			const baseDate = new Date("2026-10-01T10:00:00Z");
			const refDate = new Date("2026-10-18T10:00:00Z");

			const result = calculatePackageExpiryDate(baseDate, "heat_seal_roll", { referenceDate: refDate });
			assert.equal(result.shelfLifeDays, 20);
			assert.equal(result.daysRemaining, 3);
			assert.equal(result.status, "expiring_soon");
			assert.equal(result.isExpiringSoon, true);
			assert.equal(result.isExpired, false);
		});

		it("detects expired status when reference date exceeds expiry", () => {
			const baseDate = new Date("2026-08-01T10:00:00Z");
			const refDate = new Date("2026-10-01T10:00:00Z");

			const result = calculatePackageExpiryDate(baseDate, "kraft_self_seal", { referenceDate: refDate });
			assert.equal(result.status, "expired");
			assert.equal(result.isExpired, true);
			assert.match(result.statusLabelRu, /Просрочено/i);
		});

		it("handles unpacked immediate use items with zero shelf life", () => {
			const baseDate = new Date("2026-10-11T10:00:00Z");
			const result = calculatePackageExpiryDate(baseDate, "unpacked_immediate");
			assert.equal(result.shelfLifeDays, 0);
			assert.equal(result.daysRemaining, 0);
			assert.equal(result.status, "immediate_use");
			assert.match(result.statusLabelRu, /немедленно/i);
		});

		it("allows custom days override", () => {
			const baseDate = new Date("2026-10-01T10:00:00Z");
			const result = calculatePackageExpiryDate(baseDate, "kraft_self_seal", {
				customDays: 30,
				referenceDate: baseDate,
			});
			assert.equal(result.shelfLifeDays, 30);
			assert.equal(result.daysRemaining, 30);
		});
	});

	describe("7. Autoclave Cycle Validation Engine", () => {
		it("approves perfect standard dental autoclave cycle (134°C / 2.1 bar / 5 min)", () => {
			const result = validateSterilizationCycleParameters("steam_134_5min", 134, 2.1, 5);
			assert.equal(result.isValid, true);
			assert.equal(result.errors.length, 0);
			assert.match(result.complianceVerdictRu, /полностью соответствует/i);
		});

		it("approves delicate 121°C / 1.1 bar / 20 min cycle", () => {
			const result = validateSterilizationCycleParameters("steam_121_20min", 121, 1.1, 20);
			assert.equal(result.isValid, true);
			assert.equal(result.errors.length, 0);
		});

		it("approves dry heat 180°C / 0 bar / 60 min cycle", () => {
			const result = validateSterilizationCycleParameters("dry_heat_180_60min", 180, 0, 60);
			assert.equal(result.isValid, true);
			assert.equal(result.errors.length, 0);
		});

		it("rejects cycles with sub-normal temperature or insufficient pressure", () => {
			const tempFail = validateSterilizationCycleParameters("steam_134_5min", 131, 2.1, 5);
			assert.equal(tempFail.isValid, false);
			assert.ok(tempFail.errors.some((e) => e.includes("Критический сбой температуры")));

			const pressureFail = validateSterilizationCycleParameters("steam_134_5min", 134, 1.7, 5);
			assert.equal(pressureFail.isValid, false);
			assert.ok(pressureFail.errors.some((e) => e.includes("Недостаточное давление пара")));

			const timeFail = validateSterilizationCycleParameters("steam_134_5min", 134, 2.1, 3);
			assert.equal(timeFail.isValid, false);
			assert.ok(timeFail.errors.some((e) => e.includes("Недостаточная выдержка")));
		});

		it("handles thermodynamic anomalies and dry heat pressure mismatch", () => {
			const steamZeroBar = validateSterilizationCycleParameters("steam_134_5min", 134, 0, 5);
			assert.equal(steamZeroBar.isValid, false);
			assert.ok(steamZeroBar.errors.some((e) => e.includes("Сбой пара")));

			const dryHeatHighBar = validateSterilizationCycleParameters("dry_heat_180_60min", 180, 1.5, 60);
			assert.equal(dryHeatHighBar.isValid, false);
			assert.ok(dryHeatHighBar.errors.some((e) => e.includes("атмосферном давлении")));
		});

		it("flags warning on slight pressure excess without invalidating", () => {
			const slightOverpressure = validateSterilizationCycleParameters("steam_134_5min", 135, 2.35, 6);
			assert.equal(slightOverpressure.isValid, true);
			assert.equal(slightOverpressure.warnings.length, 1);
			assert.match(slightOverpressure.complianceVerdictRu, /Параметры в допуске/i);
		});
	});
});
