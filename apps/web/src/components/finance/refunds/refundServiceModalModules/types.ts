import type { PartialRefundCalculationResult } from "@dental/shared";

export type RefundPaymentMethod = "card" | "cash" | "advance_deposit";
export type RefundTabMode = "form" | "receipt";

export interface RefundServiceItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly priceRub: number;
	readonly quantity: number;
	readonly doctorName?: string | undefined;
	readonly commissionPct?: number | undefined;
	readonly materialCostRub?: number | undefined;
}

export interface RefundServiceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly invoiceId: string;
	readonly invoiceNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly originalPaymentId?: string | undefined;
	readonly paymentId?: string | undefined;
	readonly originalReceiptNumber?: string | undefined;
	readonly originalFiscalSign?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorCommissionPct?: number | undefined;
	readonly services?: readonly RefundServiceItem[] | undefined;
	readonly onRefundSuccess?: ((result: PartialRefundCalculationResult) => void) | undefined;
}

export interface RefundFiscalInfo {
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly ofdUrl?: string | undefined;
	readonly queueId?: string | undefined;
	readonly isOfflineBuffered: boolean;
}

export interface RefundClinicInfo {
	readonly name: string;
	readonly inn: string;
	readonly kpp: string;
	readonly address: string;
}
