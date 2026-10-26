/**
 * apps/web/src/components/billing/sbp/sbpTypes.ts
 *
 * Types for SbpDynamicQrCard components.
 * Strictly <= 120 lines per Mandate 8b.
 */

export interface SbpDynamicQrCardProps {
	readonly sumRub: number;
	readonly orderId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	/** Срок жизни QR в секундах; сервер принимает от 60. */
	readonly ttlSeconds?: number | undefined;
	/** Спрятать ручное подтверждение (например, внутри сплита — там платёж фиксирует общая кнопка). */
	readonly hideManualConfirm?: boolean | undefined;
	readonly onPaymentSuccess?: ((result: {
		operationId: string;
		paymentId: string;
		sumRub: number;
		method: "sbp";
		timestampIso: string;
	}) => void) | undefined;
	readonly onCancel?: (() => void) | undefined;
	readonly compactMode?: boolean | undefined;
}
