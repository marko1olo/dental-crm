import { validateBuyerInn } from "./buyerInnValidation.js";
import type { FastCheckoutInput, FastCheckoutValidationResult } from "./types.js";

/**
 * Валидация сплит-платежа и суммы чека (Мандат 8e):
 * - Свобода для физлиц (ИНН не требуется).
 * - Разрешена 100% гарантийная скидка (0 ₽).
 */
export function validateCheckoutSplit(input: FastCheckoutInput): FastCheckoutValidationResult {
	const innValidation = validateBuyerInn({
		clientType: input.clientType,
		buyerInn: input.buyerInn,
	});

	if (!innValidation.isValid && innValidation.errorRu) {
		return {
			isValid: false,
			totalPaidKop: 0,
			totalBillKop: input.totalBillKop,
			remainingDueKop: input.totalBillKop,
			cashChangeDueKop: 0,
			errorMessageRu: innValidation.errorRu,
		};
	}

	let totalPaid = 0;
	let cashAmount = 0;

	for (const p of input.payments) {
		totalPaid += p.amountKop;
		if (p.method === "cash") {
			cashAmount += p.amountKop;
		}
	}

	const remaining = input.totalBillKop - totalPaid;
	let cashChange = 0;

	if (cashAmount > 0 && input.cashTenderedKop !== undefined && input.cashTenderedKop > cashAmount) {
		cashChange = input.cashTenderedKop - cashAmount;
	}

	if (remaining > 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Недоплата: " + (remaining / 100).toFixed(2) + " ₽",
		};
	}

	if (remaining < 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Переплата по безналу/сертификатам: " + (Math.abs(remaining) / 100).toFixed(2) + " ₽",
		};
	}

	return {
		isValid: true,
		totalPaidKop: totalPaid,
		totalBillKop: input.totalBillKop,
		remainingDueKop: 0,
		cashChangeDueKop: cashChange,
	};
}
