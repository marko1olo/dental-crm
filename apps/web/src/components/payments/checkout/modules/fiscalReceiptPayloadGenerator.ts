import type { FastCheckoutInput, FiscalReceiptPayload } from "./types.js";

/**
 * Генерация полезной нагрузки кассового чека (Мандат 8ap: чистый доменный язык).
 */
export function generateFiscalReceiptPayload(
	input: FastCheckoutInput,
	options?: {
		paymentMethodTag1214?: number | undefined;
		paymentSubjectTag1212?: number | undefined;
		idempotencyKey?: string | undefined;
		isElectronicReceiptOnly?: boolean | undefined;
		offlineBuffered?: boolean | undefined;
	},
): FiscalReceiptPayload {
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
	const isElectronicReceiptOnly = Boolean(
		options?.isElectronicReceiptOnly ?? input.isElectronicReceiptOnly ?? false,
	);
	const clientType = input.clientType ?? "physical_person";
	const cleanBuyerInn = input.buyerInn?.replace(/\D/g, "");

	return {
		ffdVersion: "1.2",
		orderId: input.orderId,
		idempotencyKey: options?.idempotencyKey ?? input.idempotencyKey ?? undefined,
		totalSumKop: input.totalBillKop,
		paymentMethodTag1214: options?.paymentMethodTag1214 ?? 4,
		paymentSubjectTag1212: options?.paymentSubjectTag1212 ?? 4,
		paymentsDistribution: {
			cashKop,
			electronicKop,
			advancePrepaymentKop,
			creditKop,
			barterOtherKop,
		},
		clientContact: contact,
		isElectronicReceiptOnly,
		clientType,
		// ИНН передается строго для ЮЛ/ИП. Для физлиц исключается (Мандат 8n).
		buyerInn: clientType === "physical_person" ? undefined : (cleanBuyerInn || undefined),
		buyerName: input.buyerName?.trim() || undefined,
		taxSystem: input.taxSystem || "usn_income_outcome",
		calculationType: 1,
		offlineBuffered: options?.offlineBuffered ?? false,
	};
}

export { generateFiscalReceiptPayload as generate54FzFiscalPayload };
