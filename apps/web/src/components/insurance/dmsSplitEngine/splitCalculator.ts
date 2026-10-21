/**
 * splitCalculator.ts — Математический расчет распределения счетов по ДМС
 */

import { kopecksToRubles } from "@dental/shared";
import type { DmsPolicy } from "../insuranceCatalogs.js";
import { calculateSingleItemSplit } from "./calculateSingleItemSplit.js";
import type { DmsBillableLineItem, DmsGuaranteeLetter, DmsSplitCalculationResult, DmsSplitLineResult } from "./types.js";

export function calculateDmsCoPaymentSplit(
	lineItems: readonly DmsBillableLineItem[],
	options: {
		policy?: DmsPolicy | undefined;
		guaranteeLetter?: DmsGuaranteeLetter | undefined;
		previouslyUsedLetterAmountKopecks?: number | undefined;
		visitDate?: string | undefined;
		lastHygieneDate?: string | undefined;
		isEmergency?: boolean | undefined;
		hasAcutePain?: boolean | undefined;
	} = {},
): DmsSplitCalculationResult {
	const { policy, guaranteeLetter } = options;
	const previouslyUsed = options.previouslyUsedLetterAmountKopecks ?? 0;
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);

	const letterLimit = guaranteeLetter
		? (guaranteeLetter.maxApprovedAmountKopecks ??
			guaranteeLetter.maxCoverageKopecks ??
			(guaranteeLetter.maxCoverageRub !== undefined
				? Math.round(guaranteeLetter.maxCoverageRub * 100)
				: Number.POSITIVE_INFINITY))
		: Number.POSITIVE_INFINITY;

	let availableLetterLimitKopecks = Math.max(0, letterLimit - previouslyUsed);
	const splitResults: DmsSplitLineResult[] = [];
	let hasUnapprovedTeeth = false;
	let hasExcludedServices = false;

	for (const item of lineItems) {
		const out = calculateSingleItemSplit(item, {
			policy,
			guaranteeLetter,
			visitDate: options.visitDate,
			lastHygieneDate: options.lastHygieneDate,
			isUrgentCare,
			availableLetterLimitKopecks,
		});
		splitResults.push(out.splitResult);
		if (out.hasUnapprovedTeeth) hasUnapprovedTeeth = true;
		if (out.hasExcludedServices) hasExcludedServices = true;
		availableLetterLimitKopecks = Math.max(0, availableLetterLimitKopecks - out.dmsCoveredDeductedKopecks);
	}

	const totalBillKopecks = splitResults.reduce((acc, item) => acc + item.totalKopecks, 0);
	const totalInsuranceCoveredKopecks = splitResults.reduce((acc, item) => acc + item.insuranceCoveredKopecks, 0);
	const totalPatientOutOfPocketKopecks = splitResults.reduce((acc, item) => acc + item.patientOutOfPocketKopecks, 0);
	const letterApprovedLimitKopecks = guaranteeLetter ? (guaranteeLetter.maxApprovedAmountKopecks ?? guaranteeLetter.approvedAmountKopecks ?? 0) : 0;
	const letterRemainingLimitKopecks = Number.isFinite(availableLetterLimitKopecks) ? availableLetterLimitKopecks : 0;
	const letterExcessAmountKopecks = guaranteeLetter ? Math.max(0, totalBillKopecks - letterApprovedLimitKopecks) : 0;
	const integrityInvariantHolds = totalInsuranceCoveredKopecks + totalPatientOutOfPocketKopecks === totalBillKopecks;

	let warningMessage: string | undefined;
	if (isUrgentCare || hasUnapprovedTeeth || hasExcludedServices || !guaranteeLetter) {
		warningMessage = "Требуется досылка гарантийного письма ДМС";
	}

	return {
		lineItems: splitResults, lines: splitResults,
		totalBillKopecks, totalInsuranceCoveredKopecks, dmsCoveredKopecks: totalInsuranceCoveredKopecks,
		totalPatientOutOfPocketKopecks, patientTotalKopecks: totalPatientOutOfPocketKopecks,
		totalBillRubles: kopecksToRubles(totalBillKopecks),
		totalInsuranceCoveredRubles: kopecksToRubles(totalInsuranceCoveredKopecks),
		totalPatientOutOfPocketRubles: kopecksToRubles(totalPatientOutOfPocketKopecks),
		letterApprovedLimitKopecks, letterRemainingLimitKopecks, remainingLimitKopecks: letterRemainingLimitKopecks,
		letterExcessAmountKopecks, hasUnapprovedTeeth, hasExcludedServices, integrityInvariantHolds,
		warningMessage, isEmergency: isUrgentCare,
	};
}
