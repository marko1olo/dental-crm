import type { Kopecks } from "../../utils/money.js";
import { formatKopecksRu } from "../../utils/money.js";
import type { DmsGuaranteeLetter } from "./guaranteeTypes.js";
import type {
	DmsCoverageEvaluation, DmsCoverageEvaluationOptions, DmsCoverageEvaluationStatus,
} from "./guaranteeEvaluationTypes.js";
import { DMS_STATUS_HUMAN_LABELS, validateGuaranteeLetterDates } from "./guaranteeValidator.js";
import { checkServiceScopeExclusion } from "./guaranteeServiceScope.js";

export { applyGuaranteeLetterDeduction } from "./guaranteeDeduction.js";

export function evaluateGuaranteeLetterCoverage(
	letter: DmsGuaranteeLetter,
	requestedKopecks: Kopecks,
	options: DmsCoverageEvaluationOptions = {},
): DmsCoverageEvaluation {
	if (!Number.isInteger(requestedKopecks) || requestedKopecks < 0) {
		throw new Error(`Запрашиваемая сумма должна быть неотрицательным целым числом копеек, получено ${requestedKopecks}`);
	}
	const serviceDate = options.serviceDate ?? new Date().toISOString().slice(0, 10);
	const recommendations: string[] = [];
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);

	if (isUrgentCare) {
		const isExhausted = letter.remainingLimitKopecks <= 0 || letter.status === "exhausted";
		const isExpired = letter.status === "expired" || serviceDate > letter.validTo;
		const hasDiscrepancy = isExhausted || isExpired || (letter.status !== "active" && letter.status !== "approved");
		return {
			letterId: letter.id, status: "approved", isApproved: true, approvedInsurerKopecks: requestedKopecks,
			overflowToPatientKopecks: 0, remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: Math.max(0, letter.remainingLimitKopecks - requestedKopecks),
			limitUsageRatioPercent: letter.limitKopecks > 0 ? Math.round((letter.usedKopecks / letter.limitKopecks) * 100) : 100,
			warning80PercentReached: true, limitExceeded: requestedKopecks > letter.remainingLimitKopecks,
			isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Экстренная помощь (острая боль): приём разрешен без блокировок, требуется досылка гарантийного письма ДМС",
			warningMessageRu: hasDiscrepancy ? "Требуется досылка гарантийного письма ДМС (оказание помощи при острой боли разрешено)" : undefined,
			actionRecommendationsRu: ["Экстренная помощь (острая боль) оказана без блокировок.", "Требуется досылка гарантийного письма ДМС от страховой компании."],
		};
	}

	if (letter.status !== "active" && letter.status !== "approved") {
		return {
			letterId: letter.id, status: letter.status === "exhausted" ? "rejected_limit_exhausted" : "rejected_letter_inactive",
			isApproved: false, approvedInsurerKopecks: 0, overflowToPatientKopecks: requestedKopecks,
			remainingLimitBeforeKopecks: letter.remainingLimitKopecks, remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: letter.limitKopecks > 0 ? Math.round((letter.usedKopecks / letter.limitKopecks) * 100) : 100,
			warning80PercentReached: true, limitExceeded: true, isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Гарантийное письмо неактивно: ${DMS_STATUS_HUMAN_LABELS[letter.status] || letter.status}`,
			actionRecommendationsRu: ["Сумма переведена в счет оплаты пациентом в кассу клиники.", "Запросите дополнительное гарантийное письмо у страховой компании."],
		};
	}

	const dateCheck = validateGuaranteeLetterDates(letter, serviceDate);
	if (!dateCheck.isValid) {
		const isNotYet = dateCheck.isNotYetValid;
		return {
			letterId: letter.id, status: isNotYet ? "rejected_not_yet_valid" : "rejected_expired",
			isApproved: false, approvedInsurerKopecks: 0, overflowToPatientKopecks: requestedKopecks,
			remainingLimitBeforeKopecks: letter.remainingLimitKopecks, remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: isNotYet ? (letter.limitKopecks > 0 ? Math.round((letter.usedKopecks / letter.limitKopecks) * 100) : 0) : 100,
			warning80PercentReached: !isNotYet, limitExceeded: !isNotYet, isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: dateCheck.reasonRu,
			actionRecommendationsRu: isNotYet ? ["Проверьте дату визита или свяжитесь с куратором страховой компании."] : ["Запросите продление гарантийного письма у куратора ДМС.", "Вся сумма услуги переводится на оплату пациентом."],
		};
	}

	const scopeRejection = checkServiceScopeExclusion(letter, requestedKopecks, options);
	if (scopeRejection) return scopeRejection;

	const remaining = letter.remainingLimitKopecks;
	if (remaining <= 0) {
		return {
			letterId: letter.id, status: "rejected_limit_exhausted", isApproved: false, approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedKopecks, remainingLimitBeforeKopecks: remaining, remainingLimitAfterKopecks: 0,
			limitUsageRatioPercent: 100, warning80PercentReached: true, limitExceeded: true, isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Лимит гарантийного письма полностью исчерпан (${formatKopecksRu(letter.limitKopecks)})`,
			actionRecommendationsRu: ["Лимит исчерпан на 100%. Оплата визита полностью переходит на пациента.", "Запросите доплату или доп. согласование у страховщика."],
		};
	}

	const approvedInsurer = Math.min(requestedKopecks, remaining);
	const overflowPatient = requestedKopecks > remaining ? requestedKopecks - remaining : 0;
	const limitExceeded = overflowPatient > 0;
	const status: DmsCoverageEvaluationStatus = limitExceeded ? "partial_limit_exceeded" : "approved";
	if (limitExceeded) recommendations.push(`Превышение лимита гарантийного письма на ${formatKopecksRu(overflowPatient)}. Сумма превышения переведена в счет пациента.`);

	const newUsed = letter.usedKopecks + approvedInsurer;
	const newRemaining = Math.max(0, letter.limitKopecks - newUsed);
	const projectedUsageRatio = letter.limitKopecks > 0 ? (newUsed / letter.limitKopecks) * 100 : 100;
	const warning80 = projectedUsageRatio >= 80;
	let warningMessage: string | undefined;
	if (warning80 && !limitExceeded) {
		warningMessage = `Внимание: лимит гарантийного письма израсходован на ${projectedUsageRatio.toFixed(1)}% (остаток: ${formatKopecksRu(newRemaining)})`;
		recommendations.push("Рекомендуется уведомить пациента и куратора ДМС о скором исчерпании лимита.");
	}

	return {
		letterId: letter.id, status, isApproved: approvedInsurer > 0, approvedInsurerKopecks: approvedInsurer,
		overflowToPatientKopecks: overflowPatient, remainingLimitBeforeKopecks: remaining, remainingLimitAfterKopecks: newRemaining,
		limitUsageRatioPercent: Math.round(projectedUsageRatio), warning80PercentReached: warning80, limitExceeded, isDoctorWorkBlocked: false,
		coverageIndicatorRu: limitExceeded ? `Превышен лимит ДМС: ${formatKopecksRu(approvedInsurer)} покрыто, остаток ${formatKopecksRu(overflowPatient)} переведен на пациента` : "Покрывается ДМС в рамках гарантийного письма",
		warningMessageRu: warningMessage, actionRecommendationsRu: recommendations,
	};
}
