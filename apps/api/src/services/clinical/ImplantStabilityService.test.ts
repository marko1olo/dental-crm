/**
 * ImplantStabilityService.test.ts — Модульные тесты для сервиса анализа стабильности
 * имплантатов методом частотно-резонансного анализа (RFA/ISQ) и трекинга остеоинтеграции.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FDI_PERMANENT_TEETH,
	ImplantMeasurementRecord,
	ImplantStabilityService,
	ImplantStabilityValidationError,
} from "./ImplantStabilityService.js";

describe("ImplantStabilityService — Feature #92 ISQ Stability & Osseointegration", () => {
	describe("1. FDI Tooth Number Validation & Jaw Localization", () => {
		it("validates all 32 permanent teeth (11-18, 21-28, 31-38, 41-48)", () => {
			for (const tooth of FDI_PERMANENT_TEETH) {
				assert.equal(ImplantStabilityService.validateToothNumber(tooth), tooth);
				assert.equal(ImplantStabilityService.validateToothNumber(String(tooth)), tooth);
			}
		});

		it("correctly determines maxilla vs mandible", () => {
			// Maxilla (Quadrants 1 & 2)
			assert.equal(ImplantStabilityService.getJawLocation(16), "maxilla");
			assert.equal(ImplantStabilityService.getJawLocation(11), "maxilla");
			assert.equal(ImplantStabilityService.getJawLocation(24), "maxilla");
			assert.equal(ImplantStabilityService.getJawLocation(27), "maxilla");

			// Mandible (Quadrants 3 & 4)
			assert.equal(ImplantStabilityService.getJawLocation(36), "mandible");
			assert.equal(ImplantStabilityService.getJawLocation(31), "mandible");
			assert.equal(ImplantStabilityService.getJawLocation(45), "mandible");
			assert.equal(ImplantStabilityService.getJawLocation(47), "mandible");
		});

		it("throws ImplantStabilityValidationError for invalid tooth numbers", () => {
			const invalidTeeth = [0, 9, 19, 29, 39, 49, 51, 65, 99, -1, NaN];
			for (const invalid of invalidTeeth) {
				assert.throws(
					() => ImplantStabilityService.validateToothNumber(invalid),
					(err) => {
						assert(err instanceof ImplantStabilityValidationError);
						assert.equal(err.field, "toothNumber");
						assert.equal(err.code, "INVALID_FDI_TOOTH");
						return true;
					},
				);
			}
		});
	});

	describe("2. ISQ Value & Directional Validation", () => {
		it("validates single ISQ values within 1..100 range", () => {
			assert.equal(ImplantStabilityService.validateSingleISQ(1, "test"), 1);
			assert.equal(ImplantStabilityService.validateSingleISQ(75, "test"), 75);
			assert.equal(ImplantStabilityService.validateSingleISQ(100, "test"), 100);
			assert.equal(ImplantStabilityService.validateSingleISQ("68.5", "test"), 68.5);
		});

		it("throws error for out-of-range or invalid ISQ numbers", () => {
			const outOfBounds = [0, -5, 101, 150];
			for (const val of outOfBounds) {
				assert.throws(
					() => ImplantStabilityService.validateSingleISQ(val, "mesial"),
					(err) => {
						assert(err instanceof ImplantStabilityValidationError);
						assert.equal(err.code, "ISQ_OUT_OF_RANGE");
						return true;
					},
				);
			}

			const invalidTypes = [NaN, Infinity, "invalid", null, undefined];
			for (const val of invalidTypes) {
				assert.throws(
					() => ImplantStabilityService.validateSingleISQ(val, "distal"),
					(err) => {
						assert(err instanceof ImplantStabilityValidationError);
						return true;
					},
				);
			}
		});

		it("validates directional object with 4 directions", () => {
			const res = ImplantStabilityService.validateDirectionalISQ({
				mesial: 72,
				distal: 74,
				buccal: 70,
				lingual: 76,
			});

			assert.deepEqual(res, {
				mesial: 72,
				distal: 74,
				buccal: 70,
				lingual: 76,
			});
		});

		it("accepts partial directional measurements if at least one direction is provided", () => {
			const res = ImplantStabilityService.validateDirectionalISQ({
				mesial: 68,
				lingual: 70,
			});

			assert.deepEqual(res, {
				mesial: 68,
				distal: null,
				buccal: null,
				lingual: 70,
			});
		});

		it("throws error if all directions are empty", () => {
			assert.throws(
				() => ImplantStabilityService.validateDirectionalISQ({}),
				(err) => {
					assert(err instanceof ImplantStabilityValidationError);
					assert.equal(err.code, "NO_VALID_DIRECTIONS");
					return true;
				},
			);
		});
	});

	describe("3. Directional Statistics & Anisotropy Calculation", () => {
		it("calculates mean, min, max, anisotropy and directional extremes accurately", () => {
			const stats = ImplantStabilityService.calculateStatistics({
				mesial: 70,
				distal: 74,
				buccal: 66,
				lingual: 78,
			});

			// Mean = (70 + 74 + 66 + 78) / 4 = 288 / 4 = 72.0
			assert.equal(stats.averageISQ, 72.0);
			assert.equal(stats.minISQ, 66);
			assert.equal(stats.maxISQ, 78);
			assert.equal(stats.anisotropy, 12); // 78 - 66
			assert.equal(stats.measuredDirectionsCount, 4);
			assert.equal(stats.weakestDirection, "buccal");
			assert.equal(stats.strongestDirection, "lingual");
			assert.equal(stats.hasCriticalDirectionalWeakness, false);
		});

		it("flags critical directional weakness when minISQ < 50", () => {
			const stats = ImplantStabilityService.calculateStatistics({
				mesial: 65,
				distal: 62,
				buccal: 44, // Critical weakness on buccal wall
				lingual: 68,
			});

			assert.equal(stats.minISQ, 44);
			assert.equal(stats.weakestDirection, "buccal");
			assert.equal(stats.hasCriticalDirectionalWeakness, true);
			assert.equal(stats.anisotropy, 24); // 68 - 44
		});

		it("works for single direction measurement", () => {
			const stats = ImplantStabilityService.calculateStatistics({
				buccal: 75,
			});

			assert.equal(stats.averageISQ, 75);
			assert.equal(stats.minISQ, 75);
			assert.equal(stats.maxISQ, 75);
			assert.equal(stats.anisotropy, 0);
			assert.equal(stats.measuredDirectionsCount, 1);
			assert.equal(stats.weakestDirection, "buccal");
			assert.equal(stats.strongestDirection, "buccal");
		});
	});

	describe("4. Clinical Loading Protocol Determination", () => {
		describe("4.1 Immediate Loading Protocol (ISQ >= 70)", () => {
			it("recommends immediate loading when ISQ >= 70 with adequate insertion torque", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(72, {
					toothNumber: 46,
					insertionTorqueNcm: 45,
				});

				assert.equal(rec.protocol, "immediate_loading");
				assert.equal(rec.titleRu, "Немедленная нагрузка (Immediate loading)");
				assert.equal(rec.isImmediateEligible, true);
				assert.equal(rec.isEarlyEligible, true);
				assert.equal(rec.minRecommendedTorqueNcm, 35);
			});

			it("recommends immediate loading at boundary ISQ = 70.0", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(70.0, {
					toothNumber: 36,
					insertionTorqueNcm: 40,
				});

				assert.equal(rec.protocol, "immediate_loading");
				assert.equal(rec.isImmediateEligible, true);
			});

			it("warns and disables immediate eligibility if insertion torque is below 35 Ncm", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(75, {
					toothNumber: 11,
					insertionTorqueNcm: 20, // Low torque despite high ISQ
				});

				assert.equal(rec.protocol, "immediate_loading");
				assert.equal(rec.isImmediateEligible, false);
				assert(rec.safetyWarningsRu.some((w) => w.includes("Торк введения (20 Н·см) ниже рекомендуемого")));
			});

			it("contraindicates immediate loading in presence of bruxism/parafunction", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(78, {
					toothNumber: 46,
					insertionTorqueNcm: 50,
					isParafunctionPresent: true,
				});

				assert.equal(rec.protocol, "immediate_loading");
				assert.equal(rec.isImmediateEligible, false);
				assert(rec.contraindicationsRu.some((c) => c.includes("Бруксизм")));
			});
		});

		describe("4.2 Early Loading Protocol (65 <= ISQ < 70)", () => {
			it("recommends early loading when ISQ is 68", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(68, {
					toothNumber: 36,
					insertionTorqueNcm: 30,
				});

				assert.equal(rec.protocol, "early_loading");
				assert.equal(rec.titleRu, "Ранняя нагрузка (Early loading, 4–6 недель)");
				assert.equal(rec.isImmediateEligible, false);
				assert.equal(rec.isEarlyEligible, true);
				assert.equal(rec.recommendedPeriodRu, "4–6 недель");
			});

			it("recommends early loading at boundary ISQ = 65.0", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(65.0, {
					toothNumber: 46,
				});

				assert.equal(rec.protocol, "early_loading");
				assert.equal(rec.isEarlyEligible, true);
			});

			it("recommends 6-8 weeks for early loading on maxilla", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(67, {
					toothNumber: 16, // Maxilla
				});

				assert.equal(rec.protocol, "early_loading");
				assert.equal(rec.recommendedPeriodRu, "6–8 недель");
			});
		});

		describe("4.3 Conventional Delayed Loading Protocol (ISQ < 65)", () => {
			it("recommends conventional delayed loading for ISQ = 64.9", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(64.9, {
					toothNumber: 46,
				});

				assert.equal(rec.protocol, "conventional_delayed_loading");
				assert.equal(rec.titleRu, "Традиционная отсроченная нагрузка (Conventional delayed loading, 3–6 месяцев)");
				assert.equal(rec.isImmediateEligible, false);
				assert.equal(rec.isEarlyEligible, false);
				assert.equal(rec.recommendedPeriodRu, "2–3 месяца"); // Mandible
			});

			it("recommends 4-6 months for conventional delayed loading on maxilla", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(60, {
					toothNumber: 26, // Maxilla
				});

				assert.equal(rec.protocol, "conventional_delayed_loading");
				assert.equal(rec.recommendedPeriodRu, "4–6 месяцев");
			});

			it("warns about critical low stability when ISQ < 50", () => {
				const rec = ImplantStabilityService.determineLoadingProtocol(42, {
					toothNumber: 14,
				});

				assert.equal(rec.protocol, "conventional_delayed_loading");
				assert(rec.safetyWarningsRu.some((w) => w.includes("Критически низкий ISQ (< 50)")));
			});
		});
	});

	describe("5. Osseointegration Dynamics & Desintegration Detection", () => {
		const baseDate = new Date("2026-08-01T10:00:00Z");

		it("identifies Progressive Osseointegration (delta >= +3.0)", () => {
			const prev: ImplantMeasurementRecord = {
				id: "meas-1",
				toothNumber: 36,
				measuredAt: baseDate,
				stage: "placement",
				directions: { mesial: 66, distal: 65, buccal: 64, lingual: 65 }, // avg = 65
			};

			const currDate = new Date("2026-09-15T10:00:00Z"); // +45 days
			const curr: ImplantMeasurementRecord = {
				id: "meas-2",
				toothNumber: 36,
				measuredAt: currDate,
				stage: "uncovery",
				directions: { mesial: 76, distal: 75, buccal: 74, lingual: 75 }, // avg = 75
			};

			const dynamics = ImplantStabilityService.evaluateOsseointegrationDynamics(prev, curr);

			assert.equal(dynamics.deltaISQ, 10.0);
			assert.equal(dynamics.isDesintegrationRisk, false);
			assert.equal(dynamics.status, "progressive_osseointegration");
			assert.equal(dynamics.statusTitleRu, "Прогрессирующая остеоинтеграция");
			assert.equal(dynamics.requiresImmediateUnloading, false);
			assert.equal(dynamics.requiresCbctScan, false);
			assert.equal(dynamics.daysElapsed, 45);
		});

		it("identifies Stable State (delta between -1.0 and +2.9)", () => {
			const prev = {
				id: "meas-1",
				averageISQ: 74,
				measuredAt: baseDate,
			};
			const curr = {
				id: "meas-2",
				averageISQ: 75,
				measuredAt: new Date("2026-08-30T10:00:00Z"),
			};

			const dynamics = ImplantStabilityService.evaluateOsseointegrationDynamics(prev, curr);

			assert.equal(dynamics.deltaISQ, 1.0);
			assert.equal(dynamics.isDesintegrationRisk, false);
			assert.equal(dynamics.status, "stable_integration");
		});

		it("identifies Physiological Remodeling Dip during weeks 2–4 (delta from -1.0 to -5.0)", () => {
			const prev = {
				id: "meas-1",
				averageISQ: 72,
				measuredAt: baseDate,
			};
			const curr = {
				id: "meas-2",
				averageISQ: 68, // -4 ISQ dip
				measuredAt: new Date("2026-08-22T10:00:00Z"), // +21 days (3 weeks)
			};

			const dynamics = ImplantStabilityService.evaluateOsseointegrationDynamics(prev, curr);

			assert.equal(dynamics.deltaISQ, -4.0);
			assert.equal(dynamics.isDesintegrationRisk, false);
			assert.equal(dynamics.status, "physiological_dip");
			assert.equal(dynamics.statusTitleRu, "Физиологический спад первичной стабильности (Remodeling Dip)");
			assert.equal(dynamics.requiresImmediateUnloading, false);
		});

		it("CRITICAL: Detects Desintegration Risk when ISQ drops by MORE THAN 5 units (delta < -5)", () => {
			const prev: ImplantMeasurementRecord = {
				id: "meas-1",
				toothNumber: 46,
				measuredAt: baseDate,
				stage: "placement",
				directions: { mesial: 75, distal: 74, buccal: 72, lingual: 75 }, // avg = 74.0
			};

			const currDate = new Date("2026-08-25T10:00:00Z"); // +24 days
			const curr: ImplantMeasurementRecord = {
				id: "meas-2",
				toothNumber: 46,
				measuredAt: currDate,
				stage: "uncovery",
				directions: { mesial: 68, distal: 66, buccal: 60, lingual: 66 }, // avg = 65.0 -> drop of 9 units!
			};

			const dynamics = ImplantStabilityService.evaluateOsseointegrationDynamics(prev, curr);

			assert.equal(dynamics.deltaISQ, -9.0);
			assert.equal(dynamics.isDesintegrationRisk, true);
			assert.equal(dynamics.status, "desintegration_suspected");
			assert.equal(dynamics.statusTitleRu, "Угроза дезинтеграции имплантата (Падение ISQ > 5 единиц)");
			assert.equal(dynamics.requiresImmediateUnloading, true);
			assert.equal(dynamics.requiresCbctScan, true);
			assert(dynamics.actionProtocolRu.some((a) => a.includes("Немедленная полная разгрузка имплантата")));
			assert(dynamics.actionProtocolRu.some((a) => a.includes("прицельной рентгенографии и КЛКТ")));
		});

		it("CRITICAL: Triggers desintegration risk at exact drop of 5.1 units", () => {
			const prev = { id: "m1", averageISQ: 70.0, measuredAt: baseDate };
			const curr = { id: "m2", averageISQ: 64.9, measuredAt: new Date("2026-08-20T10:00:00Z") }; // delta = -5.1

			const dynamics = ImplantStabilityService.evaluateOsseointegrationDynamics(prev, curr);

			assert.equal(dynamics.deltaISQ, -5.1);
			assert.equal(dynamics.isDesintegrationRisk, true);
			assert.equal(dynamics.status, "desintegration_suspected");
		});

		it("tracks directional deltas accurately to detect localized bone loss", () => {
			const prev: ImplantMeasurementRecord = {
				id: "meas-1",
				toothNumber: 21,
				measuredAt: baseDate,
				stage: "placement",
				directions: { mesial: 72, distal: 72, buccal: 70, lingual: 74 },
			};
			const curr: ImplantMeasurementRecord = {
				id: "meas-2",
				toothNumber: 21,
				measuredAt: new Date("2026-09-01T10:00:00Z"),
				stage: "uncovery",
				directions: { mesial: 74, distal: 73, buccal: 58, lingual: 75 }, // buccal dropped by -12!
			};

			const dynamics = ImplantStabilityService.evaluateOsseointegrationDynamics(prev, curr);

			assert.deepEqual(dynamics.directionalDeltas, {
				mesial: 2.0,
				distal: 1.0,
				buccal: -12.0, // Significant buccal fenestration/resorption
				lingual: 1.0,
			});
		});
	});

	describe("6. Stability Trajectory & Multi-Point Analysis", () => {
		it("analyzes typical successful implant trajectory (Placement -> Dip -> Secondary Stability -> Prosthetics)", () => {
			const records: ImplantMeasurementRecord[] = [
				{
					id: "rec-1",
					toothNumber: 46,
					measuredAt: new Date("2026-05-01"),
					stage: "placement",
					directions: { mesial: 70, distal: 70, buccal: 68, lingual: 72 }, // avg 70
					insertionTorqueNcm: 40,
					boneDensity: "D2",
				},
				{
					id: "rec-2",
					toothNumber: 46,
					measuredAt: new Date("2026-05-21"), // Week 3
					stage: "placement",
					directions: { mesial: 66, distal: 66, buccal: 64, lingual: 68 }, // avg 66 (dip)
				},
				{
					id: "rec-3",
					toothNumber: 46,
					measuredAt: new Date("2026-07-01"), // Week 8
					stage: "uncovery",
					directions: { mesial: 78, distal: 78, buccal: 76, lingual: 80 }, // avg 78
				},
				{
					id: "rec-4",
					toothNumber: 46,
					measuredAt: new Date("2026-08-01"), // Loading
					stage: "loading",
					directions: { mesial: 80, distal: 80, buccal: 78, lingual: 82 }, // avg 80
				},
			];

			const trajectory = ImplantStabilityService.analyzeStabilityTrajectory(records);

			assert.equal(trajectory.baselineISQ, 70);
			assert.equal(trajectory.latestISQ, 80);
			assert.equal(trajectory.totalDeltaISQ, 10);
			assert.equal(trajectory.minObservedISQ, 66);
			assert.equal(trajectory.maxObservedISQ, 80);
			assert.equal(trajectory.hasRemodelingDipOccurred, true);
			assert.equal(trajectory.hasAnyDesintegrationAlarm, false);
			assert.equal(trajectory.measurementsEvaluated, 4);
			assert(trajectory.trajectorySummaryRu.includes("Выраженный прирост стабильности (+10 ед. ISQ"));
		});

		it("flags trajectory with desintegration alarm", () => {
			const records: ImplantMeasurementRecord[] = [
				{
					id: "rec-1",
					toothNumber: 16,
					measuredAt: new Date("2026-05-01"),
					stage: "placement",
					directions: { mesial: 74, distal: 74, buccal: 72, lingual: 76 }, // avg 74
				},
				{
					id: "rec-2",
					toothNumber: 16,
					measuredAt: new Date("2026-06-01"),
					stage: "uncovery",
					directions: { mesial: 62, distal: 60, buccal: 58, lingual: 64 }, // avg 61 (drop of 13!)
				},
			];

			const trajectory = ImplantStabilityService.analyzeStabilityTrajectory(records);

			assert.equal(trajectory.hasAnyDesintegrationAlarm, true);
			assert(trajectory.trajectorySummaryRu.includes("критический эпизод падения ISQ > 5 ед"));
		});
	});

	describe("7. Clinical 043/y Report & EMR Integration", () => {
		it("generates comprehensive clinical report and formatted EMR entry", () => {
			const report = ImplantStabilityService.generateClinicalStabilityReport({
				toothNumber: 36,
				measurements: [
					{
						id: "m-1",
						toothNumber: 36,
						measuredAt: new Date("2026-06-01T10:00:00Z"),
						stage: "placement",
						directions: { mesial: 68, distal: 68, buccal: 66, lingual: 70 },
						insertionTorqueNcm: 35,
						boneDensity: "D2",
						deviceModel: "Osstell Beacon",
					},
					{
						id: "m-2",
						toothNumber: 36,
						measuredAt: new Date("2026-08-01T10:00:00Z"),
						stage: "uncovery",
						directions: { mesial: 76, distal: 76, buccal: 74, lingual: 78 },
						insertionTorqueNcm: 35,
						boneDensity: "D2",
						deviceModel: "Osstell Beacon",
					},
				],
			});

			assert.equal(report.toothNumber, 36);
			assert.equal(report.jaw, "mandible");
			assert.equal(report.latestStatistics.averageISQ, 76);
			assert.equal(report.recommendedProtocol.protocol, "immediate_loading");
			assert.equal(report.dynamics?.deltaISQ, 8);
			assert.equal(report.dynamics?.status, "progressive_osseointegration");
			assert.equal(report.measurementsCount, 2);

			// EMR Entry formatting check
			assert(report.emrEntryTextRu.includes("Протокол RFA/ISQ-стабильности"));
			assert(report.emrEntryTextRu.includes("зуба 36 (Нижняя челюсть)"));
			assert(report.emrEntryTextRu.includes("Средний ISQ: 76"));
			assert(report.emrEntryTextRu.includes("Прогрессирующая остеоинтеграция"));
		});
	});
});
