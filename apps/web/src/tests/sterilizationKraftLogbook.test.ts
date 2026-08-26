/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION KRAFT LOGBOOK & CHEMICAL INTEGRATORS TEST SUITE
 * 20+ Comprehensive Unit & Integration Tests covering packaging shelf lives,
 * cycle parameter validation, chemical indicators (Classes 4/5/6), barcode vectors,
 * and clinical unsealing protocols.
 * ============================================================================
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	SANPIN_PACKAGING_TYPES,
	STERILIZATION_REGIMES,
	calculatePackageExpiryDate,
	calculateSanpinShelfLifeDays,
	formatDaysRussian,
	getSanpinPackagingTypeDefinition,
	validateSterilizationCycleParameters,
	type SanpinPackagingTypeId,
	type SterilizationRegimeId,
} from "../components/sanpin/kraft/kraftBagSanpinMath";
import {
	CHEMICAL_INTEGRATORS_CATALOG,
	evaluateChemicalIntegratorColorMatch,
	getAllChemicalIntegrators,
	getChemicalIntegratorById,
	getChemicalIntegratorsByClass,
	getChemicalIntegratorsByRegime,
	getRecommendedIntegrator,
} from "../components/sanpin/kraft/chemicalIntegratorsCatalog";
import {
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
	generateCode128Svg,
	generateDataMatrixSvg,
} from "../components/sanpin/kraft/kraftPackageEngine";

