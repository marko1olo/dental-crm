/**
 * wave126SupplierRatings.test.ts — Unit Tests for Supplier Ratings & Reliability Engine.
 *
 * Wave 126 — Domain: Inventory & Logistics (DentalPin Supplier Ratings Reverse-Engineering).
 *
 * Test coverage:
 * 1. Re-exports & Architectural Integrity:
 *    - All schemas, types, and engine functions exported from inventory/index.ts and shared/index.ts.
 * 2. On-Time Delivery Rate (computeOnTimeRate):
 *    - 10 of 10 = 100%
 *    - 8 of 10 = 80%
 *    - 0 of 10 = 0%
 *    - Division by zero / 0 due dates returns null
 *    - Boundary and clamping safety
 * 3. Defect / Reject Rate (computeRejectRate):
 *    - 0 defective carpules of 1000 = 0%
 *    - 5 defective units of 100 = 5%
 *    - 15 defective units of 100 = 15%
 *    - Division by zero / 0 received units returns null
 * 4. Composite Scoring (computeCompositeScore):
 *    - 40% on-time + 40% absence of defects + 20% manual score
 *    - Normalization when manual score is omitted (50% on-time + 50% quality)
 *    - Unrated new vendor fallback
 * 5. Reliability Status Classification (determineReliabilityStatus):
 *    - preferred (score >= 4.5, reject <= 2%)
 *    - acceptable (score >= 3.5, reject < 5%)
 *    - at_risk (score >= 2.5, reject < 10%)
 *    - blocked (score < 2.5 OR reject >= 10%)
 * 6. Official A4 Audit Protocol (formatSupplierReliabilityA4):
 *    - Generates statutory Russian audit sheet
 *    - Strictly 0 emojis in compliance with Mandate 8d item 7
 * 7. Zod Schema Validation Integrity:
 *    - Validates compliant metrics, evaluations, and summaries
 *    - Rejects invalid scores and negative numbers
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildSupplierRatingSummary,
	computeCompositeScore,
	computeOnTimeRate,
	computeRejectRate,
	determineReliabilityStatus,
	formatSupplierReliabilityA4,
	RELIABILITY_STATUS_LABELS_RU,
	reliabilityStatusSchema,
	supplierEvaluationSchema,
	supplierRatingMetricsSchema,
	supplierRatingSummarySchema,
	type ReliabilityStatus,
	type SupplierEvaluation,
	type SupplierRatingMetrics,
	type SupplierRatingSummary,
} from "../supplierRatingsEngine.js";
import {
	buildSupplierRatingSummary as buildFromInventoryIndex,
	computeCompositeScore as computeCompositeFromInventoryIndex,
	computeOnTimeRate as computeOnTimeFromInventoryIndex,
	computeRejectRate as computeRejectFromInventoryIndex,
	determineReliabilityStatus as determineStatusFromInventoryIndex,
	formatSupplierReliabilityA4 as formatA4FromInventoryIndex,
	RELIABILITY_STATUS_LABELS_RU as LABELS_FROM_INV_INDEX,
	reliabilityStatusSchema as statusSchemaFromInventoryIndex,
	supplierEvaluationSchema as evalSchemaFromInventoryIndex,
	supplierRatingMetricsSchema as metricsSchemaFromInventoryIndex,
	supplierRatingSummarySchema as summarySchemaFromInventoryIndex,
} from "../index.js";
import {
	buildSupplierRatingSummary as buildFromRootIndex,
	computeCompositeScore as computeCompositeFromRootIndex,
	computeOnTimeRate as computeOnTimeFromRootIndex,
	computeRejectRate as computeRejectFromRootIndex,
	determineReliabilityStatus as determineStatusFromRootIndex,
	formatSupplierReliabilityA4 as formatA4FromRootIndex,
	RELIABILITY_STATUS_LABELS_RU as LABELS_FROM_ROOT_INDEX,
	reliabilityStatusSchema as statusSchemaFromRootIndex,
	supplierEvaluationSchema as evalSchemaFromRootIndex,
	supplierRatingMetricsSchema as metricsSchemaFromRootIndex,
	supplierRatingSummarySchema as summarySchemaFromRootIndex,
} from "../../index.js";

describe("Wave 126: Supplier Ratings & Reliability Engine", () => {
	describe("1. Re-exports & Architectural Parity", () => {
		it("re-exports all functions and schemas identically from inventory/index.ts", () => {
			assert.equal(computeOnTimeRate, computeOnTimeFromInventoryIndex);
			assert.equal(computeRejectRate, computeRejectFromInventoryIndex);
			assert.equal(computeCompositeScore, computeCompositeFromInventoryIndex);
			assert.equal(determineReliabilityStatus, determineStatusFromInventoryIndex);
			assert.equal(buildSupplierRatingSummary, buildFromInventoryIndex);
			assert.equal(formatSupplierReliabilityA4, formatA4FromInventoryIndex);
			assert.equal(reliabilityStatusSchema, statusSchemaFromInventoryIndex);
			assert.equal(supplierRatingMetricsSchema, metricsSchemaFromInventoryIndex);
			assert.equal(supplierEvaluationSchema, evalSchemaFromInventoryIndex);
			assert.equal(supplierRatingSummarySchema, summarySchemaFromInventoryIndex);
			assert.deepEqual(RELIABILITY_STATUS_LABELS_RU, LABELS_FROM_INV_INDEX);
		});

		it("re-exports all functions and schemas identically from @dental/shared root index", () => {
			assert.equal(computeOnTimeRate, computeOnTimeFromRootIndex);
			assert.equal(computeRejectRate, computeRejectFromRootIndex);
			assert.equal(computeCompositeScore, computeCompositeFromRootIndex);
			assert.equal(determineReliabilityStatus, determineStatusFromRootIndex);
			assert.equal(buildSupplierRatingSummary, buildFromRootIndex);
			assert.equal(formatSupplierReliabilityA4, formatA4FromRootIndex);
			assert.equal(reliabilityStatusSchema, statusSchemaFromRootIndex);
			assert.equal(supplierRatingMetricsSchema, metricsSchemaFromRootIndex);
			assert.equal(supplierEvaluationSchema, evalSchemaFromRootIndex);
			assert.equal(supplierRatingSummarySchema, summarySchemaFromRootIndex);
			assert.deepEqual(RELIABILITY_STATUS_LABELS_RU, LABELS_FROM_ROOT_INDEX);
		});

		it("defines correct Russian status labels", () => {
			assert.equal(RELIABILITY_STATUS_LABELS_RU.preferred, "Приоритетный поставщик");
			assert.equal(RELIABILITY_STATUS_LABELS_RU.acceptable, "Надежный поставщик");
			assert.equal(RELIABILITY_STATUS_LABELS_RU.at_risk, "Зона риска");
			assert.equal(RELIABILITY_STATUS_LABELS_RU.blocked, "Заблокирован");
		});
	});

	describe("2. On-Time Delivery Rate (computeOnTimeRate)", () => {
		it("calculates 100% when 10 out of 10 deliveries are on time", () => {
			const rate = computeOnTimeRate(10, 10);
			assert.equal(rate, 100);
		});

		it("calculates 80% when 8 out of 10 deliveries are on time", () => {
			const rate = computeOnTimeRate(8, 10);
			assert.equal(rate, 80);
		});

		it("calculates 0% when 0 out of 10 deliveries are on time", () => {
			const rate = computeOnTimeRate(0, 10);
			assert.equal(rate, 0);
		});

		it("rounds percentage to 2 decimal places (e.g. 1 out of 3 = 33.33%)", () => {
			const rate = computeOnTimeRate(1, 3);
			assert.equal(rate, 33.33);
		});

		it("returns null when receivedWithDueDate is 0 (division by zero safety)", () => {
			assert.equal(computeOnTimeRate(0, 0), null);
			assert.equal(computeOnTimeRate(5, 0), null);
			assert.equal(computeOnTimeRate(0, -1), null);
		});

		it("clamps onTimeDeliveries so it does not exceed receivedWithDueDate", () => {
			const rate = computeOnTimeRate(12, 10);
			assert.equal(rate, 100);
		});

		it("clamps negative onTimeDeliveries to 0", () => {
			const rate = computeOnTimeRate(-3, 10);
			assert.equal(rate, 0);
		});
	});

	describe("3. Defect & Reject Rate (computeRejectRate)", () => {
		it("calculates 0% defect rate when 0 out of 1000 carpules are rejected", () => {
			const rate = computeRejectRate(0, 1000);
			assert.equal(rate, 0);
		});

		it("calculates 5% defect rate when 5 out of 100 carpules are defective", () => {
			const rate = computeRejectRate(5, 100);
			assert.equal(rate, 5);
		});

		it("calculates 15% defect rate when 15 out of 100 boxes of gloves are rejected", () => {
			const rate = computeRejectRate(15, 100);
			assert.equal(rate, 15);
		});

		it("rounds percentage to 2 decimal places (e.g. 2 out of 700 = 0.29%)", () => {
			const rate = computeRejectRate(2, 700);
			assert.equal(rate, 0.29);
		});

		it("returns null when receivedQuantity is 0 (division by zero safety)", () => {
			assert.equal(computeRejectRate(0, 0), null);
			assert.equal(computeRejectRate(10, 0), null);
			assert.equal(computeRejectRate(0, -10), null);
		});

		it("clamps rejectedQuantity so it does not exceed receivedQuantity", () => {
			const rate = computeRejectRate(120, 100);
			assert.equal(rate, 100);
		});

		it("clamps negative rejectedQuantity to 0", () => {
			const rate = computeRejectRate(-5, 100);
			assert.equal(rate, 0);
		});
	});

	describe("4. Composite Reliability Score (computeCompositeScore)", () => {
		it("calculates 5.0 for flawless supplier (100% on-time, 0% reject, manual 5)", () => {
			const metrics: SupplierRatingMetrics = {
				poCount: 10,
				receivedCount: 10,
				receivedWithDueDate: 10,
				onTimeDeliveries: 10,
				onTimeRatePct: 100,
				receivedQuantity: 500,
				rejectedQuantity: 0,
				rejectRatePct: 0,
			};
			const score = computeCompositeScore(metrics, 5);
			assert.equal(score, 5.0);
		});

		it("applies 40% on-time + 40% quality + 20% manual weights accurately", () => {
			// On-time: 80% -> score = 1.0 + 0.8 * 4.0 = 4.20
			// Reject: 0% -> quality = 100% -> score = 5.00
			// Manual: 4
			// Weighted: 4.20 * 0.40 + 5.00 * 0.40 + 4.00 * 0.20 = 1.68 + 2.00 + 0.80 = 4.48
			const metrics: SupplierRatingMetrics = {
				poCount: 10,
				receivedCount: 10,
				receivedWithDueDate: 10,
				onTimeDeliveries: 8,
				onTimeRatePct: 80,
				receivedQuantity: 200,
				rejectedQuantity: 0,
				rejectRatePct: 0,
			};
			const score = computeCompositeScore(metrics, 4);
			assert.equal(score, 4.48);
		});

		it("calculates score with defect rate impact (e.g. 5% defect rate)", () => {
			// On-time: 100% -> onTimeScore = 5.00
			// Reject: 5% -> quality = 95% -> qualityScore = 1.0 + 0.95 * 4.0 = 4.80
			// Manual: 5
			// Weighted: 5.00 * 0.40 + 4.80 * 0.40 + 5.00 * 0.20 = 2.00 + 1.92 + 1.00 = 4.92
			const metrics: SupplierRatingMetrics = {
				poCount: 12,
				receivedCount: 12,
				receivedWithDueDate: 12,
				onTimeDeliveries: 12,
				onTimeRatePct: 100,
				receivedQuantity: 1000,
				rejectedQuantity: 50,
				rejectRatePct: 5,
			};
			const score = computeCompositeScore(metrics, 5);
			assert.equal(score, 4.92);
		});

		it("normalizes weights to 50% on-time + 50% quality when manual score is omitted", () => {
			// On-time: 100% -> 5.00
			// Reject: 0% -> 5.00
			// Composite: 5.00 * 0.50 + 5.00 * 0.50 = 5.00
			const metrics: SupplierRatingMetrics = {
				poCount: 5,
				receivedCount: 5,
				receivedWithDueDate: 5,
				onTimeDeliveries: 5,
				onTimeRatePct: 100,
				receivedQuantity: 300,
				rejectedQuantity: 0,
				rejectRatePct: 0,
			};
			const score = computeCompositeScore(metrics);
			assert.equal(score, 5.0);
		});

		it("handles poor supplier performance correctly (20% on-time, 25% defects, manual 1)", () => {
			// On-time: 20% -> 1.0 + 0.2 * 4.0 = 1.80
			// Reject: 25% -> quality 75% -> 1.0 + 0.75 * 4.0 = 4.00
			// Manual: 1 -> 1.00
			// Weighted: 1.80 * 0.40 + 4.00 * 0.40 + 1.00 * 0.20 = 0.72 + 1.60 + 0.20 = 2.52
			const metrics: SupplierRatingMetrics = {
				poCount: 5,
				receivedCount: 5,
				receivedWithDueDate: 5,
				onTimeDeliveries: 1,
				onTimeRatePct: 20,
				receivedQuantity: 100,
				rejectedQuantity: 25,
				rejectRatePct: 25,
			};
			const score = computeCompositeScore(metrics, 1);
			assert.equal(score, 2.52);
		});

		it("returns manual score or 3.0 when vendor has no delivery history (null metrics)", () => {
			const emptyMetrics: SupplierRatingMetrics = {
				poCount: 0,
				receivedCount: 0,
				receivedWithDueDate: 0,
				onTimeDeliveries: 0,
				onTimeRatePct: null,
				receivedQuantity: 0,
				rejectedQuantity: 0,
				rejectRatePct: null,
			};
			assert.equal(computeCompositeScore(emptyMetrics, 4), 4.0);
			assert.equal(computeCompositeScore(emptyMetrics), 3.0);
		});
	});

	describe("5. Reliability Status Classification (determineReliabilityStatus)", () => {
		it("assigns 'preferred' for high composite score and minimal defect rate", () => {
			// Score >= 4.5 and reject <= 2.0%
			assert.equal(determineReliabilityStatus(5.0, 0), "preferred");
			assert.equal(determineReliabilityStatus(4.8, 1.5), "preferred");
			assert.equal(determineReliabilityStatus(4.5, 2.0), "preferred");
		});

		it("assigns 'acceptable' for solid standard supplier", () => {
			// Score >= 3.5 and reject < 5.0%
			assert.equal(determineReliabilityStatus(4.4, 1.0), "acceptable");
			assert.equal(determineReliabilityStatus(3.8, 3.5), "acceptable");
			assert.equal(determineReliabilityStatus(3.5, 4.9), "acceptable");
			// Score >= 4.5 but reject between 2.1% and 4.9% (not preferred due to defect rate)
			assert.equal(determineReliabilityStatus(4.6, 3.0), "acceptable");
		});

		it("assigns 'at_risk' for elevated defect rate or sub-par score", () => {
			// Reject >= 5.0% and < 10.0% OR score in [2.5, 3.5)
			assert.equal(determineReliabilityStatus(3.2, 2.0), "at_risk");
			assert.equal(determineReliabilityStatus(3.8, 6.0), "at_risk");
			assert.equal(determineReliabilityStatus(2.7, 8.5), "at_risk");
		});

		it("assigns 'blocked' when score < 2.5 or defect rate >= 10%", () => {
			// Unacceptable composite score
			assert.equal(determineReliabilityStatus(2.2, 1.0), "blocked");
			assert.equal(determineReliabilityStatus(1.5, 0), "blocked");

			// Unacceptable defect rate (e.g. broken anesthetic carpules or non-sterile gloves)
			// Even with a high score of 4.9, 12% defects blocks the vendor for patient safety
			assert.equal(determineReliabilityStatus(4.9, 12.0), "blocked");
			assert.equal(determineReliabilityStatus(3.5, 10.0), "blocked");
			assert.equal(determineReliabilityStatus(2.0, 15.0), "blocked");
		});
	});

	describe("6. Helper buildSupplierRatingSummary", () => {
		it("builds a validated summary record", () => {
			const metrics: SupplierRatingMetrics = {
				poCount: 15,
				receivedCount: 15,
				receivedWithDueDate: 15,
				onTimeDeliveries: 15,
				onTimeRatePct: 100,
				receivedQuantity: 2500,
				rejectedQuantity: 5,
				rejectRatePct: 0.2,
			};

			const summary = buildSupplierRatingSummary({
				supplierId: "sup-001-septodont",
				supplierName: "ООО Септодонт Рус",
				metrics,
				manualScore: 5,
				comment: "Ведущий поставщик артикоиновых анестетиков. Претензий нет.",
				evaluatedAt: "2026-09-12T10:00:00.000Z",
			});

			assert.equal(summary.supplierId, "sup-001-septodont");
			assert.equal(summary.supplierName, "ООО Септодонт Рус");
			assert.equal(summary.compositeScore, 5.0);
			assert.equal(summary.evaluation.reliabilityStatus, "preferred");
			assert.equal(summary.evaluation.score, 5);
			assert.equal(summary.evaluation.comment, "Ведущий поставщик артикоиновых анестетиков. Претензий нет.");

			// Zod schema parsing passes without error
			const parsed = supplierRatingSummarySchema.parse(summary);
			assert.deepEqual(parsed, summary);
		});
	});

	describe("7. Statutory A4 Audit Protocol (formatSupplierReliabilityA4)", () => {
		it("formats complete Russian audit protocol for preferred vendor", () => {
			const metrics: SupplierRatingMetrics = {
				poCount: 20,
				receivedCount: 20,
				receivedWithDueDate: 20,
				onTimeDeliveries: 20,
				onTimeRatePct: 100,
				receivedQuantity: 5000,
				rejectedQuantity: 0,
				rejectRatePct: 0,
			};

			const summary: SupplierRatingSummary = {
				supplierId: "sup-stom-01",
				supplierName: "ООО Дентал Экспо Трейд",
				metrics,
				evaluation: {
					score: 5,
					reliabilityStatus: "preferred",
					comment: "Своевременная доставка пломбировочных материалов и боров.",
					evaluatedAt: "2026-09-12",
				},
				compositeScore: 5.0,
			};

			const a4 = formatSupplierReliabilityA4(summary, "Стоматологическая клиника ДЕНТЕ Плюс");

			assert.ok(a4.includes("ПРОТОКОЛ ОЦЕНКИ НАДЕЖНОСТИ ПОСТАВЩИКА"));
			assert.ok(a4.includes("Стоматологическая клиника ДЕНТЕ Плюс"));
			assert.ok(a4.includes("ООО Дентал Экспо Трейд"));
			assert.ok(a4.includes("sup-stom-01"));
			assert.ok(a4.includes("100.0%"));
			assert.ok(a4.includes("0.0%"));
			assert.ok(a4.includes("5.00 из 5.00"));
			assert.ok(a4.includes("Приоритетный поставщик [preferred]"));
			assert.ok(a4.includes("ПРИОРИТЕТНЫЙ"));
			assert.ok(a4.includes("СанПиН 3.3686-21"));
			assert.ok(a4.includes("Ответственный за входной контроль материалов"));
			assert.ok(a4.includes("Главная медицинская сестра"));
		});

		it("formats protocol for blocked vendor with strict warning", () => {
			const metrics: SupplierRatingMetrics = {
				poCount: 6,
				receivedCount: 6,
				receivedWithDueDate: 6,
				onTimeDeliveries: 2,
				onTimeRatePct: 33.33,
				receivedQuantity: 300,
				rejectedQuantity: 45,
				rejectRatePct: 15.0,
			};

			const summary: SupplierRatingSummary = {
				supplierId: "sup-risk-99",
				supplierName: "ИП Срыв-Поставок А.В.",
				metrics,
				evaluation: {
					score: 1,
					reliabilityStatus: "blocked",
					comment: "Брак партии перчаток и систематический срыв сроков доставки.",
					evaluatedAt: "2026-09-12",
				},
				compositeScore: 2.37,
			};

			const a4 = formatSupplierReliabilityA4(summary, "Клиника ДЕНТЕ");

			assert.ok(a4.includes("Заблокирован [blocked]"));
			assert.ok(a4.includes("Поставщик ЗАБЛОКИРОВАН. Закупки приостановлены"));
			assert.ok(a4.includes("15.0%"));
			assert.ok(a4.includes("33.3%"));
		});

		it("STRICTLY ZERO EMOJIS in compliance with Mandate 8d item 7", () => {
			const metrics: SupplierRatingMetrics = {
				poCount: 8,
				receivedCount: 8,
				receivedWithDueDate: 8,
				onTimeDeliveries: 7,
				onTimeRatePct: 87.5,
				receivedQuantity: 1200,
				rejectedQuantity: 12,
				rejectRatePct: 1.0,
			};

			const summary: SupplierRatingSummary = {
				supplierId: "sup-clean-02",
				supplierName: "ООО СтомаТорг",
				metrics,
				evaluation: {
					score: 4,
					reliabilityStatus: "acceptable",
					comment: "Стабильный поставщик стоматологических инструментов.",
					evaluatedAt: "2026-09-12",
				},
				compositeScore: 4.45,
			};

			const a4 = formatSupplierReliabilityA4(summary, "ДЕНТЕ Дент");

			// Comprehensive Unicode emoji pattern (symbols, pictographs, emoticons, dingbats, flags)
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}]/u;
			const hasEmoji = emojiRegex.test(a4);

			assert.equal(
				hasEmoji,
				false,
				"A4 printable summary must contain STRICTLY 0 emojis according to Mandate 8d item 7",
			);
		});
	});

	describe("8. Zod Schemas Validation", () => {
		it("validates compliant SupplierRatingMetrics schema", () => {
			const valid = supplierRatingMetricsSchema.parse({
				poCount: 10,
				receivedCount: 10,
				receivedWithDueDate: 10,
				onTimeDeliveries: 9,
				onTimeRatePct: 90,
				receivedQuantity: 1000,
				rejectedQuantity: 10,
				rejectRatePct: 1.0,
			});
			assert.equal(valid.poCount, 10);
			assert.equal(valid.onTimeRatePct, 90);
			assert.equal(valid.rejectRatePct, 1.0);
		});

		it("validates metrics with null percentages (for zero due date / zero quantity)", () => {
			const valid = supplierRatingMetricsSchema.parse({
				poCount: 0,
				receivedCount: 0,
				receivedWithDueDate: 0,
				onTimeDeliveries: 0,
				onTimeRatePct: null,
				receivedQuantity: 0,
				rejectedQuantity: 0,
				rejectRatePct: null,
			});
			assert.equal(valid.onTimeRatePct, null);
			assert.equal(valid.rejectRatePct, null);
		});

		it("rejects negative counts in SupplierRatingMetrics", () => {
			assert.throws(() => {
				supplierRatingMetricsSchema.parse({
					poCount: -1,
					onTimeRatePct: 50,
					rejectRatePct: 0,
				});
			});
		});

		it("validates SupplierEvaluation schema with valid status and score (1..5)", () => {
			const evalRecord = supplierEvaluationSchema.parse({
				score: 4,
				reliabilityStatus: "acceptable",
				comment: "Хороший поставщик",
				evaluatedAt: "2026-09-12T12:00:00Z",
			});
			assert.equal(evalRecord.score, 4);
			assert.equal(evalRecord.reliabilityStatus, "acceptable");
		});

		it("rejects out-of-range evaluation score (< 1 or > 5)", () => {
			assert.throws(() => {
				supplierEvaluationSchema.parse({
					score: 6,
					reliabilityStatus: "preferred",
					evaluatedAt: "2026-09-12T12:00:00Z",
				});
			});
			assert.throws(() => {
				supplierEvaluationSchema.parse({
					score: 0,
					reliabilityStatus: "preferred",
					evaluatedAt: "2026-09-12T12:00:00Z",
				});
			});
		});

		it("rejects invalid reliability status enum value", () => {
			assert.throws(() => {
				supplierEvaluationSchema.parse({
					score: 3,
					reliabilityStatus: "unknown_status" as unknown as ReliabilityStatus,
					evaluatedAt: "2026-09-12T12:00:00Z",
				});
			});
		});
	});
});
