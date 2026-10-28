import type { DmsGuaranteeLetter } from "./guaranteeTypes.js";
import type { DmsCoverageEvaluation, DmsCoverageEvaluationOptions } from "./guaranteeEvaluationTypes.js";
import type { Kopecks } from "../../utils/money.js";

export function checkServiceScopeExclusion(
	letter: DmsGuaranteeLetter,
	requestedKopecks: Kopecks,
	options: DmsCoverageEvaluationOptions,
): DmsCoverageEvaluation | null {
	if (!options.serviceCode804n) return null;
	const code = options.serviceCode804n.trim();

	if (letter.excluded804nCodes?.includes(code)) {
		return {
			letterId: letter.id, status: "rejected_service_excluded", isApproved: false, approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedKopecks, remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: letter.limitKopecks > 0 ? Math.round((letter.usedKopecks / letter.limitKopecks) * 100) : 0,
			warning80PercentReached: false, limitExceeded: false, isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Услуга ${code} (${options.serviceName ?? ""}) исключена из покрытия данным гарантийным письмом`,
			actionRecommendationsRu: ["Услуга не входит в программу ДМС застрахованного. Оплата производится пациентом."],
		};
	}

	if (letter.allowed804nPrefixes && letter.allowed804nPrefixes.length > 0 && !letter.allowed804nPrefixes.some((p) => code.startsWith(p))) {
		return {
			letterId: letter.id, status: "rejected_service_not_in_allowed_list", isApproved: false, approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedKopecks, remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: letter.limitKopecks > 0 ? Math.round((letter.usedKopecks / letter.limitKopecks) * 100) : 0,
			warning80PercentReached: false, limitExceeded: false, isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Код услуги ${code} не соответствует разрешенным разделам программы (${letter.allowed804nPrefixes.join(", ")})`,
			actionRecommendationsRu: ["Согласуйте расширение гарантийного письма со страховой компанией."],
		};
	}

	return null;
}
