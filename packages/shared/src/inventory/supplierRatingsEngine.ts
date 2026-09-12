/**
 * supplierRatingsEngine.ts — Supplier Reliability Rating & Incoming Delivery Quality Engine.
 *
 * Wave 126 — Domain: Inventory & Logistics (DentalPin Supplier Ratings Reverse-Engineering).
 * Adapted from DentalPin:
 * - backend/app/modules/supplier_ratings/schemas.py
 * - backend/app/modules/supplier_ratings/service.py
 *
 * INVARIANTS:
 * 1. Zero Mocks & Zero Dead-Ends:
 *    - Strict Zod schemas and deterministic pure calculations.
 * 2. Robust Division Safety:
 *    - Safe handling of 0 purchase orders, 0 due dates, 0 delivered quantities.
 * 3. Weighted Composite Scoring (1.0–5.0):
 *    - 40% On-time delivery rate (своевременность)
 *    - 40% Absence of defects / quality (отсутствие брака)
 *    - 20% Expert manual review (экспертная оценка взаимодействия)
 * 4. Reliability Status Classification:
 *    - preferred: compositeScore >= 4.5 and rejectRatePct <= 2.0
 *    - acceptable: compositeScore >= 3.5 and rejectRatePct < 5.0
 *    - at_risk: compositeScore >= 2.5 and rejectRatePct < 10.0 (or sub-par performance)
 *    - blocked: compositeScore < 2.5 or rejectRatePct >= 10.0 (medical safety violation)
 * 5. Strict Zero-Emoji A4 Format (Mandate 8d item 7):
 *    - Strict Russian procurement audit protocol for SanPiN 3.3686-21 and Roszdravnadzor.
 */

import { z } from "zod";

// ─── 1. ZOD SCHEMAS & TYPES ───────────────────────────────────────────────────

/**
 * Reliability classification status for clinical suppliers:
 * - preferred: Priority vendor with exceptional on-time record and zero/minimal defects.
 * - acceptable: Verified standard supplier fit for routine procurement.
 * - at_risk: Supplier showing recurring delays or elevated defect rates; requires safety buffers.
 * - blocked: Vendor barred from purchasing due to unacceptable defects or delivery failure.
 */
export const reliabilityStatusSchema = z.enum([
	"preferred",
	"acceptable",
	"at_risk",
	"blocked",
]);
export type ReliabilityStatus = z.infer<typeof reliabilityStatusSchema>;

export const RELIABILITY_STATUS_LABELS_RU: Record<ReliabilityStatus, string> = {
	preferred: "Приоритетный поставщик",
	acceptable: "Надежный поставщик",
	at_risk: "Зона риска",
	blocked: "Заблокирован",
};

/**
 * Historical delivery and quality metrics computed from purchase orders and receipt lines.
 */
export const supplierRatingMetricsSchema = z.object({
	poCount: z.number().int().nonnegative().default(0),
	receivedCount: z.number().int().nonnegative().default(0),
	receivedWithDueDate: z.number().int().nonnegative().default(0),
	onTimeDeliveries: z.number().int().nonnegative().default(0),
	onTimeRatePct: z.number().min(0).max(100).nullable(),
	receivedQuantity: z.number().nonnegative().default(0),
	rejectedQuantity: z.number().nonnegative().default(0),
	rejectRatePct: z.number().min(0).max(100).nullable(),
});
export type SupplierRatingMetrics = z.infer<typeof supplierRatingMetricsSchema>;

/**
 * Manual/expert review record submitted by clinical staff or warehouse manager.
 */
export const supplierEvaluationSchema = z.object({
	score: z.number().int().min(1).max(5),
	reliabilityStatus: reliabilityStatusSchema,
	comment: z.string().nullable().optional(),
	evaluatedAt: z.string(),
});
export type SupplierEvaluation = z.infer<typeof supplierEvaluationSchema>;

