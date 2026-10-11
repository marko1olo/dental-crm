import type {
	PartialRefundCalculationResult,
	RefundableInvoiceItem,
	RefundReasonCategory,
} from "@dental/shared";
import { REFUND_REASON_LABELS } from "@dental/shared";
import type { RefundPaymentMethod, RefundServiceItem } from "./types";

export function mapServicesToRefundableItems(
	rawServices: readonly RefundServiceItem[],
	doctorName: string,
	doctorCommissionPct: number,
): RefundableInvoiceItem[] {
	return rawServices.map((s) => {
		const rawUnitPriceKop =
			typeof (s as unknown as { priceKop?: number }).priceKop === "number"
				? (s as unknown as { priceKop: number }).priceKop
				: Math.round((Number.isFinite(s.priceRub) ? s.priceRub : 0) * 100);
		const unitPriceKop = Number.isFinite(rawUnitPriceKop) ? Math.max(0, Math.round(rawUnitPriceKop)) : 0;
		const quantity = Number.isFinite(s.quantity) && s.quantity > 0 ? s.quantity : 1;
		const totalAmountKop = Math.round(unitPriceKop * quantity);
		return {
			id: s.id,
			name: s.name || (s as unknown as { nameRu?: string }).nameRu || "Медицинская услуга",
			code804n: s.code804n || "A16.07.002",
			toothNumber: s.toothNumber,
			unitPriceKop,
			quantity,
			grossAmountKop: totalAmountKop,
			netAmountKop: totalAmountKop,
			doctorName: s.doctorName || doctorName,
			commissionPct: s.commissionPct ?? doctorCommissionPct,
			materialCostKop: Math.round((Number.isFinite(s.materialCostRub) ? s.materialCostRub! : 0) * 100),
		};
	});
}

export function buildRefundFiscalPayload(params: {
	clientMutationId: string;
	patientId: string;
	originalPaymentId?: string | undefined;
	invoiceId: string;
	invoiceNumber: string;
	originalReceiptNumber?: string | undefined;
	originalFiscalSign?: string | undefined;
	paymentMethod: RefundPaymentMethod;
	reasonCategory: RefundReasonCategory;
	customReason: string;
	calculation: PartialRefundCalculationResult;
}) {
	const {
		clientMutationId,
		patientId,
		originalPaymentId,
		invoiceId,
		invoiceNumber,
		originalReceiptNumber,
		originalFiscalSign,
		paymentMethod,
		reasonCategory,
		customReason,
		calculation,
	} = params;

	const isPatientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId || "");
	const effectivePatientId = isPatientUuid ? patientId : "00000000-0000-0000-0000-000000000001";

	const rawPaymentId = originalPaymentId || invoiceId;
	const isPaymentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawPaymentId || "");
	const effectivePaymentId = isPaymentUuid ? rawPaymentId : "00000000-0000-0000-0000-000000000001";

	const effectiveOriginalReceiptNumber = originalReceiptNumber?.trim() || invoiceNumber || "CHK-1";

	const refundItems = calculation.refundedItems.map((item) => ({
		name: item.name.length > 128 ? item.name.slice(0, 128) : item.name,
		priceKopecks: item.unitPriceKop,
		quantity: item.quantityRefunded,
		amountKopecks: item.refundedNetKop,
		subject: "service" as const,
		method: "full_payment" as const,
		vatRate: "vat_none" as const,
		measure: "piece" as const,
		taxDeductionCode: "code_1_standard" as const,
		medicalServiceCode804n: item.code804n || undefined,
		toothFdiNumber: item.toothNumber,
	}));

	const refundCashKopecks = paymentMethod === "cash" ? calculation.totalRefundKop : 0;
	const refundElectronicKopecks = paymentMethod === "card" ? calculation.totalRefundKop : 0;
	const refundPrepaidKopecks = paymentMethod === "advance_deposit" ? calculation.totalRefundKop : 0;

	const reasonText = customReason.trim()
		? `${REFUND_REASON_LABELS[reasonCategory] || reasonCategory}: ${customReason.trim()}`
		: (REFUND_REASON_LABELS[reasonCategory] || "Возврат средств за услуги");

	return {
		refundPayload: {
			clientMutationId,
			originalPaymentId: effectivePaymentId,
			originalReceiptNumber: effectiveOriginalReceiptNumber,
			originalFiscalSign: originalFiscalSign || undefined,
			patientId: effectivePatientId,
			refundCashKopecks,
			refundElectronicKopecks,
			refundPrepaidKopecks,
			totalRefundKopecks: calculation.totalRefundKop,
			reason: reasonText.slice(0, 256),
			cashierFullName: "Кассир-администратор",
			items: refundItems,
		},
		refundCashKopecks,
		refundElectronicKopecks,
		refundPrepaidKopecks,
		reasonText,
	};
}
