/**
 * dmsSplitEngine.ts — Canonical re-export facade from insuranceData SSOT.
 */

import {
	calculateDmsCoPaymentSplit,
	exportRegistryToCsv,
	formatCurrencyKopecks,
	formatCurrencyRub,
	kopecksToRub,
	rubToKopecks,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type DmsSplitCalculationResult,
	type PatientPaymentMethod,
	type PatientPaymentSplit,
} from "./insuranceData.js";

export * from "./insuranceData.js";

export type DmsBillableLineItem = DmsBillableItem;
export type DmsReconciliationRegistry = any;

export function calculatePatientPaymentSplit(
	totalPatientKopecks: number,
	paymentMethod: PatientPaymentMethod = "card",
	cashKopecksInput = 0,
): PatientPaymentSplit {
	const totKop = Math.max(0, totalPatientKopecks);
	let cashKop = 0;
	let cardKop = 0;
	let advanceKop = 0;

	if (paymentMethod === "cash") {
		cashKop = totKop;
	} else if (paymentMethod === "card") {
		cardKop = totKop;
	} else if (paymentMethod === "advance") {
		advanceKop = totKop;
	} else if (paymentMethod === "mixed") {
		cashKop = Math.min(totKop, Math.max(0, cashKopecksInput));
		cardKop = Math.max(0, totKop - cashKop);
	}

	return {
		paymentMethod,
		totalPatientKopecks: totKop,
		totalPatientRubles: kopecksToRub(totKop),
		cashKopecks: cashKop,
		cardKopecks: cardKop,
		advanceKopecks: advanceKop,
		cashRubles: kopecksToRub(cashKop),
		cardRubles: kopecksToRub(cardKop),
		advanceRubles: kopecksToRub(advanceKop),
		isBalanced: cashKop + cardKop + advanceKop === totKop,
	};
}

export function calculateDmsCoPaymentSplitWithPayment(
	lineItems: readonly DmsBillableItem[],
	options: {
		guaranteeLetter?: DmsGuaranteeLetter;
		paymentMethod?: PatientPaymentMethod;
		mixedCashKopecks?: number;
		previouslyUsedLetterAmountKopecks?: number;
		isEmergency?: boolean;
	} = {},
): DmsSplitCalculationResult {
	const split = calculateDmsCoPaymentSplit(lineItems, options);
	const paymentSplit = calculatePatientPaymentSplit(
		split.totalPatientOutOfPocketKopecks,
		options.paymentMethod || "card",
		options.mixedCashKopecks || 0,
	);
	return {
		...split,
		patientPaymentSplit,
	};
}

export function normalizeToothFdi(tooth: string | number | undefined): string {
	if (!tooth) return "";
	const s = String(tooth).trim();
	return s.replace(/\D/g, "");
}

export function isToothApprovedByLetter(tooth: string | undefined, letter?: DmsGuaranteeLetter): boolean {
	if (!tooth || !letter) return true;
	if (!letter.approvedTeethFdi || letter.approvedTeethFdi.length === 0) return true;
	const norm = normalizeToothFdi(tooth);
	return letter.approvedTeethFdi.some((t) => normalizeToothFdi(t) === norm);
}

export function isServiceCodeApprovedByLetter(code: string | undefined, letter?: DmsGuaranteeLetter): boolean {
	if (!code || !letter) return true;
	const codes = letter.approvedServiceCodes || letter.approvedServiceCodes804n;
	if (!codes || codes.length === 0) return true;
	return codes.includes(code);
}

export function buildDmsReconciliationRegistry(params: any): any {
	return {
		registryNumber: params.registryNumber || "REG-001",
		registryDate: params.registryDate || "2026-08-01",
		items: params.items || [],
		totalRegistryAmountRubles: 0,
		totalDmsClaimedRubles: 0,
		totalPatientCoPaymentRubles: 0,
	};
}

export function exportDmsRegistryToCsv(registry: any): string {
	return exportRegistryToCsv(
		registry.items || [],
		{ name: registry.clinicName || "Стоматологическая клиника", inn: registry.clinicInn || "" },
		registry.insurer?.shortName || "Страховая компания",
		`${registry.periodStart || ""} - ${registry.periodEnd || ""}`,
	);
}
