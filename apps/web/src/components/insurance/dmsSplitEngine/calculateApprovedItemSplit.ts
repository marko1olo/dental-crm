/**
 * calculateApprovedItemSplit.ts — Расчет сооплаты для согласованной гарантийным письмом услуги
 */

import { kopecksToRubles } from "@dental/shared";
import { formatCurrencyRub } from "./matchers.js";
import type { SingleItemSplitOptions, SingleItemSplitOutput } from "./singleItemSplitTypes.js";
import type { DmsBillableLineItem } from "./types.js";

export function calculateApprovedItemSplit(
	item: DmsBillableLineItem,
	qty: number,
	totalKop: number,
	opts: SingleItemSplitOptions,
): SingleItemSplitOutput {
	const { policy, guaranteeLetter, isUrgentCare, availableLetterLimitKopecks } = opts;
	const fType = policy?.franchiseType ?? guaranteeLetter?.franchiseType ?? "percent";
	const fPercent = policy?.franchisePercent ?? guaranteeLetter?.franchisePercent ?? guaranteeLetter?.franchisePct ?? 0;
	const fFixedKop = policy?.franchiseFixedKopecks ?? guaranteeLetter?.franchiseFixedKopecks ?? (guaranteeLetter?.franchiseFixedRub ? Math.round(guaranteeLetter.franchiseFixedRub * 100) : 0);

	let fDed = 0;
	if (fType === "percent" && fPercent > 0) fDed = Math.round((totalKop * fPercent) / 100);
	else if ((fType === "fixed" || (fType as string) === "fixed_rub" || (fType as string) === "fixed_kopecks") && fFixedKop > 0) fDed = Math.min(totalKop, fFixedKop);

	const potDms = Math.max(0, totalKop - fDed);
	let actDms = 0;
	let dmsDed = 0;
	let status: "full_dms" | "co_payment" | "patient_full" = "full_dms";
	let reason = "100% покрыто по программе ДМС";

	if (availableLetterLimitKopecks >= potDms) {
		actDms = potDms;
		dmsDed = potDms;
		if (fDed > 0) {
			status = "co_payment";
			reason = `Сооплата пациентом франшизы ${fPercent > 0 ? `${fPercent}%` : ""}${fFixedKop > 0 ? `${formatCurrencyRub(fFixedKop, true)}` : ""} (${formatCurrencyRub(fDed, true)})`;
		}
	} else if (availableLetterLimitKopecks > 0) {
		actDms = isUrgentCare ? potDms : availableLetterLimitKopecks;
		dmsDed = availableLetterLimitKopecks;
		status = isUrgentCare ? "full_dms" : "co_payment";
		reason = isUrgentCare ? "Экстренная помощь сверх лимита ГП. Требуется досылка письма ДМС" : `Превышен лимит ГП на ${formatCurrencyRub(potDms - actDms, true)}. Остаток доплачивает пациент.`;
	} else if (isUrgentCare) {
		actDms = potDms;
		status = "full_dms";
		reason = "Экстренная помощь сверх лимита ГП. Требуется досылка письма ДМС";
	} else {
		actDms = 0;
		status = "patient_full";
		reason = "Лимит гарантийного письма полностью исчерпан. Оплата пациентом.";
	}

	const patPaid = totalKop - actDms;
	return {
		splitResult: {
			lineItemId: item.id, id: item.id, serviceCode: item.serviceCode, serviceCode804n: item.serviceCode,
			serviceName: item.serviceName, toothNumber: item.toothNumber, quantity: qty,
			unitPriceKopecks: item.unitPriceKopecks, totalKopecks: totalKop,
			insuranceCoveredKopecks: actDms, coveredByDmsKopecks: actDms,
			patientOutOfPocketKopecks: patPaid, patientTotalKopecks: patPaid,
			insuranceCoveredRubles: kopecksToRubles(actDms), patientOutOfPocketRubles: kopecksToRubles(patPaid),
			status, splitReason: reason, isApprovedByLetter: true, isExcludedByPolicy: false,
			franchiseDeductionKopecks: fDed, copayKopecks: fDed, patientExcludedKopecks: 0,
			patientExceededLimitKopecks: status === "co_payment" && fDed === 0 ? patPaid : patPaid > fDed ? patPaid - fDed : 0,
		},
		dmsCoveredDeductedKopecks: dmsDed, hasUnapprovedTeeth: false, hasExcludedServices: false,
	};
}
