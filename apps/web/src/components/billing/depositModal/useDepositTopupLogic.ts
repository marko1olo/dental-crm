/**
 * apps/web/src/components/billing/depositModal/useDepositTopupLogic.ts
 *
 * State and mutation logic for deposit topup and 54-FZ advance fiscalization.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useRef } from "react";
import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { formatDisplayCurrency, rubToKopecksStrict, generateUuidV7, type DepositTopupPayload, type ReceiptDeliveryMode } from "@dental/shared";
import type { DepositTopupModalProps, DepositPaymentMethod } from "./depositModalTypes.js";

export function useDepositTopupLogic(props: DepositTopupModalProps) {
	const {
		patientId, patientName, patientPhone = "", patientEmail = "", currentDepositRub = 0,
		isFamilyShared = false, familyGroupId, sponsorPatientId, cashierFullName = "Администратор / Кассир",
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", onSuccess,
	} = props;

	const inFlightRef = useRef<boolean>(false);
	const [amountRub, setAmountRub] = useState<number>(10000);
	const [paymentMethod, setPaymentMethod] = useState<DepositPaymentMethod>("card");
	const [deliveryMode, setDeliveryMode] = useState<ReceiptDeliveryMode>("paper_print");
	const [isFamilyWallet, setIsFamilyWallet] = useState<boolean>(isFamilyShared);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isCompleted, setIsCompleted] = useState<boolean>(false);
	const [clientMutationId] = useState<string>(() => generateUuidV7());

	const handleExecuteTopup = async () => {
		if (inFlightRef.current || isSubmitting || isCompleted || amountRub <= 0) return;
		inFlightRef.current = true;
		setIsSubmitting(true);

		const payload: DepositTopupPayload = {
			patientId, patientName, patientPhone, patientEmail, amountRub,
			amountKopecks: rubToKopecksStrict(amountRub), paymentMethod, deliveryMode,
			isFamilyShared: isFamilyWallet, sponsorPatientId, clientMutationId,
			cashierFullName, clinicLegalName, note: `Пополнение депозита (${isFamilyWallet ? "Семейный" : "Личный"})`,
			timestampIso: new Date().toISOString(),
		};

		try {
			const methodMappedForApi = paymentMethod === "sbp" ? "online" : paymentMethod;
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
				...denteAdminSecretRequestHeaders(),
			};

			const response = isFamilyWallet && familyGroupId
				? await fetch("/api/finance/family/topup", {
						method: "POST", headers,
						body: JSON.stringify({
							familyGroupId, patientId: sponsorPatientId || patientId, amountRub,
							method: methodMappedForApi, clientMutationId,
							comment: `Пополнение семейного депозита на ${formatDisplayCurrency(amountRub)}`,
						}),
				  })
				: await fetch("/api/billing/payments", {
						method: "POST", headers,
						body: JSON.stringify({
							patientId, amountRub, method: methodMappedForApi, clientMutationId,
							payerFullName: patientName, fiscalReceiptNumber: `АВАНС-${Date.now().toString().slice(-6)}`,
							fiscalReceiptIssuedAt: new Date().toISOString(),
							note: `Внесение аванса (${isFamilyWallet ? "Семейный депозит" : "Личный депозит"}) на ${formatDisplayCurrency(amountRub)}`,
						}),
				  });

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const errMessage = errorData?.message || errorData?.error || `Ошибка сервера (${response.status})`;
				showToast(`Не удалось пополнить депозит: ${errMessage}`, "error");
				return;
			}

			setIsCompleted(true);
			showToast(`Депозит пополнен на ${formatDisplayCurrency(amountRub)}! Кассовый чек аванса пробит.`, "success");
			onSuccess?.(payload);
		} catch (err: any) {
			console.error("[DepositTopupModal] Network error during deposit topup:", err);
			showToast(`Ошибка сети при пополнении депозита: ${err?.message || "неизвестная ошибка"}`, "error");
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	return {
		amountRub, setAmountRub, paymentMethod, setPaymentMethod,
		deliveryMode, setDeliveryMode, isFamilyWallet, setIsFamilyWallet,
		isSubmitting, isCompleted, handleExecuteTopup,
	};
}
