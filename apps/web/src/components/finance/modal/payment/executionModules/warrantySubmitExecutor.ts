import { showToast } from "../../../../GlobalToast.js";
import type { PaymentExecutorContext } from "./paymentExecutionTypes.js";
import type { UsePaymentExecutionParams } from "./paymentExecutionTypes.js";
import { acquirePaymentLock, generatePaymentIdempotencyKey } from "./paymentIdempotencyManager.js";
import { dispatchPaymentApi, formatInvoiceItems } from "./paymentApiDispatcher.js";

export async function handleWarranty100Submit(
	params: UsePaymentExecutionParams,
	context: PaymentExecutorContext,
): Promise<boolean> {
	const {
		patientId, totalDueRub, rawTotalDueRub, isWarranty100, discountCalc, discountReason,
		selectedCashBoxType, selectedReceiptAlias, visitId, documentId, invoiceId,
		effectiveCashier, toothNumber, items, onClose,
	} = params;

	if (!isWarranty100 && totalDueRub > 0) return false;

	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: "warranty",
		patientId,
		amountRub: 0,
		method: "warranty_discount_100",
	});
	if (!acquirePaymentLock(clientMutationId)) return true;

	try {
		const res = await dispatchPaymentApi(
			{
				patientId,
				amountRub: 0,
				method: "warranty_discount_100",
				cashBoxType: selectedCashBoxType,
				receiptTypeAlias: selectedReceiptAlias,
				cashFlowCategory: "Гарантия / Без оплаты",
				visitId: visitId || null,
				documentId: documentId || (invoiceId ? invoiceId : null),
				clientMutationId,
				toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
				invoiceItems: formatInvoiceItems(items),
				note: `Оформление по 100% гарантии/скидке (0 ₽ • ${effectiveCashier}) [${discountReason || "Гарантия"}]`,
			},
			headers,
		);
		if (!res.success) {
			showToast(res.error || "Ошибка проведения гарантии", "error");
			return true;
		}
		showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
		context.handleBroadcastSuccess({
			method: "warranty_discount_100",
			amountKopecks: 0,
			discountRub: discountCalc.discountRub,
			discountPercent: discountCalc.discountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || "Гарантийная переделка / скидка 100%",
			...(res.data || {}),
		});
		onClose();
		return true;
	} catch (err: any) {
		showToast(err?.message || "Ошибка проведения гарантии", "error");
		return true;
	}
}
