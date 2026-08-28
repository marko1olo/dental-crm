/**
 * Patient Mobile Portal Timeline & Financial Transparency Engine
 * (DOMAIN: PORTAL TIMELINE)
 *
 * Расчет прогресса комплексного лечения, финансовый баланс с учетом ДМС и бонусов,
 * калькулятор налогового вычета 13% для ФНС и агрегатор статусов зубов.
 */

import {
	PLAIN_LANGUAGE_TOOTH_STATUSES,
	getToothAnatomyInfo,
	type PatientFriendlyToothStatus,
	type PatientPortalTimelineData,
	type PatientPortalVisitItem,
} from "./portalTimelinePresets";

export interface PortalTimelineFinancialSummary {
	readonly totalPlanCostRub: number;
	readonly totalPaidRub: number;
	readonly remainingDueRub: number;
	readonly paidPercent: number;
	readonly dmsSavedRub: number;
	readonly loyaltyBonusBalance: number;
	readonly totalClientBenefitsRub: number;
	readonly isFullySettled: boolean;
}

export type PortalFinancialSummary = PortalTimelineFinancialSummary;

export interface PortalProgressSummary {
	readonly overallProgressPercent: number;
	readonly completedVisitsCount: number;
	readonly totalVisitsPlanned: number;
	readonly remainingVisitsCount: number;
	readonly isPlanFinished: boolean;
}

export interface PortalTaxCertificateRequest {
	readonly code: "01" | "02";
	readonly codeNameRu: string;
	readonly eligibleAmountRub: number;
	readonly refundEstimatedRub: number;
	readonly applicationTextRu: string;
}

export interface ToothGroupCount {
	readonly status: PatientFriendlyToothStatus;
	readonly titleRu: string;
	readonly count: number;
	readonly colorHex: string;
	readonly icon: string;
}

export interface PortalToothAggregation {
	readonly totalTeethTracked: number;
	readonly healthyCount: number;
	readonly restoredCount: number;
	readonly implantsCount: number;
	readonly scheduledCount: number;
	readonly statusGroups: readonly ToothGroupCount[];
}

/**
 * Расчет финансового баланса и экономии пациента.
 */
export function calculateFinancialLedger(data: PatientPortalTimelineData): PortalFinancialSummary {
	const totalPlan = Math.max(0, data.totalPlanCostRub);
	const paid = Math.max(0, data.totalPaidRub);
	const remaining = Math.max(0, totalPlan - paid);
	const paidPercent = totalPlan > 0 ? Number(((paid / totalPlan) * 100).toFixed(1)) : 100;
	const totalBenefits = data.dmsSavedRub + data.loyaltyBonusBalance;

	return {
		totalPlanCostRub: totalPlan,
		totalPaidRub: paid,
		remainingDueRub: remaining,
		paidPercent,
		dmsSavedRub: data.dmsSavedRub,
		loyaltyBonusBalance: data.loyaltyBonusBalance,
		totalClientBenefitsRub: totalBenefits,
		isFullySettled: remaining === 0,
	};
}

/**
 * Расчет клинического прогресса лечения.
 */
export function calculatePortalProgress(data: PatientPortalTimelineData): PortalProgressSummary {
	const total = Math.max(1, data.totalVisitsPlanned);
	const completed = Math.min(total, Math.max(0, data.completedVisitsCount));
	const remaining = Math.max(0, total - completed);
	const progressPercent = Number(((completed / total) * 100).toFixed(0));

	return {
		overallProgressPercent: data.overallProgressPercent ?? progressPercent,
		completedVisitsCount: completed,
		totalVisitsPlanned: total,
		remainingVisitsCount: remaining,
		isPlanFinished: remaining === 0,
	};
}

/**
 * Подготовка справки об оплате медицинских услуг для налогового вычета НДФЛ 13% в ФНС.
 */
