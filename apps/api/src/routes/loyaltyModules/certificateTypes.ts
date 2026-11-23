/**
 * apps/api/src/routes/loyaltyModules/certificateTypes.ts
 *
 * Types for Loyalty & Gift Certificate Domain Services.
 */

export interface FormattedCertificateDto {
	readonly id: string;
	readonly serialNumber: string;
	readonly nominalRub: number;
	readonly currentBalanceRub: number;
	readonly nominalKop: number;
	readonly currentBalanceKop: number;
	readonly status: string;
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly purchaserPatientId?: string | null | undefined;
	readonly purchaserName?: string | null | undefined;
	readonly recipientPatientId?: string | null | undefined;
	readonly recipientName?: string | null | undefined;
	readonly recipientPhone?: string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly initialBalanceRub?: number | undefined;
	readonly initialBalanceKop?: number | undefined;
	readonly relatedPaymentId?: string | null | undefined;
}

export type RedeemCertificateResult =
	| { readonly notFound: true; readonly message: string }
	| { readonly error: true; readonly message: string; readonly code: number }
	| {
			readonly success: true;
			readonly replayed?: boolean | undefined;
			readonly certificateId: string;
			readonly serialNumber: string;
			readonly previousBalanceRub: number;
			readonly redeemedAmountRub: number;
			readonly newBalanceRub: number;
			readonly remainingInvoiceAmountRub: number;
			readonly status: string;
			readonly paymentId: string | null;
			readonly invoicePaid: boolean;
			readonly fiscal54FzSplit: {
				readonly tag1215AdvanceOffsetKop: number;
				readonly tag1081ElectronicKop: number;
			};
	  };
