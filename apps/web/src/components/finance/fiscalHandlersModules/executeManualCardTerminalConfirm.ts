import { createFiscalCompositeIdempotencyKey } from "@dental/shared";
import { generateFiscalReceiptPayload } from "../../payments/checkout/fastCheckoutEngine.js";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";
import type { ManualCardTerminalParams } from "./types.js";

export async function executeManualCardTerminalConfirm(params: ManualCardTerminalParams): Promise<void> {
	const {
		targetBillRub, overrideAmountRub, patientId, visitId, patientPhone, patientEmail,
		effectiveCashierFullName, orderId, clientType, buyerInn, buyerName, isElectronicReceiptOnly,
		stageCalc, onPaymentComplete, onSuccess, onClose, setIsSubmittingManualCard,
		setIsOfflineBuffered, setInterruptedPaymentState,
	} = params;

	const amountRub = overrideAmountRub ?? targetBillRub;
	setIsSubmittingManualCard(true);
	try {
		const rawUuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `idemp-${Date.now()}-${Date.now().toString(36)}`;
		const compositeIdempotencyKey = createFiscalCompositeIdempotencyKey(rawUuid, { method: "manual-card", orderId, amountRub });

		FiscalReceiptQueueManager.enqueueReceipt({
			operationType: "income", customerContact: patientPhone || patientEmail || "", cashierFullName: effectiveCashierFullName,
			totalRub: amountRub, items: [{ name: "Стоматологические услуги по плану лечения", priceRub: amountRub, quantity: 1, amountRub, paymentMethod: "full_payment", paymentSubject: "service" }],
			cashRub: 0, electronicRub: amountRub, prepaidRub: 0, taxationSystem: "usn_income_expense",
		}, "Оплата картой подтверждена на терминале вручную (без повторного списания с карты)", compositeIdempotencyKey);
		setIsOfflineBuffered(true);

		if (patientId && amountRub > 0 && typeof fetch === "function") {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json", "Idempotency-Key": compositeIdempotencyKey });
			const manualBody = JSON.stringify({
				patientId, visitId: visitId || undefined, amountRub, amountKopecks: Math.round(amountRub * 100), method: "card",
				electronicAmountKopecks: Math.round(amountRub * 100), clientMutationId: compositeIdempotencyKey,
				note: `Оплата картой подтверждена на терминале вручную (${effectiveCashierFullName}): ${amountRub} ₽ [Без повторного списания с карты]`,
			});
			let res = await fetch("/api/cashbox/payments", { method: "POST", headers, body: manualBody }).catch(() => null);
			if (!res || !res.ok) {
				await fetch("/api/billing/payments", { method: "POST", headers, body: manualBody }).catch((err) => {
					console.warn("[FastCheckoutModal] Manual card payment recording warning:", err);
				});
			}
		}

		showToast(`Оплата картой на сумму ${amountRub} ₽ подтверждена вручную на терминале. Чек поставлен в очередь фискализации, визит закрыт!`, "success", 5000);

		if (onPaymentComplete || onSuccess) {
			const payload = generateFiscalReceiptPayload(
				{ orderId, totalBillKop: Math.round(amountRub * 100), payments: [{ method: "bank_card", amountKop: Math.round(amountRub * 100) }], patientPhone, patientEmail, clientType, buyerInn: buyerInn || undefined, buyerName: buyerName || undefined, isElectronicReceiptOnly, idempotencyKey: compositeIdempotencyKey },
				{ paymentMethodTag1214: stageCalc.ffdTag1214, paymentSubjectTag1212: stageCalc.ffdTag1212, idempotencyKey: compositeIdempotencyKey, isElectronicReceiptOnly, offlineBuffered: true }
			);
			onPaymentComplete?.({ ...payload, offlineBuffered: true });
			onSuccess?.({ ...payload, offlineBuffered: true });
		}

		setInterruptedPaymentState(null);
		setTimeout(() => { setIsSubmittingManualCard(false); onClose(); }, 400);
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : "Ошибка ручного подтверждения оплаты";
		showToast(errMsg, "error");
		setIsSubmittingManualCard(false);
	}
}