/**
 * Full rating summary containing supplier details, metrics, evaluation, and composite score.
 */
export const supplierRatingSummarySchema = z.object({
	supplierId: z.string().min(1),
	supplierName: z.string().min(1),
	metrics: supplierRatingMetricsSchema,
	evaluation: supplierEvaluationSchema,
	compositeScore: z.number().min(1.0).max(5.0),
});
export type SupplierRatingSummary = z.infer<typeof supplierRatingSummarySchema>;

// ─── 2. CALCULATION ALGORITHMS ────────────────────────────────────────────────

/**
 * Computes on-time delivery rate percentage (0..100%).
 * Returns null if no purchase orders had a due date (receivedWithDueDate <= 0).
 *
 * Formula: (onTimeDeliveries / receivedWithDueDate) * 100, rounded to 2 decimals.
 */
export function computeOnTimeRate(
	onTimeDeliveries: number,
	receivedWithDueDate: number,
): number | null {
	if (
		!Number.isFinite(receivedWithDueDate) ||
		receivedWithDueDate <= 0
	) {
		return null;
	}
	const safeOnTime = Math.max(0, Math.min(onTimeDeliveries, receivedWithDueDate));
	const ratePct = (safeOnTime / receivedWithDueDate) * 100;
	return Math.round(ratePct * 100) / 100;
}

/**
 * Computes defect/rejection rate percentage (0..100%).
 * Returns null if no units were received (receivedQuantity <= 0).
 *
 * Formula: (rejectedQuantity / receivedQuantity) * 100, rounded to 2 decimals.
 */
export function computeRejectRate(
	rejectedQuantity: number,
	receivedQuantity: number,
): number | null {
	if (
		!Number.isFinite(receivedQuantity) ||
		receivedQuantity <= 0
	) {
		return null;
	}
	const safeRejected = Math.max(0, Math.min(rejectedQuantity, receivedQuantity));
	const ratePct = (safeRejected / receivedQuantity) * 100;
	return Math.round(ratePct * 100) / 100;
}

/**
 * Computes composite supplier reliability score on a 1.0–5.0 scale.
 *
 * WEIGHTED FORMULA:
 * - On-time delivery rate: 40% (0.40)
 * - Absence of defects (quality): 40% (0.40)
 * - Expert evaluation score: 20% (0.20)
 *
 * If manualScore is omitted, weights normalize to 50% on-time + 50% quality.
 * If both metrics are null (unrated new supplier), returns manualScore or neutral 3.0.
 */
export function computeCompositeScore(
	metrics: SupplierRatingMetrics,
	manualScore?: number,
): number {
	const clampedManual =
		manualScore !== undefined && Number.isFinite(manualScore)
			? Math.min(5.0, Math.max(1.0, manualScore))
			: undefined;

	const hasOnTime = metrics.onTimeRatePct !== null && Number.isFinite(metrics.onTimeRatePct);
	const hasReject = metrics.rejectRatePct !== null && Number.isFinite(metrics.rejectRatePct);

	// Map onTime percentage (0..100) to 1.0–5.0 scale
	const onTimeScore = hasOnTime
		? 1.0 + (metrics.onTimeRatePct! / 100) * 4.0
		: null;

	// Map quality percentage (100 - rejectRatePct) to 1.0–5.0 scale
	const qualityScore = hasReject
		? 1.0 + (Math.max(0, 100 - metrics.rejectRatePct!) / 100) * 4.0
		: null;

	// Case 1: Neither delivery metric is available (no order history)
	if (onTimeScore === null && qualityScore === null) {
		return clampedManual !== undefined ? clampedManual : 3.0;
	}

	// Case 2: Partial delivery data (one of the metrics is missing)
	const effectiveOnTime = onTimeScore !== null ? onTimeScore : 3.0;
	const effectiveQuality = qualityScore !== null ? qualityScore : 3.0;

	let rawScore: number;
	if (clampedManual !== undefined) {
		rawScore =
			effectiveOnTime * 0.40 +
			effectiveQuality * 0.40 +
			clampedManual * 0.20;
	} else {
		rawScore =
			effectiveOnTime * 0.50 +
			effectiveQuality * 0.50;
	}

	const boundedScore = Math.min(5.0, Math.max(1.0, rawScore));
	return Math.round(boundedScore * 100) / 100;
}

