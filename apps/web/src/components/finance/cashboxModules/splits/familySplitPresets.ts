/**
 * familySplitPresets.ts — Layer 2: Family & Remainder Tender Preset Helpers.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 */

import type {
	MultiTenderStateRub,
	TenderAllocationTarget,
} from "../cashboxTypes.js";
import { calculateCombinedFamilyCashCardSplit } from "./familySplitCalculations.js";
import { allocateRemainderToTender } from "./tenderRemainderAllocation.js";

export function createThreeWaySplitTenders(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamily?: boolean | undefined;
}): MultiTenderStateRub {
	return calculateCombinedFamilyCashCardSplit({
		totalDueRub: params.totalDueRub,
		patientDepositRub: params.patientDepositRub,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub,
		availableBonusRub: params.availableBonusRub,
		preferFamilyAccount: params.preferFamily,
	}).tenders;
}

export function autoDistributeSplitRemainder(params: {
	readonly totalDueRub: number;
	readonly currentTenders: MultiTenderStateRub;
	readonly targetTender?: TenderAllocationTarget | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableCertificateRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
}): MultiTenderStateRub {
	return allocateRemainderToTender({
		totalDueRub: params.totalDueRub,
		currentTenders: params.currentTenders,
		targetTender: params.targetTender ?? "card_and_cash_5050",
		patientDepositRub: params.patientDepositRub,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub,
		availableCertificateRub: params.availableCertificateRub,
		availableBonusRub: params.availableBonusRub,
	});
}

export function createFamilyCashCardComboTenders(params: {
	readonly totalDueRub: number;
	readonly patientFamilyBalanceRub: number;
}): MultiTenderStateRub {
	return calculateCombinedFamilyCashCardSplit({
		totalDueRub: params.totalDueRub,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub,
		preferFamilyAccount: true,
	}).tenders;
}
