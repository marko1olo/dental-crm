/**
 * paymentSplitCalculator.ts — Расчет разделения способов оплаты доплаты пациента (касса)
 */

import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type { PatientPaymentMethod, PatientPaymentSplit } from "./types.js";

export function calculatePatientPaymentSplit(
	totalPatientOutOfPocketKopecks: number,
	options: {
		preferredMethod?: PatientPaymentMethod | undefined;
		cashKopecks?: number | undefined;
		cardKopecks?: number | undefined;
		advanceKopecks?: number | undefined;
		cashRubles?: number | undefined;
		cardRubles?: number | undefined;
		advanceRubles?: number | undefined;
	} = {},
): PatientPaymentSplit {
	const totalKop = Math.max(0, Math.round(totalPatientOutOfPocketKopecks));
	const method = options.preferredMethod ?? (options.cashKopecks || options.cashRubles ? "mixed" : "card");

	let cashKop = 0;
	let cardKop = 0;
	let advanceKop = 0;

	if (method === "cash") {
		cashKop = totalKop;
	} else if (method === "card") {
		cardKop = totalKop;
	} else if (method === "advance") {
		advanceKop = totalKop;
	} else if (method === "mixed") {
		if (options.cashKopecks !== undefined) {
			cashKop = Math.max(0, Math.round(options.cashKopecks));
		} else if (options.cashRubles !== undefined) {
			cashKop = Math.max(0, rublesToKopecks(options.cashRubles));
		}

		if (options.advanceKopecks !== undefined) {
			advanceKop = Math.max(0, Math.round(options.advanceKopecks));
		} else if (options.advanceRubles !== undefined) {
			advanceKop = Math.max(0, rublesToKopecks(options.advanceRubles));
		}

		if (options.cardKopecks !== undefined) {
			cardKop = Math.max(0, Math.round(options.cardKopecks));
		} else if (options.cardRubles !== undefined) {
			cardKop = Math.max(0, rublesToKopecks(options.cardRubles));
		} else {
			cardKop = Math.max(0, totalKop - cashKop - advanceKop);
		}

		const allocated = cashKop + cardKop + advanceKop;
		if (allocated !== totalKop) {
			const diff = totalKop - (cashKop + advanceKop);
			cardKop = Math.max(0, diff);
		}
	}

	const sum = cashKop + cardKop + advanceKop;
	const isBalanced = sum === totalKop;
	const balanceDiscrepancyKopecks = Math.abs(sum - totalKop);

	return {
		paymentMethod: method,
		totalPatientKopecks: totalKop,
		totalPatientRubles: kopecksToRubles(totalKop),
		cashKopecks: cashKop,
		cardKopecks: cardKop,
		advanceKopecks: advanceKop,
		cashRubles: kopecksToRubles(cashKop),
		cardRubles: kopecksToRubles(cardKop),
		advanceRubles: kopecksToRubles(advanceKop),
		isBalanced,
		balanceDiscrepancyKopecks,
	};
}