describe("SanPiN 3.3686-21 Sterilization Kraft-Bag & Chemical Integrator Suite", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. STATUTORY PACKAGING SHELF LIFE NORMS (SanPiN 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory Packaging Shelf Life Norms", () => {
		it("verifies all 6 statutory packaging types are registered with correct clauses", () => {
			assert.equal(SANPIN_PACKAGING_TYPES.length, 6);

			const ids: SanpinPackagingTypeId[] = [
				"kraft_self_seal",
				"paper_plastic_heat_seal",
				"crepe_paper_double",
				"bix_filter",
				"bix_no_filter",
				"calico_double_wrap",
			];

			ids.forEach((id) => {
				const found = SANPIN_PACKAGING_TYPES.find((t) => t.id === id);
				assert.ok(found, `Packaging type ${id} must exist in catalog`);
				assert.ok(found.sanpinClauseRu.includes("СанПиН 3.3686-21"));
				assert.ok(found.defaultShelfLifeDays > 0);
			});
		});

		it("verifies self-seal kraft bag shelf life norm is 20-50 days (default 50)", () => {
			const kraft = getSanpinPackagingTypeDefinition("kraft_self_seal");
			assert.equal(kraft.minShelfLifeDays, 20);
			assert.equal(kraft.maxShelfLifeDays, 50);
			assert.equal(kraft.defaultShelfLifeDays, 50);
			assert.equal(kraft.isHeatSealed, false);
		});

		it("verifies paper-plastic combined heat-sealed pouch shelf life is 50-60/180 days (default 60)", () => {
			const combi = getSanpinPackagingTypeDefinition("paper_plastic_heat_seal");
			assert.equal(combi.minShelfLifeDays, 50);
			assert.equal(combi.maxShelfLifeDays, 180);
			assert.equal(combi.defaultShelfLifeDays, 60);
			assert.equal(combi.isHeatSealed, true);
			assert.equal(combi.isTransparentFilm, true);
		});

		it("verifies crepe paper in 2 layers shelf life is 60 days", () => {
			const crepe = getSanpinPackagingTypeDefinition("crepe_paper_double");
			assert.equal(crepe.minShelfLifeDays, 60);
			assert.equal(crepe.maxShelfLifeDays, 60);
			assert.equal(crepe.defaultShelfLifeDays, 60);
		});

		it("verifies bix with filter is 20-30 days and bix without filter is strictly 3 days", () => {
			const bixFilter = getSanpinPackagingTypeDefinition("bix_filter");
			assert.equal(bixFilter.minShelfLifeDays, 20);
			assert.equal(bixFilter.maxShelfLifeDays, 30);
			assert.equal(bixFilter.defaultShelfLifeDays, 20);

			const bixNoFilter = getSanpinPackagingTypeDefinition("bix_no_filter");
			assert.equal(bixNoFilter.minShelfLifeDays, 3);
			assert.equal(bixNoFilter.maxShelfLifeDays, 3);
			assert.equal(bixNoFilter.defaultShelfLifeDays, 3);
		});

		it("verifies double calico fabric wrap shelf life is strictly 3 days (72 hours)", () => {
			const calico = getSanpinPackagingTypeDefinition("calico_double_wrap");
			assert.equal(calico.minShelfLifeDays, 3);
			assert.equal(calico.maxShelfLifeDays, 3);
			assert.equal(calico.defaultShelfLifeDays, 3);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. MATHEMATICAL EXPIRATION DATE & STATUS CALCULATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Shelf Life Math & Status Transitions", () => {
		it("calculates statutory shelf life days with manufacturer clamping", () => {
			// Kraft bag clamped between 20 and 50
			assert.equal(calculateSanpinShelfLifeDays("kraft_self_seal", { manufacturerDays: 30 }), 30);
			assert.equal(calculateSanpinShelfLifeDays("kraft_self_seal", { manufacturerDays: 10 }), 20); // Clamped to min 20
			assert.equal(calculateSanpinShelfLifeDays("kraft_self_seal", { manufacturerDays: 100 }), 50); // Clamped to max 50

			// Custom days overrides
			assert.equal(calculateSanpinShelfLifeDays("kraft_self_seal", { customDays: 45 }), 45);
		});

		it("evaluates a freshly packed sterile package (45 days remaining -> valid, green)", () => {
			const packDate = "2026-08-20";
			const refDate = "2026-08-25"; // 5 days after pack date

			const result = calculatePackageExpiryDate(packDate, "kraft_self_seal", {
				referenceDate: refDate,
			});

			assert.equal(result.packDateFormatted, "2026-08-20");
			assert.equal(result.shelfLifeDays, 50);
			assert.equal(result.daysRemaining, 45);
			assert.equal(result.status, "valid");
			assert.equal(result.isExpired, false);
			assert.equal(result.isExpiringSoon, false);
			assert.equal(result.statusColorHex, "#10b981");
			assert.ok(result.statusLabelRu.includes("Стерильно"));
		});

		it("evaluates an expiring soon package (4 days remaining -> expiring_soon, amber)", () => {
			const packDate = "2026-08-01";
			const refDate = "2026-09-16"; // 46 days after pack date (50 - 46 = 4 days remaining)

			const result = calculatePackageExpiryDate(packDate, "kraft_self_seal", {
				referenceDate: refDate,
			});

			assert.equal(result.daysRemaining, 4);
			assert.equal(result.status, "expiring_soon");
			assert.equal(result.isExpired, false);
			assert.equal(result.isExpiringSoon, true);
			assert.equal(result.statusColorHex, "#f59e0b");
			assert.ok(result.statusLabelRu.includes("Истекает через 4 дня"));
		});

		it("evaluates an expired package (-10 days remaining -> expired, red)", () => {
			const packDate = "2026-06-01";
			const refDate = "2026-08-01"; // 61 days after pack date (50 - 61 = -11 days)

			const result = calculatePackageExpiryDate(packDate, "kraft_self_seal", {
				referenceDate: refDate,
			});

			assert.ok(result.daysRemaining <= 0);
			assert.equal(result.status, "expired");
			assert.equal(result.isExpired, true);
			assert.equal(result.isExpiringSoon, false);
			assert.equal(result.statusColorHex, "#ef4444");
			assert.ok(result.statusLabelRu.includes("ПРОСРОЧЕНО"));
			assert.ok(result.recommendationRu.includes("Отправить на повторную"));
		});

		it("correctly handles Russian grammatical forms of days", () => {
			assert.equal(formatDaysRussian(1), "день");
			assert.equal(formatDaysRussian(21), "день");
			assert.equal(formatDaysRussian(2), "дня");
			assert.equal(formatDaysRussian(4), "дня");
			assert.equal(formatDaysRussian(24), "дня");
			assert.equal(formatDaysRussian(5), "дней");
			assert.equal(formatDaysRussian(11), "дней");
			assert.equal(formatDaysRussian(14), "дней");
			assert.equal(formatDaysRussian(50), "дней");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. STERILIZATION CYCLE PARAMETERS VALIDATION (SanPiN 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Sterilization Cycle Parameters Validation", () => {
		it("validates nominal Steam 134°C / 5 min / 2.05 bar as compliant", () => {
			const result = validateSterilizationCycleParameters("steam_134_5min", 134.5, 2.1, 5.0);
			assert.equal(result.isValid, true);
			assert.equal(result.errors.length, 0);
			assert.ok(result.complianceVerdictRu.includes("Стерилизация подтверждена"));
		});

		it("detects critical temperature drop in autoclave (130°C < 134°C) and flags error", () => {
			const result = validateSterilizationCycleParameters("steam_134_5min", 130.0, 2.1, 5.0);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("КРИТИЧЕСКИЙ СБОЙ ТЕМПЕРАТУРЫ")));
			assert.ok(result.complianceVerdictRu.includes("БРАК СТЕРИЛИЗАЦИИ"));
		});

		it("detects insufficient steam pressure (1.7 bar < 2.0 bar) and flags error", () => {
			const result = validateSterilizationCycleParameters("steam_134_5min", 135.0, 1.7, 5.0);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("НЕДОСТАТОЧНОЕ ДАВЛЕНИЕ ПАРА")));
		});

		it("detects insufficient exposure time (3 min < 5 min) and flags error", () => {
			const result = validateSterilizationCycleParameters("steam_134_5min", 135.0, 2.1, 3.0);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("НЕДОСТАТОЧНОЕ ВРЕМЯ СТЕРИЛИЗАЦИИ")));
		});

		it("validates delicate regime Steam 121°C / 20 min / 1.15 bar as compliant", () => {
			const result = validateSterilizationCycleParameters("steam_121_20min", 121.5, 1.15, 20.0);
			assert.equal(result.isValid, true);
			assert.equal(result.errors.length, 0);
		});

		it("validates dry heat sterilizer (Сухожар) 180°C / 60 min", () => {
			const validResult = validateSterilizationCycleParameters("dry_heat_180_60min", 182.0, 0, 60.0);
			assert.equal(validResult.isValid, true);

			const invalidResult = validateSterilizationCycleParameters("dry_heat_180_60min", 175.0, 0, 60.0);
			assert.equal(invalidResult.isValid, false);
			assert.ok(invalidResult.errors.some((e) => e.includes("КРИТИЧЕСКИЙ СБОЙ ТЕМПЕРАТУРЫ")));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. CHEMICAL INTEGRATORS CATALOG (GOST ISO 11140-1)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Chemical Integrators Catalog & Classes 4/5/6", () => {
		it("catalog contains verified indicators for Classes 4, 5, and 6", () => {
			const all = getAllChemicalIntegrators();
			assert.ok(all.length >= 8);

			const class4 = getChemicalIntegratorsByClass("class_4");
			assert.ok(class4.length >= 3);

			const class5 = getChemicalIntegratorsByClass("class_5");
			assert.ok(class5.length >= 2);

			const class6 = getChemicalIntegratorsByClass("class_6");
			assert.ok(class6.length >= 2);
		});

		it("filters chemical integrators by sterilization regime", () => {
			const steam134 = getChemicalIntegratorsByRegime("steam_134_5min");
			assert.ok(steam134.length >= 5);
			steam134.forEach((i) => assert.equal(i.regimeId, "steam_134_5min"));

			const dryHeat = getChemicalIntegratorsByRegime("dry_heat_180_60min");
			assert.ok(dryHeat.length >= 2);
			dryHeat.forEach((i) => assert.equal(i.regimeId, "dry_heat_180_60min"));
		});

		it("recommends Class 5 or Class 6 indicator for critical surgery", () => {
			const recSurgery = getRecommendedIntegrator("steam_134_5min", { forCriticalSurgery: true });
			assert.ok(recSurgery.classType === "class_5" || recSurgery.classType === "class_6");
			assert.equal(recSurgery.isCriticalSurgeryRecommended, true);
		});

		it("evaluates chemical indicator color matching correctly", () => {
			const indId = "vinar_steritest_4_134";

			// Exact match -> OK
			const match = evaluateChemicalIntegratorColorMatch(indId, "match_reference");
			assert.equal(match.isValid, true);
			assert.equal(match.allowsClinicalUse, true);
			assert.equal(match.statusColorHex, "#10b981");

			// Darker -> OK (excess lethal dose)
			const darker = evaluateChemicalIntegratorColorMatch(indId, "darker_than_reference");
			assert.equal(darker.isValid, true);
			assert.equal(darker.allowsClinicalUse, true);

			// Lighter -> FAIL (under-sterilization)
			const lighter = evaluateChemicalIntegratorColorMatch(indId, "lighter_than_reference");
			assert.equal(lighter.isValid, false);
			assert.equal(lighter.allowsClinicalUse, false);
			assert.ok(lighter.verdictRu.includes("БРАК"));

			// Unchanged -> CRITICAL FAIL
			const unchanged = evaluateChemicalIntegratorColorMatch(indId, "unchanged_initial");
			assert.equal(unchanged.isValid, false);
			assert.equal(unchanged.allowsClinicalUse, false);
			assert.ok(unchanged.verdictRu.includes("КРИТИЧЕСКИЙ БРАК"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. VECTOR BARCODES & DATA MATRIX PAYLOADS
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Barcode & Thermal Sticker Generation", () => {
		it("generates standardized 1D barcode string", () => {
			const bc = generate1DBarcodeString("KB-20260826-01", 5);
			assert.equal(bc, "KB0826010005");
		});

		it("formats structured SanPiN DataMatrix payload", () => {
			const payload = formatKraftDataMatrixPayload({
				batchId: "KB-20260826-01",
				autoclaveId: "АК-01",
				cycleNumber: 3,
				packDate: "2026-08-26",
				expDate: "2026-10-15",
				operatorId: "NURSE-01",
				toolSetId: "set_therapeutic",
				serialNumber: 1,
			});

			assert.equal(payload, "KB-20260826-01#1|АК-01|CYC3|2026-08-26|2026-10-15|NURSE-01|set_therapeutic");
		});

		it("generates valid vector SVG Code128", () => {
			const svg = generateCode128Svg("KB2608260001", { height: 30, showText: false });
			assert.ok(svg.includes("<svg"));
			assert.ok(svg.includes("</svg>"));
			assert.ok(svg.includes("<rect"));
		});

		it("generates valid vector SVG DataMatrix 2D", () => {
			const svg = generateDataMatrixSvg("KB-20260826-01#1|АК-01|CYC3", { size: 60 });
			assert.ok(svg.includes("<svg"));
			assert.ok(svg.includes("</svg>"));
		});
	});
});
