import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";

export interface RecordCrmPaymentParams {
	patientId?: string | undefined;
	visitId?: string | undefined;
	compositeIdempotencyKey: string;
	effectiveTotalRub: number;
	targetBillRub: number;
	targetBillKop: number;
	isSplitPayment: boolean;
	primaryMethod: string;
	cashKop: number;
	electronicKop: number;
	effectiveCashRub: number;
	effectiveCardRub: number;
	effectiveSbpRub: number;
	effectiveLoyaltyRub: number;
	effectiveCashierFullName: string;
	noteSuffix?: string;
}

export async function recordCrmPayment(params: RecordCrmPaymentParams): Promise<{ fiscalReceiptNumber?: string } | null> {
	const {
		patientId, visitId, compositeIdempotencyKey, effectiveTotalRub, targetBillRub, targetBillKop,
		isSplitPayment, primaryMethod, cashKop, electronicKop, effectiveCashRub, effectiveCardRub,
		effectiveSbpRub, effectiveLoyaltyRub, effectiveCashierFullName, noteSuffix = "",
	} = params;

	if (!patientId || typeof fetch !== "function") return null;

	try {
		const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json", "Idempotency-Key": compositeIdempotencyKey });
		const paymentPayload = JSON.stringify({
			patientId, visitId: visitId || undefined, amountRub: effectiveTotalRub, amountKopecks: targetBillKop,
			method: targetBillKop === 0 ? "warranty" : (isSplitPayment ? "split" : primaryMethod),
			cashAmountKopecks: cashKop > 0 ? cashKop : undefined,
			electronicAmountKopecks: electronicKop > 0 ? electronicKop : undefined,
			cashAmountRub: effectiveCashRub > 0 ? effectiveCashRub : undefined,
			electronicAmountRub: (effectiveCardRub + effectiveSbpRub) > 0 ? Number((effectiveCardRub + effectiveSbpRub).toFixed(2)) : undefined,
			clientMutationId: compositeIdempotencyKey,
			note: targetBillKop === 0
				? `Акт гарантийного обслуживания / списания услуг (${effectiveCashierFullName}): скидка 100%, 0.00 ₽`
				: `Быстрый расчет (${effectiveCashierFullName})${noteSuffix}: ${isSplitPayment ? `сплит (нал: ${effectiveCashRub} ₽, безнал: ${(effectiveCardRub + effectiveSbpRub).toFixed(2)} ₽)` : primaryMethod}`,
		});

		let response = await fetch("/api/billing/payments", { method: "POST", headers, body: paymentPayload }).catch(() => null);
		if (!response || !response.ok) {
			response = await fetch("/api/cashbox/payments", { method: "POST", headers, body: paymentPayload }).catch((err) => {
				console.warn("[FastCheckoutModal] payments sync fallback error:", err);
				return null;
			});
		}

		if (response && response.ok) {
			const data = (await response.json().catch(() => null)) as { fiscalReceiptNumber?: string } | null;

			if (patientId && effectiveLoyaltyRub > 0) {
				await fetch("/api/loyalty/redeem", {
					method: "POST", headers,
					body: JSON.stringify({ patientId, invoiceAmountRub: targetBillRub, pointsToRedeem: effectiveLoyaltyRub, allowFullCoverage: true, clientMutationId: `${compositeIdempotencyKey}-loyalty`, description: `Списание бонусов в кассе: ${effectiveLoyaltyRub} б.` }),
				}).catch(() => null);
			}

			const paidRub = Number((effectiveCardRub + effectiveCashRub + effectiveSbpRub).toFixed(2));
			if (patientId && paidRub > 0) {
				await fetch("/api/loyalty/accrue-cashback", {
					method: "POST", headers,
					body: JSON.stringify({ patientId, paidAmountRub: paidRub, description: `Кэшбэк за оплату в кассе на сумму ${paidRub} ₽` }),
				}).catch(() => null);
			}
			return data;
		}
	} catch (crmErr) {
		console.warn("[FastCheckoutModal] Failed to record payment in CRM:", crmErr);
	}
	return null;
}
