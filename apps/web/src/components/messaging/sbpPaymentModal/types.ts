import type { SbpPaymentInvoice, SbpPaymentStatus } from "../omnichannelTypes.js";

export interface SbpPaymentSuccessResult {
	readonly orderId: string;
	readonly sumRub: number;
	readonly fiscalReceiptId: string | null;
	readonly isManualReconciliation?: boolean | undefined;
}

export interface SbpPaymentQrModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly invoice: SbpPaymentInvoice;
	readonly onPaymentSuccess?: ((result: SbpPaymentSuccessResult) => void) | undefined;
	readonly onSendToChat?: ((channel: "whatsapp" | "telegram", messageText: string) => void) | undefined;
	readonly onCheckStatus?:
		| ((orderId: string) => Promise<{ paid: boolean; fiscalReceiptId?: string | null }>)
		| undefined;
	readonly defaultTtlMinutes?: number | undefined;
	readonly embedded?: boolean | undefined;
}

export interface SbpStatusCheckMessage {
	readonly text: string;
	readonly type: "info" | "success" | "warning";
}

export type { SbpPaymentStatus };