export function generateTaxCertificateRequest(
	patientName: string,
	paidTotalRub: number,
	hasHighCostSurgeryCode02 = true,
): PortalTaxCertificateRequest {
	if (hasHighCostSurgeryCode02) {
		const refund = Math.round(paidTotalRub * 0.13);
		return {
			code: "02",
			codeNameRu: "Код 02: Дорогостоящее лечение (Имплантация, костная пластика) — без лимита",
			eligibleAmountRub: paidTotalRub,
			refundEstimatedRub: refund,
			applicationTextRu:
				`Заявление на получение справки для налоговой инспекции (форма по Приказу ФНС) на сумму ` +
				`${paidTotalRub.toLocaleString("ru-RU")} руб. по коду услуги 02 (дорогостоящее лечение). ` +
				`Пациент: ${patientName}. Расчетный возврат НДФЛ 13%: ${refund.toLocaleString("ru-RU")} руб.`,
		};
	}

	const maxBase = Math.min(paidTotalRub, 150000);
	const refund = Math.round(maxBase * 0.13);
	return {
		code: "01",
		codeNameRu: "Код 01: Стандартное лечение (Терапия, гигиена, ортопедия) — лимит 150 000 руб.",
		eligibleAmountRub: maxBase,
		refundEstimatedRub: refund,
		applicationTextRu:
			`Заявление на получение справки для налоговой инспекции на сумму ` +
			`${maxBase.toLocaleString("ru-RU")} руб. по коду 01. ` +
			`Пациент: ${patientName}. Расчетный возврат 13%: ${refund.toLocaleString("ru-RU")} руб.`,
	};
}

/**
 * Агрегация статусов зубов пациента для наглядной статистики.
 */
export function aggregateToothStatuses(
	toothStatuses: Readonly<Record<string, PatientFriendlyToothStatus>>,
): PortalToothAggregation {
	const counts: Partial<Record<PatientFriendlyToothStatus, number>> = {};

	for (const key of Object.keys(toothStatuses)) {
		const st = toothStatuses[key]!;
		counts[st] = (counts[st] || 0) + 1;
	}

	let healthy = 0;
	let restored = 0;
	let implants = 0;
	let scheduled = 0;

	const statusGroups: ToothGroupCount[] = [];

	for (const [stKey, info] of Object.entries(PLAIN_LANGUAGE_TOOTH_STATUSES)) {
		const count = counts[stKey as PatientFriendlyToothStatus] || 0;
		if (count > 0) {
			statusGroups.push({
				status: stKey as PatientFriendlyToothStatus,
				titleRu: info.titleRu,
				count,
				colorHex: info.colorHex,
				icon: info.icon,
			});
		}

		if (stKey === "healthy_observed") healthy += count;
		else if (
			stKey === "caries_cured" ||
			stKey === "endo_microscope" ||
			stKey === "crown_zirconia" ||
			stKey === "veneer_emax"
		) {
			restored += count;
		} else if (stKey === "implant_integrated" || stKey === "implant_crown_loaded") {
			implants += count;
		} else if (stKey === "scheduled_treatment") {
			scheduled += count;
		}
	}

	return {
		totalTeethTracked: Object.keys(toothStatuses).length,
		healthyCount: healthy,
		restoredCount: restored,
		implantsCount: implants,
		scheduledCount: scheduled,
		statusGroups,
	};
}

/**
 * Фильтрация хронологической ленты визитов.
 */
export function filterTimelineEvents(
	visits: readonly PatientPortalVisitItem[],
	filter: "all" | "completed" | "scheduled" | "with_media",
): readonly PatientPortalVisitItem[] {
	if (filter === "completed") {
		return visits.filter((v) => v.status === "completed");
	}
	if (filter === "scheduled") {
		return visits.filter((v) => v.status === "scheduled" || v.status === "in_progress");
	}
	if (filter === "with_media") {
		return visits.filter((v) => v.mediaAttachments.length > 0);
	}
	return visits;
}