/**
 * Determines reliability category based on composite score and defect rate:
 * - blocked: rejectRatePct >= 10% OR compositeScore < 2.5 (strictly barred from clinical supply).
 * - at_risk: rejectRatePct >= 5% OR compositeScore < 3.5 (high risk of clinical disruption).
 * - preferred: compositeScore >= 4.5 AND rejectRatePct <= 2.0 (superior quality and delivery).
 * - acceptable: compositeScore >= 3.5 AND rejectRatePct < 5.0 (reliable routine vendor).
 */
export function determineReliabilityStatus(
	compositeScore: number,
	rejectRatePct: number,
): ReliabilityStatus {
	const safeScore = Math.min(5.0, Math.max(1.0, compositeScore));
	const safeReject = Math.max(0, rejectRatePct);

	// Severe defect rate or unacceptable performance -> BLOCKED
	if (safeReject >= 10.0 || safeScore < 2.5) {
		return "blocked";
	}

	// Elevated defect rate or sub-par composite score -> AT RISK
	if (safeReject >= 5.0 || safeScore < 3.5) {
		return "at_risk";
	}

	// High score and near-zero defects -> PREFERRED
	if (safeScore >= 4.5 && safeReject <= 2.0) {
		return "preferred";
	}

	// Standard acceptable vendor
	return "acceptable";
}

/**
 * Builds a complete SupplierRatingSummary object from metrics and review parameters.
 */
export function buildSupplierRatingSummary(params: {
	supplierId: string;
	supplierName: string;
	metrics: SupplierRatingMetrics;
	manualScore?: number;
	comment?: string | null;
	evaluatedAt?: string;
}): SupplierRatingSummary {
	const manualScore = params.manualScore ?? 3;
	const compositeScore = computeCompositeScore(params.metrics, manualScore);
	const effectiveRejectRate = params.metrics.rejectRatePct ?? 0;
	const reliabilityStatus = determineReliabilityStatus(compositeScore, effectiveRejectRate);

	return {
		supplierId: params.supplierId,
		supplierName: params.supplierName,
		metrics: params.metrics,
		evaluation: {
			score: manualScore,
			reliabilityStatus,
			comment: params.comment ?? null,
			evaluatedAt: params.evaluatedAt ?? new Date().toISOString(),
		},
		compositeScore,
	};
}

// ─── 3. OFFICIAL A4 PROTOCOL FORMATTER (MANDATE 8d ITEM 7: 0 EMOJIS) ──────────

/**
 * Formats a formal Russian statutory procurement audit document for A4 print.
 * Meets requirements of SanPiN 3.3686-21 and Federal Law No. 323-FZ.
 * Strictly 0 emojis in compliance with Mandate 8d item 7.
 */
