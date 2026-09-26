/**
 * apps/web/src/components/finance/modal/payment/usePaymentExecution.ts
 *
 * Payment submission handlers: Cash, Split, Deposit, SBP, Sber POS, and Emergency Acquirers.
 */

import { useState, useEffect } from "react";
import {
	createCompositeIdempotencyKey,
	rubToKopecks,
	kopecksToRub,
	STOMX_CASH_BOXES,
	STOMX_CASH_RECEIPT_CATEGORIES,
	type SberPosTransactionResponse,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import {
	validate54FzBuyerInn,
	type PayerType,
	type PaymentDiscountCalculation,
} from "../../cashboxOperations.js";
import { hardwarePrinter } from "../../../../services/hardware/HardwarePrinter.js";
import { showToast } from "../../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import type { PaymentMethodTab, PaymentModalProps } from "./paymentModalTypes.js";

let paymentMutationSeq = 0;

export interface UsePaymentExecutionParams {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly clinicLegalName: string;
	readonly effectiveCashier: string;
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly isWarranty100: boolean;
	readonly discountCalc: PaymentDiscountCalculation;
	readonly discountReason: string;
	readonly discountRub: number;
	readonly effectiveDiscountPercent: number;
	readonly activeMethod: PaymentMethodTab;
	readonly setActiveMethod: (m: PaymentMethodTab) => void;
	readonly selectedCashBoxType: StomxCashBoxType;
	readonly selectedReceiptAlias: StomxReceiptTypeAlias;
	readonly payerType: PayerType;
	readonly buyerInn: string;
	readonly setBuyerInnError: (err: string | null) => void;
	readonly receivedCashRub: number;
	readonly cashChange: { changeRub: number };
	readonly splitCardRub: number;
	readonly setSplitCardRub: (v: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (v: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (v: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (v: number) => void;
	readonly splitCertificateRub: number;
	readonly splitBonusRub: number;
	readonly isBalanced: boolean;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly effectiveSbpOrderId: string;
	readonly effectiveSbpKopecks: number;
	readonly sbpStatus: "pending" | "paid";
	readonly setSbpStatus: (s: "pending" | "paid") => void;
	readonly isCheckingSbp: boolean;
	readonly setIsCheckingSbp: (v: boolean) => void;
	readonly setSbpCheckMessage: (msg: string | null) => void;
	readonly sbpQrData: { payload: { qrId?: string } } | null;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess: NonNullable<PaymentModalProps["onSuccess"]>;
}

export function usePaymentExecution(params: UsePaymentExecutionParams) {
	const {
		patientId,
		patientName,
		patientPhone,
		visitId,
		documentId,
		invoiceId,
		clinicLegalName,
		effectiveCashier,
		totalDueRub,
		rawTotalDueRub,
		isWarranty100,
		discountCalc,
		discountReason,
		discountRub,
		effectiveDiscountPercent,
		activeMethod,
		setActiveMethod,
		selectedCashBoxType,
		selectedReceiptAlias,
		payerType,
		buyerInn,
		setBuyerInnError,
		receivedCashRub,
		cashChange,
		splitCardRub,
		setSplitCardRub,
		splitCashRub,
		setSplitCashRub,
		splitDepositRub,
		setSplitDepositRub,
		splitSbpRub,
		setSplitSbpRub,
		splitCertificateRub,
		splitBonusRub,
		isBalanced,
		patientDepositRub,
		patientFamilyBalanceRub,
		effectiveSbpOrderId,
		effectiveSbpKopecks,
		sbpStatus,
		setSbpStatus,
		isCheckingSbp,
		setIsCheckingSbp,
		setSbpCheckMessage,
		sbpQrData,
		isOpen,
		onClose,
		onSuccess,
	} = params;

	const [isSubmittingCash, setIsSubmittingCash] = useState<boolean>(false);
	const [isSubmittingSplit, setIsSubmittingSplit] = useState<boolean>(false);
	const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

	const [interruptedPaymentState, setInterruptedPaymentState] = useState<{
		isInterrupted: boolean;
		reason: string;
		method: string;
		amountRub: number;
		lastMutationId?: string;
	} | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);
	const [fiscalizationRetryPending, setFiscalizationRetryPending] = useState<boolean>(false);
	const [isRetryingFiscalization, setIsRetryingFiscalization] = useState<boolean>(false);

	const handleCashSubmit = async () => {
		if (isWarranty100 || totalDueRub <= 0) {
			showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
			onSuccess({
				method: "warranty_discount_100",
				amountKopecks: 0,
				discountRub: discountCalc.discountRub,
				discountPercent: discountCalc.discountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || "Гарантийная переделка / скидка 100%",
			});
			onClose();
			return;
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

		setIsSubmittingCash(true);
		try {
			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
				"Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const clientMutationId = createCompositeIdempotencyKey(
				`cash:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: effectiveAmountRub, method: "cash", cashBoxType: selectedCashBoxType },
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const changeNote =
				cashChange.changeRub > 0
					? ` (получено ${receivedCashRub} ₽, сдача ${cashChange.changeRub} ₽)`
					: "";
			const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: effectiveAmountRub,
					method: "cash",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Оплата наличными через кассу (${effectiveAmountRub} ₽ • ${effectiveCashier})${changeNote}${innNote}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					(errorData && typeof errorData.error === "string" && errorData.error) ||
					`Ошибка приёма наличных: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				`Оплата ${effectiveAmountRub} ₽ наличными принята в кассу (${effectiveCashier})`,
				"success",
			);
			onSuccess({
				method: "cash",
				amountKopecks: isWarranty100 ? 0 : rubToKopecks(effectiveAmountRub),
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg =
				err instanceof Error ? err.message : "Сбой соединения при приёме оплаты наличными";
			showToast(errorMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errorMsg,
				method: "cash",
				amountRub: effectiveAmountRub,
			});
		} finally {
			setIsSubmittingCash(false);
		}
	};

	const handleSplitSubmit = async () => {
		if (isWarranty100 || totalDueRub <= 0) {
			showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
			onSuccess({
				method: "warranty_discount_100",
				amountKopecks: 0,
				discountRub: discountCalc.discountRub,
				discountPercent: discountCalc.discountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || "Гарантийная переделка / скидка 100%",
			});
			onClose();
			return;
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

		if (!isBalanced) {
			const remainder = Math.max(
				0,
				Number(
					(
						totalDueRub -
						(effectiveDepositRub + effectiveSbpRub + effectiveCertificateRub + effectiveBonusRub)
					).toFixed(2),
				),
			);
			if (effectiveCashRub > 0 && effectiveCardRub === 0) {
				effectiveCashRub = remainder;
			} else {
				effectiveCardRub = Math.max(0, Number((remainder - effectiveCashRub).toFixed(2)));
			}
			setSplitCardRub(effectiveCardRub);
			setSplitCashRub(effectiveCashRub);
		}

		setIsSubmittingSplit(true);
		try {
			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
				"Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const clientMutationId = createCompositeIdempotencyKey(
				`split:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: totalDueRub, method: "split", cashBoxType: selectedCashBoxType },
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const parts: string[] = [];
			if (effectiveCardRub > 0) parts.push(`карта ${effectiveCardRub} ₽`);
			if (effectiveCashRub > 0) parts.push(`нал ${effectiveCashRub} ₽`);
			if (effectiveDepositRub > 0) parts.push(`аванс ${effectiveDepositRub} ₽`);
			if (effectiveSbpRub > 0) parts.push(`СБП ${effectiveSbpRub} ₽`);
			if (effectiveCertificateRub > 0) parts.push(`сертификат ${effectiveCertificateRub} ₽`);
			if (effectiveBonusRub > 0) parts.push(`бонусы ${effectiveBonusRub} ₽`);

			const cashKop = Math.round(effectiveCashRub * 100);
			const electronicKop = Math.round((effectiveCardRub + effectiveSbpRub) * 100);
			const isSplitPayment = cashKop > 0 && electronicKop > 0;
			const primaryMethod = isSplitPayment
				? "split"
				: effectiveCashRub > 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
					? "cash"
					: effectiveDepositRub > 0 && effectiveCashRub === 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
						? "family_wallet"
						: effectiveSbpRub > 0 && effectiveCashRub === 0 && effectiveCardRub === 0
							? "online"
							: "card";
			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: totalDueRub,
					method: isSplitPayment ? "split" : primaryMethod,
					cashAmountKopecks: cashKop > 0 ? cashKop : undefined,
					electronicAmountKopecks: electronicKop > 0 ? electronicKop : undefined,
					cashAmountRub: effectiveCashRub > 0 ? effectiveCashRub : undefined,
					electronicAmountRub:
						effectiveCardRub + effectiveSbpRub > 0
							? Number((effectiveCardRub + effectiveSbpRub).toFixed(2))
							: undefined,
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Комбинированная оплата (${effectiveCashier}): ${parts.join(" + ")}${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${innNote}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка записи комбинированной оплаты: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				`Комбинированная оплата ${totalDueRub} ₽ успешно принята (${effectiveCashier})`,
				"success",
			);
			onSuccess({
				method: "split",
				amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg =
				err instanceof Error ? err.message : "Сбой соединения при приёме комбинированной оплаты";
			showToast(errorMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errorMsg,
				method: "split",
				amountRub: totalDueRub,
			});
		} finally {
			setIsSubmittingSplit(false);
		}
	};

	const handleDepositSubmit = async (source: "deposit" | "family") => {
		setIsSubmittingDeposit(true);
		try {
			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
				"Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const amountRubNumber = totalDueRub;
			const clientMutationId = createCompositeIdempotencyKey(
				`${source}:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: amountRubNumber, method: "family_wallet", cashBoxType: selectedCashBoxType },
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountRubNumber,
					method: "family_wallet",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note:
						source === "family"
							? `Оплата с семейного баланса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${stomxNote}`
							: `Оплата с лицевого счета / аванса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка списания со счета: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				setInterruptedPaymentState({
					isInterrupted: true,
					reason: errorMsg,
					method: source,
					amountRub: totalDueRub,
				});
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				source === "family"
					? `Оплата ${totalDueRub} ₽ с семейного баланса успешно списана`
					: `Оплата ${totalDueRub} ₽ с аванса/депозита успешно списана`,
				"success",
			);
			onSuccess({
				method: source,
				amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при списании со счета";
			showToast(errorMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errorMsg,
				method: source,
				amountRub: totalDueRub,
			});
		} finally {
			setIsSubmittingDeposit(false);
		}
	};

	const handleDepositOrPartialCombo = (source: "deposit" | "family") => {
		const availableBalance = source === "deposit" ? patientDepositRub : patientFamilyBalanceRub;
		if (availableBalance <= 0) {
			showToast(
				source === "deposit"
					? "На личном депозите пациента нет средств (0 ₽). Пополните аванс или выберите другой способ оплаты."
					: "Семейный баланс пуст (0 ₽). Пополните семейный кошелек или выберите другой способ оплаты.",
				"warning",
				4000,
			);
			return;
		}
		if (availableBalance >= totalDueRub) {
			handleDepositSubmit(source);
		} else if (availableBalance > 0) {
			const totalKop = rubToKopecks(totalDueRub);
			const balKop = Math.min(totalKop, rubToKopecks(availableBalance));
			const remKop = Math.max(0, totalKop - balKop);
			setSplitDepositRub(kopecksToRub(balKop));
			setSplitCardRub(kopecksToRub(remKop));
			setSplitCashRub(0);
			setSplitSbpRub(0);
			setActiveMethod("split");
			showToast(
				`Зачтено ${kopecksToRub(balKop)} ₽ ${source === "family" ? "из семьи" : "с аванса"}. Остаток ${kopecksToRub(remKop)} ₽ перенесён на карту.`,
				"info",
				3500,
			);
		}
	};

	const handleManualCardTerminalConfirm = async (overrideAmountRub?: number) => {
		const amountToConfirm = overrideAmountRub ?? (interruptedPaymentState?.amountRub || totalDueRub);
		setIsSubmittingManualCard(true);
		try {
			const clientMutationId = createCompositeIdempotencyKey(
				`manual-card:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: amountToConfirm, method: "card", manualConfirmed: true },
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
				"Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountToConfirm,
					method: "card",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Оплата картой подтверждена на терминале вручную (${amountToConfirm} ₽ • ${effectiveCashier}) [Без повторного списания с карты] [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`,
				}),
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errMsg =
					(errData && typeof errData.message === "string" && errData.message) ||
					`Ошибка фиксации ручного подтверждения: HTTP ${res.status}`;
				showToast(errMsg, "error");
				setInterruptedPaymentState({
					isInterrupted: true,
					reason: errMsg,
					method: "card",
					amountRub: amountToConfirm,
					lastMutationId: clientMutationId,
				});
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				`Оплата картой подтверждена на терминале вручную (${amountToConfirm} ₽). Платеж сохранен!`,
				"success",
				5000,
			);
			setInterruptedPaymentState(null);
			setFiscalizationRetryPending(true);
			onSuccess({
				method: "card",
				amountKopecks: rubToKopecks(amountToConfirm),
				cardChargedManually: true,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errMsg =
				err instanceof Error ? err.message : "Сбой связи при ручном подтверждении терминала";
			showToast(errMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errMsg,
				method: "card",
				amountRub: amountToConfirm,
			});
		} finally {
			setIsSubmittingManualCard(false);
		}
	};

	const handleRetryFiscalization = async () => {
		setIsRetryingFiscalization(true);
		try {
			const printRes = await hardwarePrinter.printFiscalReceipt({
				clinicName: clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: effectiveCashier,
				customerContact: patientPhone || patientName || "",
				operationType: "income",
				items: [
					{
						name: "Стоматологические услуги по плану лечения",
						priceRub: totalDueRub,
						quantity: 1,
						amountRub: totalDueRub,
						vatRate: "vat_0",
					},
				],
				totalRub: totalDueRub,
				electronicRub: activeMethod === "cash" ? 0 : totalDueRub,
				cashRub: activeMethod === "cash" ? totalDueRub : 0,
			});

			if (printRes && (printRes.status === "failed" || !printRes.success)) {
				showToast(`Ошибка фискализации на ККТ: ${printRes.error || "Устройство недоступно"}`, "error");
				setFiscalizationRetryPending(true);
			} else {
				showToast(
					"Чек повторно отправлен на фискализацию в ККТ (баланс пациента не затронут)!",
					"success",
					5000,
				);
				setFiscalizationRetryPending(false);
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка повторной фискализации чека";
			showToast(errMsg, "error");
			setFiscalizationRetryPending(true);
		} finally {
			setIsRetryingFiscalization(false);
		}
	};

	const handleSbpExecutePayment = async (orderIdToConfirm?: string, receiptId?: string | null) => {
		const effectiveOrderId = orderIdToConfirm || effectiveSbpOrderId;
		const effectiveAmountRub = totalDueRub;
		if (isWarranty100 || effectiveAmountRub <= 0) {
			showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
			onSuccess({
				method: "warranty_discount_100",
				amountKopecks: 0,
				discountRub: discountCalc.discountRub,
				discountPercent: discountCalc.discountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || "Гарантийная переделка / скидка 100%",
			});
			onClose();
			return;
		}

		const clientMutationId = createCompositeIdempotencyKey(
			`sbp:${Date.now()}-${++paymentMutationSeq}`,
			{ patientId, amountRub: effectiveAmountRub, method: "sbp_qr", cashBoxType: selectedCashBoxType },
		);
		const headers = denteAdminSecretRequestHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": clientMutationId,
		});

		const activeCategoryTitle =
			STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name ||
			"Оплата услуг";
		const activeBoxTitle =
			STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";
		const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
		const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;

		try {
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: effectiveAmountRub,
					method: "sbp_qr",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					electronicAmountRub: effectiveAmountRub,
					electronicAmountKopecks: discountCalc.totalDueKopecks,
					note: `Оплата через СБП (НСПК / ГОСТ Р 56042-2014) (${effectiveAmountRub} ₽ • ${effectiveCashier}) [Заказ: ${effectiveOrderId}]${receiptId ? ` [Чек: ${receiptId}]` : ""}${innNote}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка фиксации оплаты СБП: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				`Оплата ${effectiveAmountRub} ₽ через СБП успешно зафиксирована (${effectiveCashier})`,
				"success",
			);
			onSuccess({
				method: "sbp_qr",
				amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				rrn: effectiveOrderId,
				fiscalReceiptId: receiptId || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при фиксации оплаты СБП";
			showToast(errorMsg, "error");
		}
	};

	const handleCheckSbpStatus = async (manual = false) => {
		if (isCheckingSbp || sbpStatus === "paid" || effectiveSbpKopecks <= 0) return;
		setIsCheckingSbp(true);
		try {
			const headers = denteAdminSecretRequestHeaders({ Accept: "application/json" });
			const queryUrl = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(effectiveSbpOrderId)}&qrId=${encodeURIComponent(sbpQrData?.payload.qrId || "")}&sumKop=${effectiveSbpKopecks}`;
			const res = await fetch(queryUrl, { headers });
			if (res.ok) {
				const data = (await res.json().catch(() => null)) as {
					paid?: boolean;
					status?: string;
					fiscalReceiptId?: string | null;
					orderId?: string | null;
				} | null;
				if (data && (data.paid || data.status === "paid")) {
					setSbpStatus("paid");
					setSbpCheckMessage("Оплата по СБП подтверждена банком! Формируем фискальный чек...");
					showToast("Оплата по СБП успешно подтверждена банком!", "success");
					if (activeMethod === "sbp_qr") {
						await handleSbpExecutePayment(data.orderId || effectiveSbpOrderId, data.fiscalReceiptId);
					} else if (activeMethod === "split") {
						showToast(`Оплата части счета ${splitSbpRub} ₽ через СБП подтверждена банком!`, "success");
					}
					return;
				}
			}
			if (manual) {
				setSbpCheckMessage("Платёж через СБП пока не поступил. Ожидается проведение банком.");
				showToast("Платёж пока не поступил от банка", "info");
			}
		} catch {
			if (manual) {
				setSbpCheckMessage("Шлюз СБП временно недоступен. Проверьте банковскую выписку.");
			}
		} finally {
			setIsCheckingSbp(false);
		}
	};

	const handleConfirmSbpManual = async () => {
		setIsCheckingSbp(true);
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				Accept: "application/json",
			});
			await fetch("/api/fiscal/sbp-status", {
				method: "POST",
				headers,
				body: JSON.stringify({
					orderId: effectiveSbpOrderId,
					qrId: sbpQrData?.payload.qrId,
					action: "confirm_manual",
					sumKopecks: effectiveSbpKopecks,
				}),
			}).catch(() => null);

			setSbpStatus("paid");
			setSbpCheckMessage("Поступление средств по СБП подтверждено кассиром. Формируем чек 54-ФЗ...");
			showToast("Оплата СБП подтверждена кассиром! Пробиваем фискальный чек 54-ФЗ...", "success");
			if (activeMethod === "sbp_qr") {
				await handleSbpExecutePayment(effectiveSbpOrderId);
			} else if (activeMethod === "split") {
				showToast(`СБП часть (${splitSbpRub} ₽) подтверждена кассиром вручную!`, "success");
			}
		} catch {
			setSbpStatus("paid");
			if (activeMethod === "sbp_qr") {
				await handleSbpExecutePayment(effectiveSbpOrderId);
			}
		} finally {
			setIsCheckingSbp(false);
		}
	};

	useEffect(() => {
		if (!isOpen || sbpStatus === "paid" || (activeMethod !== "sbp_qr" && splitSbpRub <= 0)) {
			return;
		}
		const interval = setInterval(() => {
			handleCheckSbpStatus(false);
		}, 3500);
		return () => clearInterval(interval);
	}, [isOpen, sbpStatus, activeMethod, splitSbpRub, effectiveSbpOrderId, effectiveSbpKopecks]);

	const handleSberSuccess = (posRes: SberPosTransactionResponse) => {
		onSuccess({
			method: posRes.operationType,
			amountKopecks: posRes.amountKop,
			rrn: posRes.rrn,
			authCode: posRes.authCode,
			discountRub,
			discountPercent: effectiveDiscountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || undefined,
		});
		setTimeout(() => {
			onClose();
		}, 1200);
	};

	return {
		isSubmittingCash,
		isSubmittingSplit,
		isSubmittingDeposit,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		interruptedPaymentState,
		setInterruptedPaymentState,
		isSubmittingManualCard,
		fiscalizationRetryPending,
		setFiscalizationRetryPending,
		isRetryingFiscalization,
		handleCashSubmit,
		handleSplitSubmit,
		handleDepositSubmit,
		handleDepositOrPartialCombo,
		handleManualCardTerminalConfirm,
		handleRetryFiscalization,
		handleSbpExecutePayment,
		handleCheckSbpStatus,
		handleConfirmSbpManual,
		handleSberSuccess,
	};
}
