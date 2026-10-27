import { rubToKopecks, CASH_BOXES, CASH_RECEIPT_CATEGORIES } from "@dental/shared";
import { validate54FzBuyerInn } from "../../../cashboxOperations.js";
import { showToast } from "../../../../GlobalToast.js";
import type { PaymentExecutorContext, UsePaymentExecutionParams } from "./paymentExecutionTypes.js";
import { acquirePaymentLock, generatePaymentIdempotencyKey, releasePaymentLock } from "./paymentIdempotencyManager.js";
import { dispatchPaymentApi, formatInvoiceItems } from "./paymentApiDispatcher.js";
import { handleWarranty100Submit } from "./warrantySubmitExecutor.js";
import { balanceSplitTenders, determineSplitPrimaryMethod } from "./splitSubmitHelper.js";

export async function executeSplitSubmit(
	params: UsePaymentExecutionParams,
	context: PaymentExecutorContext,
): Promise<void> {
	if (await handleWarranty100Submit(params, context)) return;

	const {
		patientId, totalDueRub, rawTotalDueRub, isWarranty100, discountCalc, discountReason,
		discountRub, effectiveDiscountPercent, selectedCashBoxType, selectedReceiptAlias,
		payerType, buyerInn, setBuyerInnError, splitCardRub, setSplitCardRub,
		splitCashRub, setSplitCashRub, splitDepositRub, splitSbpRub, splitCertificateRub,
		splitBonusRub, splitDmsRub = 0, guaranteeLetterId, isBalanced, visitId,
		documentId, invoiceId, effectiveCashier, toothNumber, items, onClose,
	} = params;

	if (payerType === "legal_entity") {
		const val = validate54FzBuyerInn(buyerInn, payerType);
		if (!val.isValid) {
			setBuyerInnError(val.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
			return void showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
		}
	}

	let effectiveCardRub = splitCardRub;
	let effectiveCashRub = splitCashRub;
	if (!isBalanced) {
		const otherKop = rubToKopecks(splitDepositRub) + rubToKopecks(splitSbpRub) + rubToKopecks(splitCertificateRub) + rubToKopecks(splitBonusRub) + rubToKopecks(splitDmsRub || 0);
		const balanced = balanceSplitTenders(totalDueRub, effectiveCashRub, effectiveCardRub, otherKop);
		effectiveCashRub = balanced.cashRub;
		effectiveCardRub = balanced.cardRub;
		setSplitCardRub(effectiveCardRub);
		setSplitCashRub(effectiveCashRub);
	}

	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: "split", patientId, amountRub: totalDueRub, method: "split", cashBoxType: selectedCashBoxType,
	});
	if (!acquirePaymentLock(clientMutationId)) return;

	try {
		const activeCategory = CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
		const activeBox = CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";
		const parts: string[] = [];
		if (effectiveCardRub > 0) parts.push(`карта ${effectiveCardRub} ₽`);
		if (effectiveCashRub > 0) parts.push(`нал ${effectiveCashRub} ₽`);
		if (splitDepositRub > 0) parts.push(`аванс ${splitDepositRub} ₽`);
		if (splitSbpRub > 0) parts.push(`СБП ${splitSbpRub} ₽`);
		if (splitCertificateRub > 0) parts.push(`сертификат ${splitCertificateRub} ₽`);
		if (splitBonusRub > 0) parts.push(`бонусы ${splitBonusRub} ₽`);
		if ((splitDmsRub || 0) > 0) parts.push(`ДМС ${splitDmsRub} ₽`);

		const cashKop = rubToKopecks(effectiveCashRub);
		const electronicKop = rubToKopecks(effectiveCardRub) + rubToKopecks(splitSbpRub);
		const depositKop = rubToKopecks(splitDepositRub);
		const dmsKop = rubToKopecks(splitDmsRub || 0);
		const isSplit = (cashKop > 0 && electronicKop > 0) || (depositKop > 0 && (cashKop > 0 || electronicKop > 0 || dmsKop > 0)) || (dmsKop > 0 && (cashKop > 0 || electronicKop > 0 || depositKop > 0));
		const method = determineSplitPrimaryMethod(isSplit, dmsKop, effectiveCashRub, effectiveCardRub, splitSbpRub, splitDepositRub);

		const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
		const note = `Комбинированная оплата (${effectiveCashier}): ${parts.join(" + ")}${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${innNote} [ДДС: ${activeCategory} | Касса: ${activeBox}]${toothNumber ? ` [Зуб ${toothNumber}]` : ""}`;

		const res = await dispatchPaymentApi({
			patientId, amountRub: totalDueRub, method: isSplit ? "split" : method,
			cashAmountKopecks: cashKop > 0 ? cashKop : undefined, electronicAmountKopecks: electronicKop > 0 ? electronicKop : undefined,
			dmsAmountKopecks: dmsKop > 0 ? dmsKop : undefined, depositAmountKopecks: depositKop > 0 ? depositKop : undefined,
			cashAmountRub: effectiveCashRub > 0 ? effectiveCashRub : undefined,
			electronicAmountRub: effectiveCardRub + splitSbpRub > 0 ? Number((effectiveCardRub + splitSbpRub).toFixed(2)) : undefined,
			dmsAmountRub: (splitDmsRub || 0) > 0 ? splitDmsRub : undefined, depositAmountRub: splitDepositRub > 0 ? splitDepositRub : undefined,
			guaranteeLetterId: guaranteeLetterId || undefined, cashBoxType: selectedCashBoxType, receiptTypeAlias: selectedReceiptAlias,
			cashFlowCategory: activeCategory, visitId: visitId || null, documentId: documentId || (invoiceId ? invoiceId : null),
			clientMutationId, toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
			invoiceItems: formatInvoiceItems(items), note,
		}, headers);

		if (!res.success) return void showToast(res.error || "Ошибка записи комбинированной оплаты", "error");
		showToast(`Комбинированная оплата ${totalDueRub} ₽ успешно принята (${effectiveCashier})`, "success");
		context.handleBroadcastSuccess({
			method: "split", amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks, discountRub,
			discountPercent: effectiveDiscountPercent, rawTotalRub: rawTotalDueRub, discountReason: discountReason || undefined, ...(res.data || {}),
		});
		onClose();
	} catch (err: unknown) {
		const errorMsg = err instanceof Error ? err.message : "Сбой соединения при приёме комбинированной оплаты";
		showToast(errorMsg, "error");
		context.setInterruptedPaymentState({ isInterrupted: true, reason: errorMsg, method: "split", amountRub: totalDueRub });
	} finally {
		releasePaymentLock(clientMutationId);
	}
}