export function formatSupplierReliabilityA4(
	summary: SupplierRatingSummary,
	clinicName: string,
): string {
	const separator = "=".repeat(76);
	const subSeparator = "-".repeat(76);

	const safeClinic = clinicName.trim() || "Медицинская организация DENTE";
	const safeSupplier = summary.supplierName.trim() || "Не указан";
	const statusLabel = RELIABILITY_STATUS_LABELS_RU[summary.evaluation.reliabilityStatus];

	const onTimeText =
		summary.metrics.onTimeRatePct !== null
			? `${summary.metrics.onTimeRatePct.toFixed(1)}%`
			: "Н/Д (нет сроков в заказах)";

	const rejectText =
		summary.metrics.rejectRatePct !== null
			? `${summary.metrics.rejectRatePct.toFixed(1)}%`
			: "0.0% (брак не зафиксирован)";

	let conclusionText: string;
	switch (summary.evaluation.reliabilityStatus) {
		case "preferred":
			conclusionText =
				"Поставщик аттестован как ПРИОРИТЕТНЫЙ. Рекомендован для прямых долгосрочных контрактов и первоочередных поставок анестетиков, имплантов и критических расходных материалов.";
			break;
		case "acceptable":
			conclusionText =
				"Поставщик аттестован как НАДЕЖНЫЙ. Допущен к плановым закупкам в штатном режиме. Входной контроль осуществляется по стандартному регламенту.";
			break;
		case "at_risk":
			conclusionText =
				"Поставщик переведен в категорию ЗОНА РИСКА. Требуется 100% сплошной входной контроль каждой входящей партии и поддержание увеличенного неснижаемого страхового остатка.";
			break;
		case "blocked":
			conclusionText =
				"Поставщик ЗАБЛОКИРОВАН. Закупки приостановлены в связи с превышением предельно допустимого уровня брака или систематическим срывом сроков поставки медицинских изделий.";
			break;
	}

	const lines: string[] = [];
	lines.push(separator);
	lines.push("ПРОТОКОЛ ОЦЕНКИ НАДЕЖНОСТИ ПОСТАВЩИКА И ВХОДНОГО КОНТРОЛЯ МАТЕРИАЛОВ");
	lines.push("Аудит качества медицинских изделий и расходных материалов (СанПиН 3.3686-21)");
	lines.push(separator);
	lines.push(`Медицинская организация: ${safeClinic}`);
	lines.push(`Поставщик: ${safeSupplier} (Идентификатор: ${summary.supplierId})`);
	lines.push(`Дата формирования отчета: ${new Date().toISOString().split("T")[0]}`);
	lines.push(subSeparator);

	lines.push("1. ДИСЦИПЛИНА И СВОЕВРЕМЕННОСТЬ ПОСТАВОК (ON-TIME DELIVERY):");
	lines.push(`- Всего сформировано заказов на закупку (PO): ${summary.metrics.poCount}`);
	lines.push(`- Фактически принято поставок: ${summary.metrics.receivedCount}`);
	lines.push(`- Поставок с установленной плановой датой (Due Date): ${summary.metrics.receivedWithDueDate}`);
	lines.push(`- Поставок выполнено в срок или досрочно: ${summary.metrics.onTimeDeliveries}`);
	lines.push(`- Показатель своевременности поставок: ${onTimeText}`);
	lines.push(subSeparator);

	lines.push("2. КАЧЕСТВО И ВХОДНОЙ КОНТРОЛЬ МАТЕРИАЛОВ (REJECT RATE):");
	lines.push(`- Всего принято единиц продукции (карпулы, перчатки, расходники): ${summary.metrics.receivedQuantity}`);
	lines.push(`- Выявлено брака / отбраковано при входном контроле: ${summary.metrics.rejectedQuantity}`);
	lines.push(`- Уровень дефектности (доля отбракованной продукции): ${rejectText}`);
	lines.push(subSeparator);

	lines.push("3. РЕЗУЛЬТАТЫ ЭКСПЕРТНОЙ ОЦЕНКИ И КОМПОЗИТНЫЙ ИНДЕКС:");
	lines.push(`- Композитный индекс надежности: ${summary.compositeScore.toFixed(2)} из 5.00`);
	lines.push(`- Экспертная оценка взаимодействия: ${summary.evaluation.score} из 5`);
	lines.push(`- Статус надежности: ${statusLabel} [${summary.evaluation.reliabilityStatus}]`);
	lines.push(`- Дата экспертной аттестации: ${summary.evaluation.evaluatedAt}`);
	lines.push(`- Комментарий комиссии / ответственного лица: ${summary.evaluation.comment ?? "Без замечаний"}`);
	lines.push(subSeparator);

	lines.push("4. РЕШЕНИЕ КОМИССИИ ПО ВХОДНОМУ КОНТРОЛЮ И ЗАКУПКАМ:");
	lines.push(conclusionText);
	lines.push(subSeparator);

	lines.push("Документ сформирован в медицинской информационной системе DENTE Dental CRM.");
	lines.push("Ответственный за входной контроль материалов: ____________________ / ____________________");
	lines.push("Главная медицинская сестра / Зав. складом:     ____________________ / ____________________");
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(separator);

	return lines.join("\n");
}

