/**
 * ============================================================================
 * SANPIN 3.3686-21 & MU 287-113 AZOPYRAM & STERILIZATION ENGINE TESTS
 * Строгие модульные тесты для проверки нормативного расчета выборки,
 * 2-часового срока годности раствора азопирама, детекции скрытой крови,
 * щелочных ПАВ, браковки партий и формирования официальной формы № 366/у.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	SANPIN_AZOPYRAM_NORMS,
	DENTAL_PSO_INSTRUMENT_CATEGORIES,
	STATUTORY_PSO_REAGENTS,
	calculateStatutorySampling,
	checkAzopyramSolutionFreshness,
	evaluatePsoCleaningBatch,
	generateStatutoryPsoForm366PrintHtml,
	type PsoEvaluationInput,
	type PsoPrintDocumentParams,
} from "../sanpinAzopyramEngine";
import {
	STATUTORY_REGIMES_OPTIONS,
	STATUTORY_PACKAGING_PRESETS,
	INITIAL_5_POINTS,
} from "../SterilizationCycleModal";

describe("SanPiN 3.3686-21 & MU 287-113 Azopyram & PSO Regulatory Engine", () => {
	describe("1. Statutory Constants & Invariants", () => {
		it("enforces working solution shelf life ceiling of strictly 120 minutes (2 hours)", () => {
			assert.equal(SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes, 120);
		});

		it("enforces reaction observation window ceiling of strictly 60 seconds (1 minute)", () => {
			assert.equal(SANPIN_AZOPYRAM_NORMS.reactionObservationSeconds, 60);
		});

		it("contains statutory dental instrument categories with critical zones", () => {
			assert.ok(DENTAL_PSO_INSTRUMENT_CATEGORIES.length >= 5);
			const handpieces = DENTAL_PSO_INSTRUMENT_CATEGORIES.find((c) => c.id === "handpieces_turbine_motor");
			assert.ok(handpieces, "Turbine/motor handpieces category must exist");
			assert.ok(handpieces.criticalInspectionZonesRu.includes("спрей-канал"));

			const surgical = DENTAL_PSO_INSTRUMENT_CATEGORIES.find((c) => c.id === "surgical_forceps_elevators");
			assert.ok(surgical, "Surgical forceps category must exist");
			assert.equal(surgical.isSurgicalOrCritical, true);
		});

		it("defines statutory certified reagents without fakes or placeholders", () => {
			assert.equal(STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber, "АЗО-2026/08-114");
			assert.ok(STATUTORY_PSO_REAGENTS.azopyram.activeSubstanceRu.includes("Амидопирин 10%"));
			assert.equal(STATUTORY_PSO_REAGENTS.hydrogenPeroxide.standardLotNumber, "H2O2-2026/07-55");
			assert.equal(STATUTORY_PSO_REAGENTS.phenolphthalein.standardLotNumber, "ФЕН-2026/05-22");
		});
	});

	describe("2. Statutory Sampling Math (1% min 3 standard, min 5 surgical)", () => {
		it("calculates minimum 3 items for standard small batches", () => {
			const res10 = calculateStatutorySampling(10, false, 1);
			assert.equal(res10.minSampleRequired, 3);

			const res50 = calculateStatutorySampling(50, false, 1);
			assert.equal(res50.minSampleRequired, 3);

			const res200 = calculateStatutorySampling(200, false, 1);
			assert.equal(res200.minSampleRequired, 3);
		});

		it("calculates exactly 1% ceiling for batches larger than 300 pieces", () => {
			const res350 = calculateStatutorySampling(350, false, 1);
			assert.equal(res350.minSampleRequired, 4); // ceil(3.5) = 4

			const res500 = calculateStatutorySampling(500, false, 1);
			assert.equal(res500.minSampleRequired, 5); // 500 * 0.01 = 5

			const res1200 = calculateStatutorySampling(1200, false, 1);
			assert.equal(res1200.minSampleRequired, 12);
		});

		it("enforces higher minimum floor of 5 items for critical surgical instruments", () => {
			const res20 = calculateStatutorySampling(20, true, 1);
			assert.equal(res20.minSampleRequired, 5);

			const res400 = calculateStatutorySampling(400, true, 1);
			assert.equal(res400.minSampleRequired, 5);

			const res800 = calculateStatutorySampling(800, true, 1);
			assert.equal(res800.minSampleRequired, 8); // 800 * 0.01 = 8 > 5
		});

		it("scales correctly when multiple instrument types are inspected in a combined batch", () => {
			const resMulti = calculateStatutorySampling(100, false, 3);
			assert.equal(resMulti.minSampleRequired, 9); // 3 items/type * 3 types = 9
		});
	});

	describe("3. 2-Hour Working Solution Lifespan & Freshness Tracker", () => {
		it("validates fresh solution prepared 10 minutes ago", () => {
			const now = new Date("2026-08-25T12:00:00.000Z");
			const preparedAt = new Date("2026-08-25T11:50:00.000Z").toISOString();
			const status = checkAzopyramSolutionFreshness(preparedAt, now);

			assert.equal(status.ageMinutes, 10);
			assert.equal(status.isExpired, false);
			assert.equal(status.remainingMinutes, 110);
			assert.equal(status.warningRu, null);
		});

		it("warns when solution has 15 minutes or less remaining", () => {
			const now = new Date("2026-08-25T12:00:00.000Z");
			const preparedAt = new Date("2026-08-25T10:10:00.000Z").toISOString(); // 110 min ago
			const status = checkAzopyramSolutionFreshness(preparedAt, now);

			assert.equal(status.ageMinutes, 110);
			assert.equal(status.isExpired, false);
			assert.equal(status.remainingMinutes, 10);
			assert.ok(status.warningRu?.includes("истекает через 10 мин"));
		});

		it("strictly expires solution older than 120 minutes with critical warning", () => {
			const now = new Date("2026-08-25T12:00:00.000Z");
			const preparedAt = new Date("2026-08-25T09:45:00.000Z").toISOString(); // 135 min ago
			const status = checkAzopyramSolutionFreshness(preparedAt, now);

			assert.equal(status.ageMinutes, 135);
			assert.equal(status.isExpired, true);
			assert.equal(status.remainingMinutes, 0);
			assert.ok(status.warningRu?.includes("КРИТИЧЕСКИЙ БРАК"));
			assert.ok(status.warningRu?.includes("Проба НЕДЕЙСТВИТЕЛЬНА"));
		});
	});

	describe("4. Batch Quality Evaluation & Strict Rejection Protocols", () => {
		const freshSolution = new Date().toISOString();

		it("approves fully compliant batch meeting all SanPiN criteria", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, true);
			assert.equal(result.isBatchBlocked, false);
			assert.equal(result.rejectionReasons.length, 0);
			assert.equal(result.statusBadgeText, "ДОПУЩЕНО К СТЕРИЛИЗАЦИИ");
			assert.equal(result.statusBadgeClass, "badge-success");
			assert.ok(result.clinicalActionProtocolRu.includes("допущена к упаковке"));
		});

		it("rejects 100% of batch when occult blood is detected (azopyram positive)", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 80,
				testedSampleCount: 3,
				isAzopyramNegative: false, // Blood detected!
				isPhenolphthaleinNegative: true,
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, false);
			assert.equal(result.isBatchBlocked, true);
			assert.equal(result.statusBadgeText, "БРАК: ОБНАРУЖЕНА КРОВЬ");
			assert.equal(result.statusBadgeClass, "badge-danger");
			assert.ok(result.rejectionReasons.some((r) => r.includes("ПОЛОЖИТЕЛЬНАЯ АЗОПИРАМОВАЯ ПРОБА")));
			assert.ok(result.clinicalActionProtocolRu.includes("Вся партия изделий (100%)"));
			assert.ok(result.clinicalActionProtocolRu.includes("НЕСТЕРИЛЬНОЙ И ОПАСНОЙ"));
			assert.ok(result.clinicalActionProtocolRu.includes("повторный полный цикл дезинфекции"));
		});

		it("rejects 100% of batch when alkaline detergent residues are detected (phenolphthalein positive)", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 50,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false, // Alkali detected!
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, false);
			assert.equal(result.isBatchBlocked, true);
			assert.equal(result.statusBadgeText, "БРАК: ОСТАТКИ ЩЕЛОЧИ");
			assert.equal(result.statusBadgeClass, "badge-danger");
			assert.ok(result.rejectionReasons.some((r) => r.includes("ПОЛОЖИТЕЛЬНАЯ ФЕНОЛФТАЛЕИНОВАЯ ПРОБА")));
			assert.ok(result.clinicalActionProtocolRu.includes("повторному обильному ополаскиванию"));
		});

		it("rejects trial when azopyram solution is expired (> 2 hours)", () => {
			const expiredTime = new Date(Date.now() - 150 * 60 * 1000).toISOString(); // 150 min ago
			const input: PsoEvaluationInput = {
				batchItemCount: 60,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				azopyramSolutionPreparedAt: expiredTime,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, false);
			assert.equal(result.isBatchBlocked, true);
			assert.equal(result.isSolutionExpired, true);
			assert.equal(result.statusBadgeText, "БРАК: РАСТВОР ПРОСРОЧЕН (>2 Ч)");
			assert.ok(result.rejectionReasons.some((r) => r.includes("Истек 2-часовой срок годности")));
			assert.ok(result.clinicalActionProtocolRu.includes("вылить старый раствор азопирама"));
		});

		it("rejects batch if sample count is below regulatory minimum", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 150,
				testedSampleCount: 1, // Min required: 3
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, false);
			assert.equal(result.isSamplingSufficient, false);
			assert.equal(result.statusBadgeText, "БРАК: МАЛАЯ ВЫБОРКА");
			assert.ok(result.rejectionReasons.some((r) => r.includes("Недостаточный объем выборки")));
		});
	});

	describe("5. Statutory A4 Landscape Print Generator for Rospotrebnadzor (Form № 366/у)", () => {
		it("generates comprehensive clean print document without errors", () => {
			const printParams: PsoPrintDocumentParams = {
				clinicName: "ООО «Стоматологический Центр ДЕНТЕ»",
				clinicAddress: "г. Москва, ул. Клиническая, д. 12",
				ogrn: "1127746123456",
				inn: "7701987654",
				licenseInfo: "ЛО-77-01-019876 от 15.03.2021 г.",
				chiefDoctorFullName: "Д-р Иванов И.И.",
				headNurseFullName: "Петрова А.В.",
				dateRangeTextRu: "Август 2026 г.",
				records: [
					{
						id: "test-rec-1",
						timestamp: "2026-08-25T09:00:00.000Z",
						instrumentName: "Стоматологические боры и наконечники",
						batchItemCount: 120,
						testedSampleCount: 3,
						reagentLot: "АЗО-2026/08-114",
						solutionTimeRu: "08:45",
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						detergentBrand: "Биолот 0.5% + Аламинол 1%",
						isBatchApproved: true,
						operatorStaffFullName: "Сидорова Е.С.",
						operatorStaffPosition: "Медсестра ЦСО",
						electronicStampVerified: true,
						notes: "Норма",
					},
					{
						id: "test-rec-2",
						timestamp: "2026-08-25T14:30:00.000Z",
						instrumentName: "Щипцы хирургические и элеваторы",
						batchItemCount: 40,
						testedSampleCount: 5,
						reagentLot: "АЗО-2026/08-114",
						solutionTimeRu: "14:15",
						isAzopyramNegative: false,
						isPhenolphthaleinNegative: true,
						detergentBrand: "Биолот 0.5%",
						isBatchApproved: false,
						rejectionReason: "Обнаружена скрытая кровь",
						operatorStaffFullName: "Сидорова Е.С.",
						operatorStaffPosition: "Медсестра ЦСО",
						electronicStampVerified: false,
						notes: "100% партии отправлено на повторную обработку",
					},
				],
			};

			const html = generateStatutoryPsoForm366PrintHtml(printParams);

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Форма № 366/у"));
			assert.ok(html.includes("ООО «Стоматологический Центр ДЕНТЕ»"));
			assert.ok(html.includes("7701987654"));
			assert.ok(html.includes("Стоматологические боры и наконечники"));
			assert.ok(html.includes("Щипцы хирургические и элеваторы"));
			assert.ok(html.includes("Допущено"));
			assert.ok(html.includes("БРАК"));
			assert.ok(html.includes("size: A4 landscape"));
		});
	});

	describe("6. Autoclaving & Sterilizer Regimes Invariants (Form № 257/у)", () => {
		it("contains steam, dry heat, and glassperlen sterilizer options", () => {
			assert.ok(STATUTORY_REGIMES_OPTIONS.length >= 4);

			const steam134 = STATUTORY_REGIMES_OPTIONS.find((r) => r.id === "steam_134_5min");
			assert.ok(steam134);
			assert.equal(steam134.targetTemperature, 134);
			assert.equal(steam134.targetPressure, 2.1);
			assert.equal(steam134.exposureMinutes, 5);
			assert.equal(steam134.indicatorClass, "class_5_integrator");

			const dryHeat = STATUTORY_REGIMES_OPTIONS.find((r) => r.id === "dry_heat_180_60min");
			assert.ok(dryHeat);
			assert.equal(dryHeat.targetTemperature, 180);
			assert.equal(dryHeat.exposureMinutes, 60);

			const glassperlen = STATUTORY_REGIMES_OPTIONS.find((r) => r.id === "glassperlen_240_20sec");
			assert.ok(glassperlen);
			assert.equal(glassperlen.targetTemperature, 240);
			assert.equal(glassperlen.category, "glassperlen_bead");
		});

		it("contains statutory packaging presets with exact shelf-life days", () => {
			assert.ok(STATUTORY_PACKAGING_PRESETS.length >= 4);

			const selfAdhesive = STATUTORY_PACKAGING_PRESETS.find((p) => p.id === "kraft_self_adhesive");
			assert.ok(selfAdhesive);
			assert.equal(selfAdhesive.shelfLifeDays, 50);

			const doubleHeatSeal = STATUTORY_PACKAGING_PRESETS.find((p) => p.id === "laminated_heat_seal_double");
			assert.ok(doubleHeatSeal);
			assert.equal(doubleHeatSeal.shelfLifeDays, 365);
		});

		it("contains 5 internal chamber test points KT-1 through KT-5", () => {
			assert.equal(INITIAL_5_POINTS.length, 5);
			const first = INITIAL_5_POINTS[0];
			const last = INITIAL_5_POINTS[4];
			assert.ok(first);
			assert.ok(last);
			assert.equal(first.code, "КТ-1");
			assert.equal(last.code, "КТ-5");
		});
	});
});
