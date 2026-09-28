/**
 * apps/web/src/components/finance/modal/payment/usePaymentExecution.ts
 *
 * Master payment execution hook: Cash, Split, Deposit, and delegates SBP/Terminal handling.
 * Strictly <= 800 lines.
 */

import { useState } from "react";
import {
	createCompositeIdempotencyKey,
	rubToKopecks,
	kopecksToRub,
	STOMX_CASH_BOXES,
	STOMX_CASH_RECEIPT_CATEGORIES,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import {
	validate54FzBuyerInn,
	type PayerType,
	type PaymentDiscountCalculation,
} from "../../cashboxOperations.js";
import { showToast } from "../../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import { broadcastPatientBalanceChange } from "../../../../services/storage/index.js";
import type { PaymentMethodTab, PaymentModalProps } from "./paymentModalTypes.js";
import { usePaymentSbpAndTerminalExecution } from "./usePaymentSbpAndTerminalExecution.js";

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

	const handleBroadcastSuccess: typeof onSuccess = (result) => {
		try {
			broadcastPatientBalanceChange({
				patientId,
				patientName,
				deltaRub: totalDueRub,
				updatedAt: new Date().toISOString(),
			});
		} catch {
			// Non-blocking cross-tab broadcast
		}
		onSuccess(result);
	};

	const sbpAndTerminal = usePaymentSbpAndTerminalExecution({
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
		selectedCashBoxType,
		selectedReceiptAlias,
		buyerInn,
		splitSbpRub,
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
		onSuccess: handleBroadcastSuccess,
	});

	const handleCashSubmit = async () => {
		if (isWarranty100 || totalDueRub <= 0) {
			showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
			handleBroadcastSuccess({
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
			handleBroadcastSuccess({
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
			sbpAndTerminal.setInterruptedPaymentState({
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
			handleBroadcastSuccess({
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
			handleBroadcastSuccess({
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
			sbpAndTerminal.setInterruptedPaymentState({
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
				sbpAndTerminal.setInterruptedPaymentState({
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
			handleBroadcastSuccess({
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
			sbpAndTerminal.setInterruptedPaymentState({
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

	return {
		isSubmittingCash,
		isSubmittingSplit,
		isSubmittingDeposit,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		interruptedPaymentState: sbpAndTerminal.interruptedPaymentState,
		setInterruptedPaymentState: sbpAndTerminal.setInterruptedPaymentState,
		isSubmittingManualCard: sbpAndTerminal.isSubmittingManualCard,
		fiscalizationRetryPending: sbpAndTerminal.fiscalizationRetryPending,
		setFiscalizationRetryPending: sbpAndTerminal.setFiscalizationRetryPending,
		isRetryingFiscalization: sbpAndTerminal.isRetryingFiscalization,
		handleCashSubmit,
		handleSplitSubmit,
		handleDepositSubmit,
		handleDepositOrPartialCombo,
		handleManualCardTerminalConfirm: sbpAndTerminal.handleManualCardTerminalConfirm,
		handleRetryFiscalization: sbpAndTerminal.handleRetryFiscalization,
		handleSbpExecutePayment: sbpAndTerminal.handleSbpExecutePayment,
		handleCheckSbpStatus: sbpAndTerminal.handleCheckSbpStatus,
		handleConfirmSbpManual: sbpAndTerminal.handleConfirmSbpManual,
		handleSberSuccess: sbpAndTerminal.handleSberSuccess,
	};
}
