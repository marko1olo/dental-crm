/**
 * apps/web/src/components/finance/modal/payment/executionModules/paymentSubmitExecutors.ts
 *
 * Dedicated submit executors for Cash, Split, and Deposit / Family wallet payments.
 * Complies with 54-FZ FFD 1.2, Mandate 8e (Doctor Autonomy), Mandate 8i (Kopeck Precision).
 */

import {
	kopecksToRub,
	rubToKopecks,
	CASH_BOXES,
	CASH_RECEIPT_CATEGORIES,
} from "@dental/shared";
import { validate54FzBuyerInn } from "../../../cashboxOperations.js";
import { showToast } from "../../../../GlobalToast.js";
import type { InterruptedPaymentState, UsePaymentExecutionParams } from "./paymentExecutionTypes.js";
import {
	acquirePaymentLock,
	generatePaymentIdempotencyKey,
	releasePaymentLock,
} from "./paymentIdempotencyManager.js";
import { dispatchPaymentApi, formatInvoiceItems } from "./paymentApiDispatcher.js";

export interface PaymentExecutorContext {
	readonly handleBroadcastSuccess: NonNullable<UsePaymentExecutionParams["onSuccess"]>;
	readonly setInterruptedPaymentState: (state: InterruptedPaymentState) => void;
}



