/**
 * omnichannelSbpTypes.ts — Контракты динамического эквайринга СБП (НСПК / ГОСТ Р 56042-2014).
 * Строго <= 120 строк по Мандату 8b.
 */

export type SbpPaymentStatus =
	| "awaiting_scan"
	| "scanned"
	| "paid_success"
	| "expired"
	| "failed";

export interface SbpPaymentInvoice {
	readonly orderId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly sumRub: number;
	readonly sumKopecks: number;
	readonly purpose: string;
	readonly clinicName: string;
	readonly familyDepositOffsetRub?: number | undefined;
	readonly totalInvoiceRub?: number | undefined;
}