// ─── 4. WAVE 138: SUPPLIER RATINGS & QUALITY DEFECT AUDIT ENGINE ──────────────
// Adapted from DentalPin (backend/app/modules/supplier_ratings/):
// - models.py (SupplierReview)
// - schemas.py (SupplierReviewCreate, SupplierReviewResponse, SupplierRatingMetrics)
// - service.py (SupplierRatingsService on-demand delivery/quality calculations)

/**
 * Review record submitted by clinical staff or inventory manager.
 */
export const supplierReviewSchema = z.object({
	id: z.string().min(1),
	supplierId: z.string().min(1),
	supplierName: z.string().min(1),
	score: z.number().int().min(1).max(5),
	comment: z.string().nullable().optional(),
	reviewerName: z.string().nullable().optional(),
	updatedAt: z.string(),
});
export type SupplierReview = z.infer<typeof supplierReviewSchema>;

/**
 * Single historical purchase delivery from the PO receiving ledger.
 */
export const purchaseDeliveryHistoryItemSchema = z.object({
	poId: z.string().min(1),
	expectedDate: z.string().nullable().optional(),
	receivedAt: z.string().nullable().optional(),
	status: z.string(),
	totalUnits: z.number().int().nonnegative().default(0),
	defectiveUnits: z.number().int().nonnegative().default(0),
});
export type PurchaseDeliveryHistoryItem = z.infer<typeof purchaseDeliveryHistoryItemSchema>;

/**
 * Supplier accreditation and risk tier:
 * - tier_1_preferred: compositeScore >= 85 (Priority strategic vendor)
 * - tier_2_standard: compositeScore >= 70 (Approved routine vendor)
 * - tier_3_probation: compositeScore >= 50 (Under observation / probationary)
 * - tier_4_disqualified: compositeScore < 50 (Disqualified / barred from purchasing)
 */
export const supplierTierSchema = z.enum([
	"tier_1_preferred",
	"tier_2_standard",
	"tier_3_probation",
	"tier_4_disqualified",
]);
export type SupplierTier = z.infer<typeof supplierTierSchema>;

export const SUPPLIER_TIER_LABELS_RU: Record<SupplierTier, string> = {
	tier_1_preferred: "Уровень 1: Приоритетный партнер (Preferred)",
	tier_2_standard: "Уровень 2: Стандартный поставщик (Standard)",
	tier_3_probation: "Уровень 3: Испытательный срок (Probation)",
	tier_4_disqualified: "Уровень 4: Дисквалифицирован (Disqualified)",
};

/**
 * Aggregated metrics and computed ratings for procurement audit.
 */
export const supplierMetricsSchema = z.object({
	poCount: z.number().int().nonnegative().default(0),
	receivedCount: z.number().int().nonnegative().default(0),
	onTimeCount: z.number().int().nonnegative().default(0),
	onTimeRate: z.number().min(0).max(1),
	totalUnitsReceived: z.number().int().nonnegative().default(0),
	defectiveUnitsCount: z.number().int().nonnegative().default(0),
	defectRate: z.number().min(0).max(1),
	averageReviewScore: z.number().min(1).max(5),
	compositeScore: z.number().min(0).max(100),
	tier: supplierTierSchema,
});
export type SupplierMetrics = z.infer<typeof supplierMetricsSchema>;

