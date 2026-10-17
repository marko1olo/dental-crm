import type { PaymentMethod } from "@dental/shared";
import type { TaxDeductionCode } from "../PaymentTaxPayerDetails";

export type { TaxDeductionCode };

export type PaymentCaptureProps = {
	amount: string;
	feedback: string;
	fiscalCashierName: string;
	fiscalFd: string;
	fiscalFn: string;
	fiscalFpd: string;
	fiscalReceiptIssuedAt: string;
	fiscalReceiptNumber: string;
	fiscalReceiptUrl: string;
	isSaving: boolean;
	method: PaymentMethod;
	methodLabels: Record<PaymentMethod, string>;
	onAmountChange: (value: string) => void;
	onFiscalCashierNameChange: (value: string) => void;
	onFiscalFdChange: (value: string) => void;
	onFiscalFnChange: (value: string) => void;
	onFiscalFpdChange: (value: string) => void;
	onFiscalReceiptIssuedAtChange: (value: string) => void;
	onFiscalReceiptNumberChange: (value: string) => void;
	onFiscalReceiptUrlChange: (value: string) => void;
	onMethodChange: (value: PaymentMethod) => void;
	onPayerBirthDateChange: (value: string) => void;
	onPayerFullNameChange: (value: string) => void;
	onPayerIdentityDocumentChange: (value: string) => void;
	onPayerInnChange: (value: string) => void;
	onPayerRelationshipChange: (value: string) => void;
	onSubmit: () => void;
	onTaxDeductionCodeChange: (value: TaxDeductionCode) => void;
	patientContextMessage: string;
	patientContextReady: boolean;
	patientDefaults: {
		birthDate?: string | null;
		fullName?: string | null;
		identityDocument?: string | null;
		taxpayerInn?: string | null;
	};
	patientId?: string | null;
	payerBirthDate: string;
	payerFullName: string;
	payerIdentityDocument: string;
	payerInn: string;
	payerRelationship: string;
	taxDeductionCode: TaxDeductionCode;
	remainingDebt?: number;
};

export const visiblePaymentMethods: PaymentMethod[] = [
	"cash",
	"card",
	"family_wallet",
	"online",
	"bank_transfer",
];
