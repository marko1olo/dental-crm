/**
 * invoiceSplitCalculator.ts — Калькулятор сплит-расчета счетов между ДМС и пациентом
 */

import type { DmsGuaranteeLetterRecord, DmsProgramKey } from "../dmsInsurancePresets.js";
import { verifyServiceForDms } from "./serviceVerifier.js";
import type { DmsBillItemInput, DmsSplitInvoiceSummary, DmsSplitLineBreakdown, DmsSplitOptions } from "./types.js";

export function calculateDmsSplitInvoice(
	items: readonly DmsBillItemInput[],
	programKey: DmsProgramKey = "standard_therapy",
	guaranteeLetter?: DmsGuaranteeLetterRecord | null | undefined,
	options: DmsSplitOptions = {},
): DmsSplitInvoiceSummary {
	const { franchisePercent = 0, franchiseFixedKopecks = 0, currentVisitDate } = options;

	let currentRemainingLetterKopecks = guaranteeLetter ? Math.max(0, guaranteeLetter.totalLimitKopecks - guaranteeLetter.usedAmountKopecks) : 0;
	let remainingFixedFranchiseKopecks = Math.max(0, franchiseFixedKopecks);

	const breakdowns: DmsSplitLineBreakdown[] = [];
	let totalBillKopecks = 0;
	let totalDmsCoveredKopecks = 0;
	let totalPatientCoPayKopecks = 0;

	for (const item of items) {
		const lineTotalKopecks = item.unitPriceKopecks * Math.max(1, item.quantity);
		totalBillKopecks += lineTotalKopecks;

		const verification = verifyServiceForDms({
			serviceCode804n: item.serviceCode804n, serviceName: item.serviceName, toothNumber: item.toothNumber,
			programKey, guaranteeLetter: guaranteeLetter ? { ...guaranteeLetter, usedAmountKopecks: guaranteeLetter.totalLimitKopecks - currentRemainingLetterKopecks } : null,
			requestedPriceKopecks: lineTotalKopecks, currentVisitDate, isEmergency: options.isEmergency, hasAcutePain: options.hasAcutePain,
		});

		let dmsLineCoveredKopecks = 0;
		let franchiseDeductionKopecks = 0;

		if (verification.isCovered) {
			let rawDmsCovered = verification.dmsPayableKopecks;
			if (guaranteeLetter && verification.approvedByGuaranteeLetter) {
				const applicable = Math.min(rawDmsCovered, currentRemainingLetterKopecks);
				if (options.isEmergency || options.hasAcutePain) {
					currentRemainingLetterKopecks = Math.max(0, currentRemainingLetterKopecks - applicable);
				} else {
					rawDmsCovered = applicable;
					currentRemainingLetterKopecks -= applicable;
				}
			}

			if (franchisePercent > 0 && franchisePercent <= 100) {
				const percentDeduction = Math.round(rawDmsCovered * (franchisePercent / 100));
				franchiseDeductionKopecks += percentDeduction;
				rawDmsCovered -= percentDeduction;
			}

			if (remainingFixedFranchiseKopecks > 0 && rawDmsCovered > 0) {
				const fixedDeduction = Math.min(rawDmsCovered, remainingFixedFranchiseKopecks);
				franchiseDeductionKopecks += fixedDeduction;
				rawDmsCovered -= fixedDeduction;
				remainingFixedFranchiseKopecks -= fixedDeduction;
			}

			dmsLineCoveredKopecks = Math.max(0, rawDmsCovered);
		}

		const patientLineCoPayKopecks = lineTotalKopecks - dmsLineCoveredKopecks;
		totalDmsCoveredKopecks += dmsLineCoveredKopecks;
		totalPatientCoPayKopecks += patientLineCoPayKopecks;

		breakdowns.push({
			itemId: item.id, serviceCode804n: item.serviceCode804n, serviceName: item.serviceName,
			toothNumber: item.toothNumber, quantity: item.quantity, unitPriceKopecks: item.unitPriceKopecks,
			lineTotalKopecks, dmsCoveredKopecks: dmsLineCoveredKopecks, patientCoPayKopecks: patientLineCoPayKopecks,
			status: verification.status, statusLabel: verification.statusLabel,
			statusDescription: verification.reason, franchiseDeductionKopecks,
		});
	}

	const letterExcessKopecks = Math.max(0, totalBillKopecks - totalDmsCoveredKopecks);
	const balanceInvariantHolds = totalBillKopecks === totalDmsCoveredKopecks + totalPatientCoPayKopecks;
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);
	let warningMessage: string | undefined;
	if (isUrgentCare || !guaranteeLetter || (guaranteeLetter && currentRemainingLetterKopecks <= 0) || letterExcessKopecks > 0) {
		warningMessage = "Требуется досылка гарантийного письма ДМС";
	}

	return {
		lineItems: breakdowns, totalBillKopecks, totalDmsCoveredKopecks, totalPatientCoPayKopecks,
		letterInitialLimitKopecks: guaranteeLetter?.totalLimitKopecks ?? 0,
		letterUsedAmountKopecks: guaranteeLetter ? (guaranteeLetter.totalLimitKopecks - currentRemainingLetterKopecks) : 0,
		letterRemainingLimitKopecks: currentRemainingLetterKopecks, letterExcessKopecks,
		isFullyCoveredByDms: totalPatientCoPayKopecks === 0, hasPatientCoPay: totalPatientCoPayKopecks > 0,
		balanceInvariantHolds, warningMessage, isEmergency: isUrgentCare,
	};
}