/**
 * Computes on-demand delivery discipline, defect rate, and composite scoring.
 *
 * Scoring formula (0..100):
 * - On-time delivery rate: 40% (0..40 points)
 * - Quality / absence of defects: 40% (0..40 points)
 * - Average review score: 20% (0..20 points, where 5.0 = 20 pts)
 *
 * Fallbacks:
 * - If no deliveries with due date, onTimeRate defaults to 1.0 (100%).
 * - If 0 units received, defectRate defaults to 0.0 (0%).
 * - If 0 reviews submitted, averageReviewScore defaults to 5.0.
 */
export function computeSupplierMetrics(
	reviews: SupplierReview[],
	history: PurchaseDeliveryHistoryItem[],
): SupplierMetrics {
	const poCount = history.length;

	const receivedItems = history.filter((item) => {
		const isStatusReceived = item.status.toLowerCase() === "received";
		const hasReceivedDate =
			item.receivedAt !== null &&
			item.receivedAt !== undefined &&
			item.receivedAt.trim().length > 0;
		return isStatusReceived || hasReceivedDate;
	});

	const receivedCount = receivedItems.length;

	const withDueDate = receivedItems.filter(
		(item) =>
			item.expectedDate !== null &&
			item.expectedDate !== undefined &&
			item.expectedDate.trim().length > 0 &&
			item.receivedAt !== null &&
			item.receivedAt !== undefined &&
			item.receivedAt.trim().length > 0,
	);

	let onTimeCount = 0;
	for (const item of withDueDate) {
		const expectedStr = item.expectedDate!.trim().slice(0, 10);
		const receivedStr = item.receivedAt!.trim().slice(0, 10);
		if (receivedStr <= expectedStr) {
			onTimeCount += 1;
		}
	}

	const rawOnTimeRate =
		withDueDate.length > 0 ? onTimeCount / withDueDate.length : 1.0;
	const onTimeRate = Math.max(0, Math.min(1, Math.round(rawOnTimeRate * 10000) / 10000));

	let totalUnitsReceived = 0;
	let defectiveUnitsCount = 0;
	for (const item of receivedItems) {
		totalUnitsReceived += Math.max(0, item.totalUnits);
		defectiveUnitsCount += Math.max(0, item.defectiveUnits);
	}
	defectiveUnitsCount = Math.min(defectiveUnitsCount, totalUnitsReceived);

	const rawDefectRate =
		totalUnitsReceived > 0 ? defectiveUnitsCount / totalUnitsReceived : 0.0;
	const defectRate = Math.max(0, Math.min(1, Math.round(rawDefectRate * 10000) / 10000));

	let averageReviewScore = 5.0;
	if (reviews.length > 0) {
		const sumScore = reviews.reduce(
			(acc, r) => acc + Math.max(1, Math.min(5, r.score)),
			0,
		);
		averageReviewScore = Math.round((sumScore / reviews.length) * 100) / 100;
	}

	const rawComposite =
		onTimeRate * 40 + (1.0 - defectRate) * 40 + (averageReviewScore / 5.0) * 20;
	const compositeScore = Math.max(0, Math.min(100, Math.round(rawComposite)));

	let tier: SupplierTier;
	if (compositeScore >= 85) {
		tier = "tier_1_preferred";
	} else if (compositeScore >= 70) {
		tier = "tier_2_standard";
	} else if (compositeScore >= 50) {
		tier = "tier_3_probation";
	} else {
		tier = "tier_4_disqualified";
	}

	return {
		poCount,
		receivedCount,
		onTimeCount,
		onTimeRate,
		totalUnitsReceived,
		defectiveUnitsCount,
		defectRate,
		averageReviewScore,
		compositeScore,
		tier,
	};
}

/**
 * Evaluates clinical disruption and procurement risk (Mandate 8e & Mandate 8n).
 * Generates actionable alerts for clinical inventory protection.
 */
