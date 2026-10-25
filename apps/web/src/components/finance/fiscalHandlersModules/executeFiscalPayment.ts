import { buildFiscalReceiptPayloadSignature, createFiscalCompositeIdempotencyKey } from "@dental/shared";
import { generateFiscalReceiptPayload, splitStateToCheckoutPayments } from "../../payments/checkout/fastCheckoutEngine.js";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager.js";
import { showToast } from "../../GlobalToast.js";
import { buildReceiptQueueItem, printOrQueueFiscalReceipt } from "./fiscalPrintAndQueue.js";
import { reconcileRemainingAmount } from "./reconcileRemainingAmount.js";
import { recordCrmPayment } from "./recordCrmPayment.js";
import type { FiscalExecutionParams } from "./types.js";

export async function executeFiscalPayment(params: FiscalExecutionParams, forceOfflineBuffer = false): Promise<void> {
	const {
		targetBillKop, targetBillRub, effectiveTotalRub, cardAmountRub, cashAmountRub, sbpAmountRub,
		depositAmountRub, loyaltyAmountRub, dmsAmountRub, activeMethod, clientType, buyerInn, buyerName,
		isElectronicReceiptOnly, patientId, visitId, patientPhone, patientEmail, orderId, effectiveCashierFullName,
		stageCalc, onPaymentComplete, onSuccess, onClose, inFlightRef, lastClickTimeRef, isPrinting,
		setIsPrinting, setIsOfflineBuffered,
	} = params;

	const now = Date.now();
	if (inFlightRef.current || isPrinting || now - lastClickTimeRef.current < 600) return;

	const eff = { card: cardAmountRub, cash: cashAmountRub, sbp: sbpAmountRub, dep: depositAmountRub, loyalty: loyaltyAmountRub, dms: dmsAmountRub };
	if (!reconcileRemainingAmount(params, eff)) return;

	inFlightRef.current = true;
	lastClickTimeRef.current = now;
	setIsPrinting(true);

	let effectivePayments = splitStateToCheckoutPayments({
		cardRub: eff.card, cashRub: eff.cash, sbpRub: eff.sbp,
		depositRub: eff.dep, loyaltyRub: eff.loyalty, dmsRub: eff.dms,
	});

	if (targetBillKop > 0 && effectivePayments.length > 0) {
		const deltaKop = targetBillKop - effectivePayments.reduce((acc, p) => acc + p.amountKop, 0);
		if (deltaKop !== 0) {
			effectivePayments = effectivePayments.map((p, idx) =>
				idx === effectivePayments.length - 1 ? { ...p, amountKop: Math.max(0, p.amountKop + deltaKop) } : p
			);
		}
	}

	const rawUuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `idemp-${now}-${Date.now().toString(36)}`;
	const cashKop = Math.round(eff.cash * 100);
	const electronicKop = Math.round((eff.card + eff.sbp) * 100);
	const signature = buildFiscalReceiptPayloadSignature({
		patientId: orderId, operationType: "income", taxationSystem: "usn_income", totalKopecks: targetBillKop,
		cashKopecks: cashKop, electronicCardKopecks: Math.round(eff.card * 100), sbpKopecks: Math.round(eff.sbp * 100),
		prepaidKopecks: Math.round((eff.dep + eff.loyalty) * 100),
		items: [{ name: "Стоматологические услуги по плану лечения", priceKopecks: targetBillKop, quantity: 1, amountKopecks: targetBillKop, subject: "service", method: "full_payment", vatRate: "vat_none" }],
	});
	const compositeIdempotencyKey = createFiscalCompositeIdempotencyKey(rawUuid, signature);

	const isSplitPayment = cashKop > 0 && electronicKop > 0;
	const primaryMethod = isSplitPayment ? "split" : eff.cash > 0 && eff.card === 0 && eff.sbp === 0 ? "cash"
		: eff.dep > 0 && eff.cash === 0 && eff.card === 0 && eff.sbp === 0 ? "family_wallet"
		: (activeMethod === "sbp_qr" || eff.sbp > 0) && eff.cash === 0 && eff.card === 0 ? "online"
		: activeMethod === "dms_insurance" ? "insurance" : "card";

	const payload = generateFiscalReceiptPayload(
		{ orderId, totalBillKop: targetBillKop, payments: effectivePayments, patientPhone, patientEmail, clientType, buyerInn: buyerInn || undefined, buyerName: buyerName || undefined, isElectronicReceiptOnly, idempotencyKey: compositeIdempotencyKey },
		{ paymentMethodTag1214: stageCalc.ffdTag1214, paymentSubjectTag1212: stageCalc.ffdTag1212, idempotencyKey: compositeIdempotencyKey, isElectronicReceiptOnly, offlineBuffered: forceOfflineBuffer }
	);

	if (targetBillKop === 0) {
		await recordCrmPayment({ patientId, visitId, compositeIdempotencyKey, effectiveTotalRub, targetBillRub, targetBillKop, isSplitPayment, primaryMethod, cashKop, electronicKop, effectiveCashRub: eff.cash, effectiveCardRub: eff.card, effectiveSbpRub: eff.sbp, effectiveLoyaltyRub: eff.loyalty, effectiveCashierFullName, noteSuffix: " [Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)]" });
		showToast("Оформлен Акт гарантийного обслуживания / списания услуг (скидка 100%, 0 ₽). Визит закрыт без обращения к кассе!", "success", 4000);
		onPaymentComplete?.({ ...payload, offlineBuffered: false });
		onSuccess?.({ ...payload, offlineBuffered: false });
		setTimeout(() => { setIsPrinting(false); inFlightRef.current = false; onClose(); }, 300);
		return;
	}

	const contact = patientPhone || patientEmail || "";
	if (forceOfflineBuffer || (typeof navigator !== "undefined" && navigator.onLine === false)) {
		const qItem = buildReceiptQueueItem({ customerContact: contact, cashierFullName: effectiveCashierFullName, totalRub: targetBillRub, payload, effectiveSbpRub: eff.sbp });
		FiscalReceiptQueueManager.enqueueReceipt(qItem, forceOfflineBuffer ? "Оплата через автономный терминал (без ККТ) / чек пробить позже" : "Кассовый аппарат временно недоступен в сети", compositeIdempotencyKey);
		setIsOfflineBuffered(true);
		showToast("Оплата принята через автономный терминал! Фискальный чек поставлен в очередь отложенной печати. Пациент рассчитан.", "success", 4000);
		await recordCrmPayment({ patientId, visitId, compositeIdempotencyKey, effectiveTotalRub, targetBillRub, targetBillKop, isSplitPayment, primaryMethod, cashKop, electronicKop, effectiveCashRub: eff.cash, effectiveCardRub: eff.card, effectiveSbpRub: eff.sbp, effectiveLoyaltyRub: eff.loyalty, effectiveCashierFullName, noteSuffix: " [автономный терминал / отложенный чек]" });
		onPaymentComplete?.({ ...payload, offlineBuffered: true });
		onSuccess?.({ ...payload, offlineBuffered: true });
		setTimeout(() => { setIsPrinting(false); inFlightRef.current = false; onClose(); }, 400);
		return;
	}

	const crmPaymentRecord = await recordCrmPayment({ patientId, visitId, compositeIdempotencyKey, effectiveTotalRub, targetBillRub, targetBillKop, isSplitPayment, primaryMethod, cashKop, electronicKop, effectiveCashRub: eff.cash, effectiveCardRub: eff.card, effectiveSbpRub: eff.sbp, effectiveLoyaltyRub: eff.loyalty, effectiveCashierFullName });
	const fdSuffix = crmPaymentRecord?.fiscalReceiptNumber ? ` (${crmPaymentRecord.fiscalReceiptNumber})` : "";
	const printRes = await printOrQueueFiscalReceipt({ targetBillRub, customerContact: contact, cashierFullName: effectiveCashierFullName, payload, effectiveSbpRub: eff.sbp, compositeIdempotencyKey, isElectronicReceiptOnly, fdSuffix });
	if (printRes.isBuffered) setIsOfflineBuffered(true);
	onPaymentComplete?.({ ...payload, offlineBuffered: printRes.isBuffered });
	onSuccess?.({ ...payload, offlineBuffered: printRes.isBuffered });
	setTimeout(() => { setIsPrinting(false); inFlightRef.current = false; onClose(); }, 600);
}
