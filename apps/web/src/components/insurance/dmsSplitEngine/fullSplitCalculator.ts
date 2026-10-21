/**
 * fullSplitCalculator.ts — Комплексный расчет сплита ДМС и способов оплаты пациента
 */

import { calculatePatientPaymentSplit } from "./paymentSplitCalculator.js";
import { calculateDmsCoPaymentSplit } from "./splitCalculator.js";
import type {
	DmsBillableLineItem,
	DmsGuaranteeLetter,
	DmsSplitCalculationResult,
	PatientPaymentMethod,
} from "./types.js";
import type { DmsPolicy } from "../insuranceCatalogs.js";

export function calculateDmsCoPaymentSplitWithPayment(
	lineItems: readonly DmsBillableLineItem[],
	optionsOrLetter?:
		| {
				policy?: DmsPolicy | undefined;
				guaranteeLetter?: DmsGuaranteeLetter | undefined;
				previouslyUsedLetterAmountKopecks?: number | undefined;
				visitDate?: string | undefined;
				lastHygieneDate?: string | undefined;
				isEmergency?: boolean | undefined;
				hasAcutePain?: boolean | undefined;
				patientPaymentMethod?: PatientPaymentMethod | undefined;
				patientCashKopecks?: number | undefined;
				patientCardKopecks?: number | undefined;
				patientAdvanceKopecks?: number | undefined;
				patientCashRubles?: number | undefined;
				patientCardRubles?: number | undefined;
				patientAdvanceRubles?: number | undefined;
		  }
		| DmsGuaranteeLetter
		| undefined,
	legacyPaymentMethod?: PatientPaymentMethod | undefined,
	legacyCashKopecks?: number | undefined,
): DmsSplitCalculationResult {
	const options =
		optionsOrLetter && "letterNumber" in optionsOrLetter
			? {
					guaranteeLetter: optionsOrLetter,
					patientPaymentMethod: legacyPaymentMethod,
					patientCashKopecks: legacyCashKopecks,
				}
			: optionsOrLetter || {};

	const base = calculateDmsCoPaymentSplit(lineItems, options);
	const paymentSplit = calculatePatientPaymentSplit(
		base.totalPatientOutOfPocketKopecks,
		{
			preferredMethod: options.patientPaymentMethod,
			cashKopecks: options.patientCashKopecks,
			cardKopecks: options.patientCardKopecks,
			advanceKopecks: options.patientAdvanceKopecks,
			cashRubles: options.patientCashRubles,
			cardRubles: options.patientCardRubles,
			advanceRubles: options.patientAdvanceRubles,
		},
	);

	const financialInvariant =
		base.totalInsuranceCoveredKopecks +
			paymentSplit.cashKopecks +
			paymentSplit.cardKopecks +
			paymentSplit.advanceKopecks ===
		base.totalBillKopecks;

	return {
		...base,
		integrityInvariantHolds: base.integrityInvariantHolds && financialInvariant && paymentSplit.isBalanced,
		patientPaymentSplit: paymentSplit,
	};
}
