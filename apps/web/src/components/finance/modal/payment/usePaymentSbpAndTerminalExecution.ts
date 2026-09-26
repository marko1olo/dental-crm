/**
 * apps/web/src/components/finance/modal/payment/usePaymentSbpAndTerminalExecution.ts
 *
 * Execution handlers for SBP QR (ГОСТ Р 56042-2014), Sber POS terminal, emergency manual confirm, and fiscal retry.
 */

import { useState, useEffect } from "react";
import {
	createCompositeIdempotencyKey,
	rubToKopecks,
	STOMX_CASH_BOXES,
	STOMX_CASH_RECEIPT_CATEGORIES,
	type SberPosTransactionResponse,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import type { PaymentDiscountCalculation } from "../../cashboxOperations.js";
import { hardwarePrinter } from "../../../../services/hardware/HardwarePrinter.js";
import { showToast } from "../../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import type { PaymentMethodTab, PaymentModalProps } from "./paymentModalTypes.js";

let sbpTerminalMutationSeq = 0;

export interface UsePaymentSbpAndTerminalParams {
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
	readonly selectedCashBoxType: StomxCashBoxType;
	readonly selectedReceiptAlias: StomxReceiptTypeAlias;
	readonly buyerInn: string;
	readonly splitSbpRub: number;
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

export function usePaymentSbpAndTerminalExecution(params: UsePaymentSbpAndTerminalParams) {
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
		onSuccess,
	} = params;

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

	const handleManualCardTerminalConfirm = async (overrideAmountRub?: number) => {
		const amountToConfirm = overrideAmountRub ?? (interruptedPaymentState?.amountRub || totalDueRub);
		setIsSubmittingManualCard(true);
		try {
			const clientMutationId = createCompositeIdempotencyKey(
				`manual-card:${Date.now()}-${++sbpTerminalMutationSeq}`,
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
			`sbp:${Date.now()}-${++sbpTerminalMutationSeq}`,
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
		interruptedPaymentState,
		setInterruptedPaymentState,
		isSubmittingManualCard,
		fiscalizationRetryPending,
		setFiscalizationRetryPending,
		isRetryingFiscalization,
		handleManualCardTerminalConfirm,
		handleRetryFiscalization,
		handleSbpExecutePayment,
		handleCheckSbpStatus,
		handleConfirmSbpManual,
		handleSberSuccess,
	};
}
