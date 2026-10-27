import { CASH_BOXES, CASH_RECEIPT_CATEGORIES } from "@dental/shared";
import { showToast } from "../../../../GlobalToast.js";
import type { PaymentExecutorContext, UsePaymentExecutionParams } from "./paymentExecutionTypes.js";
import { acquirePaymentLock, generatePaymentIdempotencyKey, releasePaymentLock } from "./paymentIdempotencyManager.js";
import { dispatchPaymentApi, formatInvoiceItems } from "./paymentApiDispatcher.js";

export async function executeDepositSubmit(
	params: UsePaymentExecutionParams,
	source: "deposit" | "family",
	context: PaymentExecutorContext,
): Promise<void> {
	const {
		patientId, totalDueRub, rawTotalDueRub, isWarranty100, discountCalc, discountReason,
		discountRub, effectiveDiscountPercent, selectedCashBoxType, selectedReceiptAlias,
		visitId, documentId, invoiceId, toothNumber, items, onClose,
	} = params;

	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: source,
		patientId,
		amountRub: totalDueRub,
		method: "family_wallet",
		cashBoxType: selectedCashBoxType,
	});

	if (!acquirePaymentLock(clientMutationId)) return;

	try {
		const activeCategory = CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
		const activeBox = CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";
		const cashFlowNote = ` [ДДС: ${activeCategory} | Касса: ${activeBox}]`;
		const sourceLabel = source === "family" ? "семейного баланса" : "лицевого счета / аванса";

		const res = await dispatchPaymentApi(
			{
				patientId,
				amountRub: totalDueRub,
				method: "family_wallet",
				cashBoxType: selectedCashBoxType,
				receiptTypeAlias: selectedReceiptAlias,
				cashFlowCategory: activeCategory,
				visitId: visitId || null,
				documentId: documentId || (invoiceId ? invoiceId : null),
				clientMutationId,
				toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
				invoiceItems: formatInvoiceItems(items),
				note: `Оплата с ${sourceLabel} (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${cashFlowNote}${toothNumber ? ` [Зуб ${toothNumber}]` : ""}`,
			},
			headers,
		);

		if (!res.success) {
			showToast(res.error || "Ошибка списания со счета", "error");
			context.setInterruptedPaymentState({
				isInterrupted: true,
				reason: res.error ? res.error : "Ошибка списания со счета",
				method: source,
				amountRub: totalDueRub,
			});
			return;
		}

		showToast(
			source === "family"
				? `Оплата ${totalDueRub} ₽ с семейного баланса успешно списана`
				: `Оплата ${totalDueRub} ₽ с аванса/депозита успешно списана`,
			"success",
		);
		context.handleBroadcastSuccess({
			method: source,
			amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
			discountRub,
			discountPercent: effectiveDiscountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || undefined,
			...(res.data || {}),
		});
		onClose();
	} catch (err: unknown) {
		const errorMsg = err instanceof Error ? err.message : "Сбой соединения при списании со счета";
		showToast(errorMsg, "error");
		context.setInterruptedPaymentState({
			isInterrupted: true,
			reason: errorMsg,
			method: source,
			amountRub: totalDueRub,
		});
	} finally {
		releasePaymentLock(clientMutationId);
	}
}