export function evaluateSupplyRisk(metrics: SupplierMetrics): {
	riskLevel: "low" | "medium" | "high";
	warnings: string[];
} {
	const warnings: string[] = [];

	const isDisqualified = metrics.tier === "tier_4_disqualified";
	const isSevereDefect = metrics.defectRate >= 0.10;
	const isSevereDelay = metrics.onTimeRate < 0.60;

	if (isDisqualified || isSevereDefect || isSevereDelay) {
		if (isDisqualified) {
			warnings.push(
				`Поставщик дисквалифицирован (Tier 4, рейтинг ${metrics.compositeScore}/100). Размещение новых заказов заблокировано до проведения претензионной работы.`,
			);
		}
		if (isSevereDefect) {
			warnings.push(
				`Критический уровень дефектности продукции: ${(metrics.defectRate * 100).toFixed(1)}% (предел нормы < 5.0%). Угроза безопасности стоматологического лечения (Мандат 8e, СанПиН 3.3686-21).`,
			);
		}
		if (isSevereDelay) {
			warnings.push(
				`Систематический срыв сроков поставок: ${(metrics.onTimeRate * 100).toFixed(1)}% вовремя (норма >= 85.0%). Критический риск дефицита расходных материалов.`,
			);
		}
		return { riskLevel: "high", warnings };
	}

	const isProbation = metrics.tier === "tier_3_probation";
	const isElevatedDefect = metrics.defectRate >= 0.05;
	const isModerateDelay = metrics.onTimeRate < 0.85;

	if (isProbation || isElevatedDefect || isModerateDelay) {
		if (isProbation) {
			warnings.push(
				`Поставщик переведен на испытательный срок (Tier 3, рейтинг ${metrics.compositeScore}/100). Необходим 100% сплошной входной контроль каждой входящей партии.`,
			);
		}
		if (isElevatedDefect) {
			warnings.push(
				`Повышенная доля брака при входном контроле: ${(metrics.defectRate * 100).toFixed(1)}%. Требуется усиленная проверка стерильности и целостности упаковок.`,
			);
		}
		if (isModerateDelay) {
			warnings.push(
				`Дисциплина поставок ниже целевого ориентира: ${(metrics.onTimeRate * 100).toFixed(1)}% вовремя. Рекомендуется поддержание увеличенного страхового запаса на складе.`,
			);
		}
		return { riskLevel: "medium", warnings };
	}

	return { riskLevel: "low", warnings: [] };
}

/**
 * Formats statutory supplier quality audit protocol for Russian clinical procurement.
 * Strictly 0 emojis in compliance with Mandate 8d item 7.
 */
