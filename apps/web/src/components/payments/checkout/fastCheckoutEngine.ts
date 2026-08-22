/**
 * DENTE Dental CRM — 1-Click Fast Checkout Math & 54-FZ FFD 1.2 Payload Engine
 */

import { type CheckoutPaymentMethodType } from "./fastCheckoutPresets";

export interface CheckoutSplitItem {
	readonly method: CheckoutPaymentMethodType;
	readonly amountKop: number;
}

export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
}

export interface FastCheckoutValidationResult {
	readonly isValid: boolean;
	readonly totalPaidKop: number;
	readonly totalBillKop: number;
	readonly remainingDueKop: number;
	readonly cashChangeDueKop: number;
	readonly errorMessageRu?: string | undefined;
}

export interface Ffd12FiscalPayload {
	readonly ffdVersion: "1.2";
	readonly orderId: string;
	readonly totalSumKop: number;
	readonly paymentsDistribution: {
		readonly cashKop: number;
		readonly electronicKop: number;
		readonly advancePrepaymentKop: number;
		readonly creditKop: number;
		readonly barterOtherKop: number;
	};
	readonly clientContact?: string | undefined;
	readonly taxSystem: string;
	readonly calculationType: 1;
}

export function validateCheckoutSplit(input: FastCheckoutInput): FastCheckoutValidationResult {
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

export function generate54FzFiscalPayload(input: FastCheckoutInput): Ffd12FiscalPayload {
	let cashKop = 0;
	let electronicKop = 0;
	let advancePrepaymentKop = 0;
	let creditKop = 0;
	let barterOtherKop = 0;

	for (const p of input.payments) {
		switch (p.method) {
			case "cash":
				cashKop += p.amountKop;
				break;
			case "bank_card":
			case "sbp_qr":
				electronicKop += p.amountKop;
				break;
			case "patient_deposit":
				advancePrepaymentKop += p.amountKop;
				break;
			case "dms_insurance":
				creditKop += p.amountKop;
				break;
			case "loyalty_points":
				barterOtherKop += p.amountKop;
				break;
		}
	}

	const contact = input.patientPhone || input.patientEmail || undefined;

	return {
		ffdVersion: "1.2",
		orderId: input.orderId,
		totalSumKop: input.totalBillKop,
		paymentsDistribution: {
			cashKop,
			electronicKop,
			advancePrepaymentKop,
			creditKop,
			barterOtherKop,
		},
		clientContact: contact,
		taxSystem: input.taxSystem || "usn_income_outcome",
		calculationType: 1,
	};
}