export async function executeCashSubmit(
	params: UsePaymentExecutionParams,
	context: PaymentExecutorContext,
): Promise<void> {
	const {
		patientId,
		totalDueRub,
		rawTotalDueRub,
		isWarranty100,
		discountCalc,
		discountReason,
		discountRub,
		effectiveDiscountPercent,
		selectedCashBoxType,
		selectedReceiptAlias,
		payerType,
		buyerInn,
		setBuyerInnError,
		receivedCashRub,
		cashChange,
		visitId,
		documentId,
		invoiceId,
		effectiveCashier,
		toothNumber,
		items,
		onClose,
	} = params;

	if (isWarranty100 || totalDueRub <= 0) {
		const { clientMutationId, headers } = generatePaymentIdempotencyKey({
			prefix: "warranty",
			patientId,
			amountRub: 0,
			method: "warranty_discount_100",
		});
		if (!acquirePaymentLock(clientMutationId)) return;
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
				return;
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
			return;
		} catch (err: any) {
			showToast(err?.message || "Ошибка проведения гарантии", "error");
			return;
		}
	}

	if (payerType === "legal_entity") {
		const validation = validate54FzBuyerInn(buyerInn, payerType);
		if (!validation.isValid) {
			setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
			showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
			return;
		}
	}

	const effectiveAmountRub =
		receivedCashRub > 0 && receivedCashRub < totalDueRub ? receivedCashRub : totalDueRub;

	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: "cash",
		patientId,
		amountRub: effectiveAmountRub,
		method: "cash",
		cashBoxType: selectedCashBoxType,
	});

	if (!acquirePaymentLock(clientMutationId)) return;

	try {
		const activeCategoryTitle =
			CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
			"Оплата услуг";
		const activeBoxTitle =
			CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

		const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
		const changeNote =
			cashChange.changeRub > 0
				? ` (получено ${receivedCashRub} ₽, сдача ${cashChange.changeRub} ₽)`
				: "";
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

		showToast(
			`Оплата ${effectiveAmountRub} ₽ наличными принята в кассу (${effectiveCashier})`,
			"success",
		);
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
		const errorMsg =
			err instanceof Error ? err.message : "Сбой соединения при приёме оплаты наличными";
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

export async function executeSplitSubmit(
	params: UsePaymentExecutionParams,
	context: PaymentExecutorContext,
): Promise<void> {
	const {
		patientId,
		totalDueRub,
		rawTotalDueRub,
		isWarranty100,
		discountCalc,
		discountReason,
		discountRub,
		effectiveDiscountPercent,
		selectedCashBoxType,
		selectedReceiptAlias,
		payerType,
		buyerInn,
		setBuyerInnError,
		splitCardRub,
		setSplitCardRub,
		splitCashRub,
		setSplitCashRub,
		splitDepositRub,
		splitSbpRub,
		splitCertificateRub,
		splitBonusRub,
		splitDmsRub = 0,
		guaranteeLetterId,
		isBalanced,
		visitId,
		documentId,
		invoiceId,
		effectiveCashier,
		toothNumber,
		items,
		onClose,
	} = params;

	if (isWarranty100 || totalDueRub <= 0) {
		const { clientMutationId, headers } = generatePaymentIdempotencyKey({
			prefix: "warranty",
			patientId,
			amountRub: 0,
			method: "warranty_discount_100",
		});
		if (!acquirePaymentLock(clientMutationId)) return;
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
				return;
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
			return;
		} catch (err: any) {
			showToast(err?.message || "Ошибка проведения гарантии", "error");
			return;
		}
	}

	if (payerType === "legal_entity") {
		const validation = validate54FzBuyerInn(buyerInn, payerType);
		if (!validation.isValid) {
			setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
			showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
			return;
		}
	}

	let effectiveCardRub = splitCardRub;
	let effectiveCashRub = splitCashRub;
	const effectiveDepositRub = splitDepositRub;
	const effectiveSbpRub = splitSbpRub;
	const effectiveCertificateRub = splitCertificateRub;
	const effectiveBonusRub = splitBonusRub;
	const effectiveDmsRub = splitDmsRub || 0;

	if (!isBalanced) {
		const totalDueKop = rubToKopecks(totalDueRub);
		const otherKop =
			rubToKopecks(effectiveDepositRub) +
			rubToKopecks(effectiveSbpRub) +
			rubToKopecks(effectiveCertificateRub) +
			rubToKopecks(effectiveBonusRub) +
			rubToKopecks(effectiveDmsRub);
		const remainderKop = Math.max(0, totalDueKop - otherKop);
		if (effectiveCashRub > 0 && effectiveCardRub === 0) {
			effectiveCashRub = kopecksToRub(remainderKop);
		} else {
			const effectiveCashKop = rubToKopecks(effectiveCashRub);
			effectiveCardRub = kopecksToRub(Math.max(0, remainderKop - effectiveCashKop));
		}
		setSplitCardRub(effectiveCardRub);
		setSplitCashRub(effectiveCashRub);
	}

	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: "split",
		patientId,
		amountRub: totalDueRub,
		method: "split",
		cashBoxType: selectedCashBoxType,
	});

	if (!acquirePaymentLock(clientMutationId)) return;

	try {
		const activeCategoryTitle =
			CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
			"Оплата услуг";
		const activeBoxTitle =
			CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

		const parts: string[] = [];
		if (effectiveCardRub > 0) parts.push(`карта ${effectiveCardRub} ₽`);
		if (effectiveCashRub > 0) parts.push(`нал ${effectiveCashRub} ₽`);
		if (effectiveDepositRub > 0) parts.push(`аванс ${effectiveDepositRub} ₽`);
		if (effectiveSbpRub > 0) parts.push(`СБП ${effectiveSbpRub} ₽`);
		if (effectiveCertificateRub > 0) parts.push(`сертификат ${effectiveCertificateRub} ₽`);
		if (effectiveBonusRub > 0) parts.push(`бонусы ${effectiveBonusRub} ₽`);
		if (effectiveDmsRub > 0) parts.push(`ДМС ${effectiveDmsRub} ₽`);

		const cashKop = rubToKopecks(effectiveCashRub);
		const electronicKop = rubToKopecks(effectiveCardRub) + rubToKopecks(effectiveSbpRub);
		const depositKop = rubToKopecks(effectiveDepositRub);
		const dmsKop = rubToKopecks(effectiveDmsRub);
		const isSplitPayment =
			(cashKop > 0 && electronicKop > 0) ||
			(depositKop > 0 && (cashKop > 0 || electronicKop > 0 || dmsKop > 0)) ||
			(dmsKop > 0 && (cashKop > 0 || electronicKop > 0 || depositKop > 0));
		const primaryMethod = isSplitPayment
			? "split"
			: dmsKop > 0
				? "insurance"
				: effectiveCashRub > 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
					? "cash"
					: effectiveDepositRub > 0 && effectiveCashRub === 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
						? "family_wallet"
						: effectiveSbpRub > 0 && effectiveCashRub === 0 && effectiveCardRub === 0
							? "online"
							: "card";

		const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
		const cashFlowNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;

		const res = await dispatchPaymentApi(
			{
				patientId,
				amountRub: totalDueRub,
				method: isSplitPayment ? "split" : primaryMethod,
				cashAmountKopecks: cashKop > 0 ? cashKop : undefined,
				electronicAmountKopecks: electronicKop > 0 ? electronicKop : undefined,
				dmsAmountKopecks: dmsKop > 0 ? dmsKop : undefined,
				depositAmountKopecks: depositKop > 0 ? depositKop : undefined,
				cashAmountRub: effectiveCashRub > 0 ? effectiveCashRub : undefined,
				electronicAmountRub:
					effectiveCardRub + effectiveSbpRub > 0
						? Number((effectiveCardRub + effectiveSbpRub).toFixed(2))
						: undefined,
				dmsAmountRub: effectiveDmsRub > 0 ? effectiveDmsRub : undefined,
				depositAmountRub: effectiveDepositRub > 0 ? effectiveDepositRub : undefined,
				guaranteeLetterId: guaranteeLetterId || undefined,
				cashBoxType: selectedCashBoxType,
				receiptTypeAlias: selectedReceiptAlias,
				cashFlowCategory: activeCategoryTitle,
				visitId: visitId || null,
				documentId: documentId || (invoiceId ? invoiceId : null),
				clientMutationId,
				toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
				invoiceItems: formatInvoiceItems(items),
				note: `Комбинированная оплата (${effectiveCashier}): ${parts.join(" + ")}${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${innNote}${cashFlowNote}${toothNumber ? ` [Зуб ${toothNumber}]` : ""}`,
			},
			headers,
		);

		if (!res.success) {
			showToast(res.error || "Ошибка записи комбинированной оплаты", "error");
			return;
		}

		showToast(
			`Комбинированная оплата ${totalDueRub} ₽ успешно принята (${effectiveCashier})`,
			"success",
		);
		context.handleBroadcastSuccess({
			method: "split",
			amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
			discountRub,
			discountPercent: effectiveDiscountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || undefined,
			...(res.data || {}),
		});
		onClose();
	} catch (err: unknown) {
		const errorMsg =
			err instanceof Error ? err.message : "Сбой соединения при приёме комбинированной оплаты";
		showToast(errorMsg, "error");
		context.setInterruptedPaymentState({
			isInterrupted: true,
			reason: errorMsg,
			method: "split",
			amountRub: totalDueRub,
		});
	} finally {
		releasePaymentLock(clientMutationId);
	}
}

