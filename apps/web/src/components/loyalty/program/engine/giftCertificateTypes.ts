export interface GiftCertificate {
	readonly id: string;
	readonly serialNumber: string; // 16 digits: 7701-XXXX-XXXX-XXXC (Luhn verified)
	readonly nominalKop?: number;
	readonly initialBalanceKop: number;
	readonly currentBalanceKop: number;
	readonly initialBalanceRub?: number;
	readonly currentBalanceRub?: number;
	readonly purchaserPatientId?: string;
	readonly purchaserName?: string;
	readonly recipientPatientId?: string;
	readonly recipientName?: string;
	readonly recipientPhone?: string;
	readonly buyerPatientId?: string;
	readonly buyerPatientName?: string;
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly status: "active" | "depleted" | "expired" | "cancelled";
	readonly note?: string;
	readonly noteRu?: string;
}

export interface GiftCertificateRedemptionResult {
	readonly success: boolean;
	readonly certificateId: string;
	readonly serialNumber: string;
	readonly previousBalanceKop: number;
	readonly redeemedAmountKop: number;
	readonly newBalanceKop: number;
	readonly coveredInvoiceAmountKop: number;
	readonly remainingInvoiceAmountKop: number;
	readonly newStatus: "active" | "depleted" | "expired" | "cancelled";
	readonly errorMessageRu?: string;
}