export function formatSupplierRatingAuditA4Report(
	supplier: { id: string; name: string; inn?: string | undefined },
	metrics: SupplierMetrics,
	clinicName?: string | undefined,
): string {
	const separator = "=".repeat(76);
	const subSeparator = "-".repeat(76);

	const safeClinic = clinicName?.trim() || "Медицинская организация DENTE";
	const safeSupplier = supplier.name.trim() || "Не указан";
	const innStr = supplier.inn ? `ИНН: ${supplier.inn}` : "ИНН: не указан";
	const tierLabel = SUPPLIER_TIER_LABELS_RU[metrics.tier];
	const risk = evaluateSupplyRisk(metrics);

	const riskLabel =
		risk.riskLevel === "high"
			? "ВЫСОКИЙ (КРИТИЧЕСКИЙ)"
			: risk.riskLevel === "medium"
				? "УМЕРЕННЫЙ (ЗОНА КОНТРОЛЯ)"
				: "НИЗКИЙ (ШТАТНЫЙ РЕЖИМ)";

	const lines: string[] = [];
	lines.push(separator);
	lines.push("ПРОТОКОЛ АУДИТА КАЧЕСТВА И НАДЕЖНОСТИ ПОСТАВЩИКА");
	lines.push("Оценка соответствия требованиям СанПиН 3.3686-21 и Федерального закона № 323-ФЗ");
	lines.push(separator);
	lines.push(`Медицинская организация: ${safeClinic}`);
	lines.push(`Поставщик: ${safeSupplier} (${innStr}, ID: ${supplier.id})`);
	lines.push(`Дата проведения аудита: ${new Date().toISOString().split("T")[0]}`);
	lines.push(subSeparator);

	lines.push("1. ДИСЦИПЛИНА И СВОЕВРЕМЕННОСТЬ ПОСТАВОК (ON-TIME DELIVERY):");
	lines.push(`- Всего сформировано заказов на закупку (PO): ${metrics.poCount}`);
	lines.push(`- Фактически принято поставок: ${metrics.receivedCount}`);
	lines.push(`- Поставок выполнено в срок или досрочно: ${metrics.onTimeCount}`);
	lines.push(`- Доля своевременных поставок: ${(metrics.onTimeRate * 100).toFixed(1)}%`);
	lines.push(subSeparator);

	lines.push("2. КАЧЕСТВО И ВХОДНОЙ КОНТРОЛЬ МАТЕРИАЛОВ (REJECT RATE):");
	lines.push(`- Всего принято единиц продукции (карпулы, расходники, боры): ${metrics.totalUnitsReceived}`);
	lines.push(`- Отбраковано при входном контроле: ${metrics.defectiveUnitsCount}`);
	lines.push(`- Процент брака / дефектности: ${(metrics.defectRate * 100).toFixed(1)}%`);
	lines.push(subSeparator);

	lines.push("3. ЭКСПЕРТНАЯ ОЦЕНКА И КОМПОЗИТНЫЙ РЕЙТИНГ:");
	lines.push(`- Средняя оценка экспертов клиники: ${metrics.averageReviewScore.toFixed(2)} из 5.00`);
	lines.push(`- Итоговый композитный балл надежности: ${metrics.compositeScore} из 100`);
	lines.push(`- Присвоенный статус: ${tierLabel}`);
	lines.push(subSeparator);

	lines.push("4. ОЦЕНКА РИСКА ЦЕПОЧКИ ПОСТАВОК И ЗАКЛЮЧЕНИЕ:");
	lines.push(`- Уровень логистического и клинического риска: ${riskLabel}`);
	if (risk.warnings.length > 0) {
		lines.push("- Выявленные риски и предписания комиссии:");
		for (const w of risk.warnings) {
			lines.push(`  * ${w}`);
		}
	} else {
		lines.push("- Замечаний не выявлено. Поставщик рекомендован для регулярных закупок без ограничений.");
	}
	lines.push(subSeparator);

	lines.push("Документ сформирован в медицинской информационной системе DENTE Dental CRM.");
	lines.push("Ответственный за входной контроль:  ____________________ / ____________________");
	lines.push("Главная медицинская сестра / Завскладом: ____________________ / ____________________");
	lines.push("М.П. (Место печати организации)");
	lines.push(separator);

	return lines.join("\n");
}

export const supplierRatingsEngine = {
	// Wave 126
	reliabilityStatusSchema,
	RELIABILITY_STATUS_LABELS_RU,
	supplierRatingMetricsSchema,
	supplierEvaluationSchema,
	supplierRatingSummarySchema,
	computeOnTimeRate,
	computeRejectRate,
	computeCompositeScore,
	determineReliabilityStatus,
	buildSupplierRatingSummary,
	formatSupplierReliabilityA4,
	// Wave 138
	supplierReviewSchema,
	purchaseDeliveryHistoryItemSchema,
	supplierTierSchema,
	SUPPLIER_TIER_LABELS_RU,
	supplierMetricsSchema,
	computeSupplierMetrics,
	evaluateSupplyRisk,
	formatSupplierRatingAuditA4Report,
};