export async function executeDepositSubmit(
	params: UsePaymentExecutionParams,
	source: "deposit" | "family",
	context: PaymentExecutorContext,
): Promise<void> {
	const {
		patientId,
		totalDueRub,
		rawTotalDueRub,
		isWarranty100,
		discountCalc,
		discountReason,
		discountRub,
		effectiveDiscountPercent,
		selectedCashBoxType,
		selectedReceiptAlias,
		visitId,
		documentId,
		invoiceId,
		toothNumber,
		items,
		onClose,
	} = params;

	const amountRubNumber = totalDueRub;
	const { clientMutationId, headers } = generatePaymentIdempotencyKey({
		prefix: source,
		patientId,
		amountRub: amountRubNumber,
		method: "family_wallet",
		cashBoxType: selectedCashBoxType,
	});

	if (!acquirePaymentLock(clientMutationId)) return;

	try {
		const activeCategoryTitle =
			CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
			"Оплата услуг";
		const activeBoxTitle =
			CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

		const cashFlowNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;
		const res = await dispatchPaymentApi(
			{
				patientId,
				amountRub: amountRubNumber,
				method: "family_wallet",
				cashBoxType: selectedCashBoxType,
				receiptTypeAlias: selectedReceiptAlias,
				cashFlowCategory: activeCategoryTitle,
				visitId: visitId || null,
				documentId: documentId || (invoiceId ? invoiceId : null),
				clientMutationId,
				toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
				invoiceItems: formatInvoiceItems(items),
				note:
					source === "family"
						? `Оплата с семейного баланса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${cashFlowNote}${toothNumber ? ` [Зуб ${toothNumber}]` : ""}`
						: `Оплата с лицевого счета / аванса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${cashFlowNote}${toothNumber ? ` [Зуб ${toothNumber}]` : ""}`,
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
