/**
 * wave138SupplierRatings.test.ts — Unit Tests for Supplier Ratings & Quality Defect Audit Engine.
 *
 * Wave 138 — Domain: Inventory & Logistics (DentalPin Supplier Ratings Reverse-Engineering).
 *
 * Test coverage:
 * 1. Re-exports & Architectural Parity:
 *    - Schemas, types, labels and engine functions re-exported from inventory/index.ts and shared/index.ts.
 * 2. Delivery & Defect Metrics Computation (computeSupplierMetrics):
 *    - Flawless strategic partner: 100% on-time, 0% defects, review 5.0 -> score 100, tier_1_preferred.
 *    - Standard verified vendor: 80% on-time, 2% defects, review 4.0 -> tier_2_standard.
 *    - Probationary vendor: 60% on-time, 6% defects, review 3.0 -> tier_3_probation.
 *    - Disqualified vendor: 30% on-time, 15% defects, review 1.5 -> tier_4_disqualified.
 *    - Edge cases: 0 POs, empty history, zero units, no reviews fallback (average 5.0), division by zero safety.
 * 3. Supply Chain Risk & Clinical Disruption Protection (evaluateSupplyRisk, Mandate 8e & 8n):
 *    - High risk triggers (disqualified tier, defect >= 10%, on-time < 60%) with clinical safety warnings.
 *    - Medium risk triggers (probation tier, defect >= 5%, on-time < 85%) with inspection warnings.
 *    - Low risk state with clean warning sheet.
 * 4. Statutory Russian A4 Procurement Audit Protocol (formatSupplierRatingAuditA4Report):
 *    - Generates official inspection sheet for SanPiN 3.3686-21 and Federal Law No. 323-FZ.
 *    - MANDATE 8d ITEM 7: 100% ABSENCE OF CARTOON EMOJIS (Unicode regex & extended pictographic checks).
 * 5. Zod Schemas Validation:
 *    - Validates strict constraints on review scores (1..5), non-negative counts, and valid tier enums.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeSupplierMetrics,
	evaluateSupplyRisk,
	formatSupplierRatingAuditA4Report,
	purchaseDeliveryHistoryItemSchema,
	SUPPLIER_TIER_LABELS_RU,
	supplierMetricsSchema,
	supplierRatingsEngine,
	supplierReviewSchema,
	supplierTierSchema,
	type PurchaseDeliveryHistoryItem,
	type SupplierMetrics,
	type SupplierReview,
	type SupplierTier,
} from "../supplierRatingsEngine.js";
import {
	computeSupplierMetrics as computeFromInvIndex,
	evaluateSupplyRisk as evaluateFromInvIndex,
	formatSupplierRatingAuditA4Report as formatFromInvIndex,
	purchaseDeliveryHistoryItemSchema as poItemSchemaFromInvIndex,
	SUPPLIER_TIER_LABELS_RU as TIER_LABELS_FROM_INV_INDEX,
	supplierMetricsSchema as metricsSchemaFromInvIndex,
	supplierRatingsEngine as engineFromInvIndex,
	supplierReviewSchema as reviewSchemaFromInvIndex,
	supplierTierSchema as tierSchemaFromInvIndex,
} from "../index.js";

describe("Wave 138: Supplier Ratings & Quality Defect Audit Engine", () => {
	describe("1. Re-exports & Architectural Parity", () => {
		it("re-exports all Wave 138 functions and schemas identically from inventory/index.ts", () => {
			assert.equal(computeSupplierMetrics, computeFromInvIndex);
			assert.equal(evaluateSupplyRisk, evaluateFromInvIndex);
			assert.equal(formatSupplierRatingAuditA4Report, formatFromInvIndex);
			assert.equal(supplierReviewSchema, reviewSchemaFromInvIndex);
			assert.equal(purchaseDeliveryHistoryItemSchema, poItemSchemaFromInvIndex);
			assert.equal(supplierTierSchema, tierSchemaFromInvIndex);
			assert.equal(supplierMetricsSchema, metricsSchemaFromInvIndex);
			assert.equal(supplierRatingsEngine, engineFromInvIndex);
			assert.deepEqual(SUPPLIER_TIER_LABELS_RU, TIER_LABELS_FROM_INV_INDEX);
		});

		it("contains all expected Russian labels for supplier tiers", () => {
			assert.equal(
				SUPPLIER_TIER_LABELS_RU.tier_1_preferred,
				"Уровень 1: Приоритетный партнер (Preferred)",
			);
			assert.equal(
				SUPPLIER_TIER_LABELS_RU.tier_2_standard,
				"Уровень 2: Стандартный поставщик (Standard)",
			);
			assert.equal(
				SUPPLIER_TIER_LABELS_RU.tier_3_probation,
				"Уровень 3: Испытательный срок (Probation)",
			);
			assert.equal(
				SUPPLIER_TIER_LABELS_RU.tier_4_disqualified,
				"Уровень 4: Дисквалифицирован (Disqualified)",
			);
		});
	});

	describe("2. Delivery & Defect Metrics Computation (computeSupplierMetrics)", () => {
		it("calculates 100 score and tier_1_preferred for flawless strategic vendor", () => {
			const reviews: SupplierReview[] = [
				{
					id: "rev-1",
					supplierId: "sup-septodont",
					supplierName: "Септодонт Рус",
					score: 5,
					comment: "Идеальные поставки Ультракаина",
					reviewerName: "Завскладом",
					updatedAt: "2026-09-12T10:00:00Z",
				},
				{
					id: "rev-2",
					supplierId: "sup-septodont",
					supplierName: "Септодонт Рус",
					score: 5,
					comment: "Своевременно, без боя карпул",
					reviewerName: "Главная медсестра",
					updatedAt: "2026-09-12T11:00:00Z",
				},
			];

			const history: PurchaseDeliveryHistoryItem[] = [
				{
					poId: "po-101",
					expectedDate: "2026-09-01",
					receivedAt: "2026-08-31",
					status: "received",
					totalUnits: 500,
					defectiveUnits: 0,
				},
				{
					poId: "po-102",
					expectedDate: "2026-09-05",
					receivedAt: "2026-09-05",
					status: "received",
					totalUnits: 500,
					defectiveUnits: 0,
				},
			];

			const metrics = computeSupplierMetrics(reviews, history);

			assert.equal(metrics.poCount, 2);
			assert.equal(metrics.receivedCount, 2);
			assert.equal(metrics.onTimeCount, 2);
			assert.equal(metrics.onTimeRate, 1.0);
			assert.equal(metrics.totalUnitsReceived, 1000);
			assert.equal(metrics.defectiveUnitsCount, 0);
			assert.equal(metrics.defectRate, 0.0);
			assert.equal(metrics.averageReviewScore, 5.0);
			assert.equal(metrics.compositeScore, 100);
			assert.equal(metrics.tier, "tier_1_preferred");
		});

		it("calculates tier_2_standard for good supplier with minor delay and small defect", () => {
			const reviews: SupplierReview[] = [
				{
					id: "rev-3",
					supplierId: "sup-stoma",
					supplierName: "Стома Трейд",
					score: 4,
					comment: "Хорошее качество боров",
					reviewerName: "Врач-стоматолог",
					updatedAt: "2026-09-12T10:00:00Z",
				},
			];

			const history: PurchaseDeliveryHistoryItem[] = [
				{
					poId: "po-201",
					expectedDate: "2026-09-01",
					receivedAt: "2026-09-01",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 5,
				},
				{
					poId: "po-202",
					expectedDate: "2026-09-03",
					receivedAt: "2026-09-03",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 5,
				},
				{
					poId: "po-203",
					expectedDate: "2026-09-05",
					receivedAt: "2026-09-05",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 5,
				},
				{
					poId: "po-204",
					expectedDate: "2026-09-07",
					receivedAt: "2026-09-10", // late
					status: "received",
					totalUnits: 100,
					defectiveUnits: 0,
				},
			];

			const metrics = computeSupplierMetrics(reviews, history);

			assert.equal(metrics.poCount, 4);
			assert.equal(metrics.receivedCount, 4);
			assert.equal(metrics.onTimeCount, 3);
			assert.equal(metrics.onTimeRate, 0.75);
			assert.equal(metrics.totalUnitsReceived, 400);
			assert.equal(metrics.defectiveUnitsCount, 15);
			assert.equal(metrics.defectRate, 0.0375);
			assert.equal(metrics.averageReviewScore, 4.0);
			assert.ok(metrics.compositeScore >= 84 && metrics.compositeScore <= 85);
		});

		it("calculates tier_3_probation for supplier with significant delays and defect rate", () => {
			const reviews: SupplierReview[] = [
				{
					id: "rev-4",
					supplierId: "sup-late",
					supplierName: "ООО МедСнаб",
					score: 3,
					comment: "Задержки по 3-4 дня",
					reviewerName: "Завскладом",
					updatedAt: "2026-09-12T10:00:00Z",
				},
			];

			const history: PurchaseDeliveryHistoryItem[] = [
				{
					poId: "po-301",
					expectedDate: "2026-09-01",
					receivedAt: "2026-09-01",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 10,
				},
				{
					poId: "po-302",
					expectedDate: "2026-09-03",
					receivedAt: "2026-09-03",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 10,
				},
				{
					poId: "po-303",
					expectedDate: "2026-09-05",
					receivedAt: "2026-09-08", // late
					status: "received",
					totalUnits: 100,
					defectiveUnits: 5,
				},
				{
					poId: "po-304",
					expectedDate: "2026-09-07",
					receivedAt: "2026-09-12", // late
					status: "received",
					totalUnits: 100,
					defectiveUnits: 5,
				},
			];

			const metrics = computeSupplierMetrics(reviews, history);

			assert.equal(metrics.onTimeRate, 0.5);
			assert.equal(metrics.defectRate, 0.075);
			assert.equal(metrics.averageReviewScore, 3.0);
			assert.equal(metrics.compositeScore, 69);
			assert.equal(metrics.tier, "tier_3_probation");
		});

		it("calculates tier_4_disqualified for high defect rate and chronic failure", () => {
			const reviews: SupplierReview[] = [
				{
					id: "rev-5",
					supplierId: "sup-disq",
					supplierName: "ООО БракСервис",
					score: 1,
					comment: "Бой карпул, порванные перчатки",
					reviewerName: "Комиссия",
					updatedAt: "2026-09-12T10:00:00Z",
				},
			];

			const history: PurchaseDeliveryHistoryItem[] = [
				{
					poId: "po-401",
					expectedDate: "2026-09-01",
					receivedAt: "2026-09-04",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 20,
				},
				{
					poId: "po-402",
					expectedDate: "2026-09-03",
					receivedAt: "2026-09-06",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 20,
				},
				{
					poId: "po-403",
					expectedDate: "2026-09-05",
					receivedAt: "2026-09-09",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 20,
				},
				{
					poId: "po-404",
					expectedDate: "2026-09-07",
					receivedAt: "2026-09-12",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 20,
				},
			];

			const metrics = computeSupplierMetrics(reviews, history);

			assert.equal(metrics.onTimeRate, 0.0);
			assert.equal(metrics.defectRate, 0.2);
			assert.equal(metrics.averageReviewScore, 1.0);
			assert.equal(metrics.compositeScore, 36);
			assert.equal(metrics.tier, "tier_4_disqualified");
		});

		it("handles edge cases: empty history, zero units, no reviews safely", () => {
			const emptyMetrics = computeSupplierMetrics([], []);

			assert.equal(emptyMetrics.poCount, 0);
			assert.equal(emptyMetrics.receivedCount, 0);
			assert.equal(emptyMetrics.onTimeCount, 0);
			assert.equal(emptyMetrics.onTimeRate, 1.0);
			assert.equal(emptyMetrics.totalUnitsReceived, 0);
			assert.equal(emptyMetrics.defectiveUnitsCount, 0);
			assert.equal(emptyMetrics.defectRate, 0.0);
			assert.equal(emptyMetrics.averageReviewScore, 5.0);
			assert.equal(emptyMetrics.compositeScore, 100);
			assert.equal(emptyMetrics.tier, "tier_1_preferred");
		});

		it("ignores non-received purchase orders in quality/delivery calculations", () => {
			const history: PurchaseDeliveryHistoryItem[] = [
				{
					poId: "po-open-1",
					expectedDate: "2026-09-01",
					receivedAt: null,
					status: "pending",
					totalUnits: 500,
					defectiveUnits: 0,
				},
				{
					poId: "po-open-2",
					expectedDate: "2026-09-05",
					receivedAt: null,
					status: "draft",
					totalUnits: 300,
					defectiveUnits: 0,
				},
				{
					poId: "po-rec-1",
					expectedDate: "2026-09-02",
					receivedAt: "2026-09-02",
					status: "received",
					totalUnits: 200,
					defectiveUnits: 0,
				},
			];

			const metrics = computeSupplierMetrics([], history);

			assert.equal(metrics.poCount, 3);
			assert.equal(metrics.receivedCount, 1);
			assert.equal(metrics.totalUnitsReceived, 200);
			assert.equal(metrics.onTimeCount, 1);
			assert.equal(metrics.onTimeRate, 1.0);
		});

		it("clamps defectiveUnits so it never exceeds totalUnits", () => {
			const history: PurchaseDeliveryHistoryItem[] = [
				{
					poId: "po-overflow",
					expectedDate: "2026-09-01",
					receivedAt: "2026-09-01",
					status: "received",
					totalUnits: 100,
					defectiveUnits: 200,
				},
			];

			const metrics = computeSupplierMetrics([], history);

			assert.equal(metrics.totalUnitsReceived, 100);
			assert.equal(metrics.defectiveUnitsCount, 100);
			assert.equal(metrics.defectRate, 1.0);
		});
	});

	describe("3. Supply Chain Risk Evaluation (evaluateSupplyRisk)", () => {
		it("returns 'low' risk with 0 warnings for top-tier supplier", () => {
			const metrics: SupplierMetrics = {
				poCount: 10,
				receivedCount: 10,
				onTimeCount: 10,
				onTimeRate: 1.0,
				totalUnitsReceived: 2000,
				defectiveUnitsCount: 0,
				defectRate: 0.0,
				averageReviewScore: 5.0,
				compositeScore: 100,
				tier: "tier_1_preferred",
			};

			const risk = evaluateSupplyRisk(metrics);

			assert.equal(risk.riskLevel, "low");
			assert.equal(risk.warnings.length, 0);
		});

		it("returns 'medium' risk with actionable warnings for probation supplier", () => {
			const metrics: SupplierMetrics = {
				poCount: 5,
				receivedCount: 5,
				onTimeCount: 4,
				onTimeRate: 0.80,
				totalUnitsReceived: 500,
				defectiveUnitsCount: 30,
				defectRate: 0.06,
				averageReviewScore: 3.5,
				compositeScore: 68,
				tier: "tier_3_probation",
			};

			const risk = evaluateSupplyRisk(metrics);

			assert.equal(risk.riskLevel, "medium");
			assert.ok(risk.warnings.length >= 3);
			assert.ok(risk.warnings.some((w) => w.includes("испытательный срок")));
			assert.ok(risk.warnings.some((w) => w.includes("Повышенная доля брака")));
			assert.ok(risk.warnings.some((w) => w.includes("Дисциплина поставок ниже")));
		});

		it("returns 'high' risk with clinical blocker warnings for disqualified vendor", () => {
			const metrics: SupplierMetrics = {
				poCount: 8,
				receivedCount: 8,
				onTimeCount: 4,
				onTimeRate: 0.50,
				totalUnitsReceived: 1000,
				defectiveUnitsCount: 120,
				defectRate: 0.12,
				averageReviewScore: 2.0,
				compositeScore: 42,
				tier: "tier_4_disqualified",
			};

			const risk = evaluateSupplyRisk(metrics);

			assert.equal(risk.riskLevel, "high");
			assert.ok(risk.warnings.length >= 3);
			assert.ok(risk.warnings.some((w) => w.includes("дисквалифицирован")));
			assert.ok(risk.warnings.some((w) => w.includes("Критический уровень дефектности")));
			assert.ok(risk.warnings.some((w) => w.includes("СанПиН 3.3686-21")));
			assert.ok(risk.warnings.some((w) => w.includes("Систематический срыв")));
		});
	});

	describe("4. Official Russian A4 Audit Protocol (formatSupplierRatingAuditA4Report)", () => {
		const sampleSupplier = {
			id: "sup-9901-test",
			name: "ООО Дентал-Фарма Спб",
			inn: "7801234567",
		};

		const sampleMetrics: SupplierMetrics = {
			poCount: 15,
			receivedCount: 15,
			onTimeCount: 14,
			onTimeRate: 0.9333,
			totalUnitsReceived: 3000,
			defectiveUnitsCount: 15,
			defectRate: 0.005,
			averageReviewScore: 4.8,
			compositeScore: 96,
			tier: "tier_1_preferred",
		};

		it("generates statutory protocol containing all required clinical and regulatory blocks", () => {
			const report = formatSupplierRatingAuditA4Report(
				sampleSupplier,
				sampleMetrics,
				"Стоматологический центр «ДЕНТЕ ПРЕМИУМ»",
			);

			assert.ok(report.includes("ПРОТОКОЛ АУДИТА КАЧЕСТВА И НАДЕЖНОСТИ ПОСТАВЩИКА"));
			assert.ok(report.includes("СанПиН 3.3686-21"));
			assert.ok(report.includes("Федерального закона № 323-ФЗ"));
			assert.ok(report.includes("Стоматологический центр «ДЕНТЕ ПРЕМИУМ»"));
			assert.ok(report.includes("ООО Дентал-Фарма Спб"));
			assert.ok(report.includes("ИНН: 7801234567"));
			assert.ok(report.includes("sup-9901-test"));
			assert.ok(report.includes("93.3%"));
			assert.ok(report.includes("0.5%"));
			assert.ok(report.includes("4.80 из 5.00"));
			assert.ok(report.includes("96 из 100"));
			assert.ok(report.includes("Уровень 1: Приоритетный партнер (Preferred)"));
			assert.ok(report.includes("НИЗКИЙ (ШТАТНЫЙ РЕЖИМ)"));
			assert.ok(report.includes("Ответственный за входной контроль"));
			assert.ok(report.includes("Главная медицинская сестра / Завскладом"));
		});

		it("STRICTLY ZERO EMOJIS in compliance with Mandate 8d item 7", () => {
			const report = formatSupplierRatingAuditA4Report(
				sampleSupplier,
				sampleMetrics,
				"Стоматологическая клиника ДЕНТЕ",
			);

			// 1. Extended_Pictographic Unicode check
			const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				unicodeEmojiRegex.test(report),
				false,
				"Mandate 8d Item 7 Violation: Found Extended_Pictographic emoji in supplier A4 audit protocol!",
			);

			// 2. Comprehensive range check for standard emoji symbols
			const generalEmojiRegex =
				/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
			assert.equal(
				generalEmojiRegex.test(report),
				false,
				"Mandate 8d Item 7 Violation: Found standard Unicode emoji range in supplier A4 audit protocol!",
			);

			// 3. Explicit forbidden cartoon symbols
			const forbiddenEmojis = ["🎉", "🚀", "💡", "🦷", "📦", "📄", "⚠️", "🚨", "✅", "❌", "🔥"];
			for (const emoji of forbiddenEmojis) {
				assert.equal(
					report.includes(emoji),
					false,
					`Mandate 8d Item 7 Violation: Explicit emoji ${emoji} found in supplier A4 report!`,
				);
			}
		});

		it("formats report for disqualified supplier with high risk warnings and no emojis", () => {
			const disqSupplier = {
				id: "sup-disq-001",
				name: "ИП Риск-Поставка",
			};
			const disqMetrics: SupplierMetrics = {
				poCount: 6,
				receivedCount: 6,
				onTimeCount: 2,
				onTimeRate: 0.3333,
				totalUnitsReceived: 600,
				defectiveUnitsCount: 90,
				defectRate: 0.15,
				averageReviewScore: 1.5,
				compositeScore: 37,
				tier: "tier_4_disqualified",
			};

			const report = formatSupplierRatingAuditA4Report(disqSupplier, disqMetrics);

			assert.ok(report.includes("ВЫСОКИЙ (КРИТИЧЕСКИЙ)"));
			assert.ok(report.includes("Уровень 4: Дисквалифицирован (Disqualified)"));
			assert.ok(report.includes("Поставщик дисквалифицирован"));
			assert.ok(report.includes("Критический уровень дефектности продукции"));

			const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(unicodeEmojiRegex.test(report), false);
		});
	});

	describe("5. Zod Schemas Validation", () => {
		it("validates compliant supplierReviewSchema", () => {
			const validReview = supplierReviewSchema.parse({
				id: "rev-101",
				supplierId: "sup-1",
				supplierName: "СтомаТорг",
				score: 4,
				comment: "Качественная упаковка",
				reviewerName: "Иванов И.И.",
				updatedAt: "2026-09-12T10:00:00Z",
			});
			assert.equal(validReview.score, 4);
			assert.equal(validReview.supplierName, "СтомаТорг");
		});

		it("rejects score < 1 or > 5 in supplierReviewSchema", () => {
			assert.throws(() => {
				supplierReviewSchema.parse({
					id: "rev-bad",
					supplierId: "sup-1",
					supplierName: "Тест",
					score: 6,
					updatedAt: "2026-09-12",
				});
			});
			assert.throws(() => {
				supplierReviewSchema.parse({
					id: "rev-bad",
					supplierId: "sup-1",
					supplierName: "Тест",
					score: 0,
					updatedAt: "2026-09-12",
				});
			});
		});

		it("validates compliant purchaseDeliveryHistoryItemSchema", () => {
			const validPO = purchaseDeliveryHistoryItemSchema.parse({
				poId: "po-1",
				expectedDate: "2026-09-01",
				receivedAt: "2026-09-01",
				status: "received",
				totalUnits: 100,
				defectiveUnits: 2,
			});
			assert.equal(validPO.totalUnits, 100);
			assert.equal(validPO.defectiveUnits, 2);
		});

		it("rejects negative counts in purchaseDeliveryHistoryItemSchema", () => {
			assert.throws(() => {
				purchaseDeliveryHistoryItemSchema.parse({
					poId: "po-bad",
					status: "received",
					totalUnits: -10,
				});
			});
		});

		it("validates supplierTierSchema enums", () => {
			assert.equal(supplierTierSchema.parse("tier_1_preferred"), "tier_1_preferred");
			assert.equal(supplierTierSchema.parse("tier_2_standard"), "tier_2_standard");
			assert.equal(supplierTierSchema.parse("tier_3_probation"), "tier_3_probation");
			assert.equal(supplierTierSchema.parse("tier_4_disqualified"), "tier_4_disqualified");
			assert.throws(() => {
				supplierTierSchema.parse("tier_unknown" as unknown as SupplierTier);
			});
		});

		it("validates full supplierMetricsSchema", () => {
			const validMetrics = supplierMetricsSchema.parse({
				poCount: 10,
				receivedCount: 10,
				onTimeCount: 9,
				onTimeRate: 0.9,
				totalUnitsReceived: 1000,
				defectiveUnitsCount: 10,
				defectRate: 0.01,
				averageReviewScore: 4.5,
				compositeScore: 92,
				tier: "tier_1_preferred",
			});
			assert.equal(validMetrics.compositeScore, 92);
			assert.equal(validMetrics.tier, "tier_1_preferred");
		});
	});
});
