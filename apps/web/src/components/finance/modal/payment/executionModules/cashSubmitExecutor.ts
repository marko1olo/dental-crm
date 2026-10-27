import { rubToKopecks, CASH_BOXES, CASH_RECEIPT_CATEGORIES } from "@dental/shared";
import { validate54FzBuyerInn } from "../../../cashboxOperations.js";
import { showToast } from "../../../../GlobalToast.js";
import type { PaymentExecutorContext, UsePaymentExecutionParams } from "./paymentExecutionTypes.js";
import { acquirePaymentLock, generatePaymentIdempotencyKey, releasePaymentLock } from "./paymentIdempotencyManager.js";
import { dispatchPaymentApi, formatInvoiceItems } from "./paymentApiDispatcher.js";
import { handleWarranty100Submit } from "./warrantySubmitExecutor.js";

export async function executeCashSubmit(
	params: UsePaymentExecutionParams,
	context: PaymentExecutorContext,
): Promise<void> {
	if (await handleWarranty100Submit(params, context)) return;

	const {
		patientId, totalDueRub, rawTotalDueRub, isWarranty100, discountReason, discountRub,
		effectiveDiscountPercent, selectedCashBoxType, selectedReceiptAlias, payerType,
		buyerInn, setBuyerInnError, receivedCashRub, cashChange, visitId, documentId,
		invoiceId, effectiveCashier, toothNumber, items, onClose,
	} = params;

	if (payerType === "legal_entity") {
		const validation = validate54FzBuyerInn(buyerInn, payerType);
		if (!validation.isValid) {
			setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
			showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
			return;
		}
	}

	const effectiveAmountRub = receivedCashRub > 0 && receivedCashRub < totalDueRub ? receivedCashRub : totalDueRub;
	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: "cash",
		patientId,
		amountRub: effectiveAmountRub,
		method: "cash",
		cashBoxType: selectedCashBoxType,
	});

	if (!acquirePaymentLock(clientMutationId)) return;

	try {
		const activeCategoryTitle = CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
		const activeBoxTitle = CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";
		const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
		const changeNote = cashChange.changeRub > 0 ? ` (получено ${receivedCashRub} ₽, сдача ${cashChange.changeRub} ₽)` : "";
		const cashFlowNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;

		const res = await dispatchPaymentApi(
			{
				patientId,
				amountRub: effectiveAmountRub,
				method: "cash",
				cashBoxType: selectedCashBoxType,
				receiptTypeAlias: selectedReceiptAlias,
				cashFlowCategory: activeCategoryTitle,
				visitId: visitId || null,
				documentId: documentId || (invoiceId ? invoiceId : null),
				clientMutationId,
				toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
				invoiceItems: formatInvoiceItems(items),
				note: `Оплата наличными через кассу (${effectiveAmountRub} ₽ • ${effectiveCashier})${changeNote}${innNote}${cashFlowNote}${toothNumber ? ` [Зуб ${toothNumber}]` : ""}`,
			},
			headers,
		);

		if (!res.success) {
			showToast(res.error || "Ошибка приёма наличных", "error");
			return;
		}

		showToast(`Оплата ${effectiveAmountRub} ₽ наличными принята в кассу (${effectiveCashier})`, "success");
		context.handleBroadcastSuccess({
			method: "cash",
			amountKopecks: isWarranty100 ? 0 : rubToKopecks(effectiveAmountRub),
			discountRub,
			discountPercent: effectiveDiscountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || undefined,
			...(res.data || {}),
		});
		onClose();
	} catch (err: unknown) {
		const errorMsg = err instanceof Error ? err.message : "Сбой соединения при приёме оплаты наличными";
		showToast(errorMsg, "error");
		context.setInterruptedPaymentState({
			isInterrupted: true,
			reason: errorMsg,
			method: "cash",
			amountRub: effectiveAmountRub,
		});
	} finally {
		releasePaymentLock(clientMutationId);
	}
}
