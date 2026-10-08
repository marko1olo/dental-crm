import type { PaymentMethod } from "@dental/shared";
import type {
	PaymentRefundCorrectionAction,
	PaymentRefundCorrectionMethod,
} from "../../../AppConstants";

export interface FinancialSliceState {
	paidContractNumber: string;
	setPaidContractNumber: (val: string | ((prev: string) => string)) => void;
	paidContractDate: string;
	setPaidContractDate: (val: string | ((prev: string) => string)) => void;
	paidContractServiceStart: string;
	setPaidContractServiceStart: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractServiceEnd: string;
	setPaidContractServiceEnd: (val: string | ((prev: string) => string)) => void;
	paidContractCustomerFullName: string;
	setPaidContractCustomerFullName: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractRepresentativeFullName: string;
	setPaidContractRepresentativeFullName: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractCareReason: string;
	setPaidContractCareReason: (val: string | ((prev: string) => string)) => void;
	paidContractServiceScope: string;
	setPaidContractServiceScope: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractTotalRub: string;
	setPaidContractTotalRub: (val: string | ((prev: string) => string)) => void;
	paidContractPaymentTerms: string;
	setPaidContractPaymentTerms: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractPriceChangeRules: string;
	setPaidContractPriceChangeRules: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractFreeCareNotice: string;
	setPaidContractFreeCareNotice: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractRecommendationWarning: string;
	setPaidContractRecommendationWarning: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractRefundTerms: string;
	setPaidContractRefundTerms: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractWarrantyTerms: string;
	setPaidContractWarrantyTerms: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractDoctorFullName: string;
	setPaidContractDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	paidContractSignedAt: string;
	setPaidContractSignedAt: (val: string | ((prev: string) => string)) => void;
	paidContractClinicInfoConfirmed: boolean;
	setPaidContractClinicInfoConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paidContractServiceListConfirmed: boolean;
	setPaidContractServiceListConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paidContractPaidBasisConfirmed: boolean;
	setPaidContractPaidBasisConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paidContractWrittenChangesConfirmed: boolean;
	setPaidContractWrittenChangesConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentInvoiceNumber: string;
	setPaymentInvoiceNumber: (val: string | ((prev: string) => string)) => void;
	paymentInvoiceDate: string;
	setPaymentInvoiceDate: (val: string | ((prev: string) => string)) => void;
	paymentInvoicePayerFullName: string;
	setPaymentInvoicePayerFullName: (
		val: string | ((prev: string) => string),
	) => void;
	paymentInvoicePayerPhone: string;
	setPaymentInvoicePayerPhone: (
		val: string | ((prev: string) => string),
	) => void;
	paymentInvoicePayerEmail: string;
	setPaymentInvoicePayerEmail: (
		val: string | ((prev: string) => string),
	) => void;
	paymentInvoicePurpose: string;
	setPaymentInvoicePurpose: (val: string | ((prev: string) => string)) => void;
	paymentInvoiceDueDate: string;
	setPaymentInvoiceDueDate: (val: string | ((prev: string) => string)) => void;
	paymentInvoicePaymentTerms: string;
	setPaymentInvoicePaymentTerms: (
		val: string | ((prev: string) => string),
	) => void;
	paymentInvoiceBankDetails: string;
	setPaymentInvoiceBankDetails: (
		val: string | ((prev: string) => string),
	) => void;
	paymentInvoiceQrPayload: string;
	setPaymentInvoiceQrPayload: (
		val: string | ((prev: string) => string),
	) => void;
	paymentInvoiceCashlessAllowed: boolean;
	setPaymentInvoiceCashlessAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentInvoiceCashDeskAllowed: boolean;
	setPaymentInvoiceCashDeskAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentInvoiceRequisitesVerified: boolean;
	setPaymentInvoiceRequisitesVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentInvoiceServiceScopeConfirmed: boolean;
	setPaymentInvoiceServiceScopeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentInvoiceFiscalNoticeConfirmed: boolean;
	setPaymentInvoiceFiscalNoticeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentReceiptNumber: string;
	setPaymentReceiptNumber: (val: string | ((prev: string) => string)) => void;
	paymentReceiptDate: string;
	setPaymentReceiptDate: (val: string | ((prev: string) => string)) => void;
	paymentReceiptPayerFullName: string;
	setPaymentReceiptPayerFullName: (
		val: string | ((prev: string) => string),
	) => void;
	paymentReceiptPayerBirthDate: string;
	setPaymentReceiptPayerBirthDate: (
		val: string | ((prev: string) => string),
	) => void;
	paymentReceiptPayerInn: string;
	setPaymentReceiptPayerInn: (val: string | ((prev: string) => string)) => void;
	paymentReceiptPayerIdentityDocument: string;
	setPaymentReceiptPayerIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	paymentReceiptPayerRelationship: string;
	setPaymentReceiptPayerRelationship: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	paymentReceiptTaxSupportRequested: any;
	setPaymentReceiptTaxSupportRequested: (
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		val: any | ((prev: any) => any),
	) => void;
	paymentReceiptPurpose: string;
	setPaymentReceiptPurpose: (val: string | ((prev: string) => string)) => void;
	paymentReceiptIssuedBy: string;
	setPaymentReceiptIssuedBy: (val: string | ((prev: string) => string)) => void;
	paymentReceiptPaymentsVerified: boolean;
	setPaymentReceiptPaymentsVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentReceiptPayerVerified: boolean;
	setPaymentReceiptPayerVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	paymentReceiptFiscalNoticeConfirmed: boolean;
	setPaymentReceiptFiscalNoticeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	installmentScheduleNumber: string;
	setInstallmentScheduleNumber: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleDate: string;
	setInstallmentScheduleDate: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleBaseDocumentTitle: string;
	setInstallmentScheduleBaseDocumentTitle: (
		val: string | ((prev: string) => string),
	) => void;
	installmentSchedulePayerFullName: string;
	setInstallmentSchedulePayerFullName: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleTotalRub: string;
	setInstallmentScheduleTotalRub: (
		val: string | ((prev: string) => string),
	) => void;
	installmentSchedulePrepaidRub: string;
	setInstallmentSchedulePrepaidRub: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleRows: string;
	setInstallmentScheduleRows: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleLatePolicy: string;
	setInstallmentScheduleLatePolicy: (
		val: string | ((prev: string) => string),
	) => void;
	installmentSchedulePaymentMethodNotes: string;
	setInstallmentSchedulePaymentMethodNotes: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleResponsibleFullName: string;
	setInstallmentScheduleResponsibleFullName: (
		val: string | ((prev: string) => string),
	) => void;
	installmentScheduleAccepted: boolean;
	setInstallmentScheduleAccepted: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	installmentScheduleFiscalNoticeConfirmed: boolean;
	setInstallmentScheduleFiscalNoticeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	installmentScheduleWrittenChangesConfirmed: boolean;
	setInstallmentScheduleWrittenChangesConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	warrantyServiceOrWorkName: string;
	setWarrantyServiceOrWorkName: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyCompletedAt: string;
	setWarrantyCompletedAt: (val: string | ((prev: string) => string)) => void;
	warrantyTeethOrArea: string;
	setWarrantyTeethOrArea: (val: string | ((prev: string) => string)) => void;
	warrantyMaterialsOrSystems: string;
	setWarrantyMaterialsOrSystems: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyPeriod: string;
	setWarrantyPeriod: (val: string | ((prev: string) => string)) => void;
	warrantyControlVisitSchedule: string;
	setWarrantyControlVisitSchedule: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyPatientObligations: string;
	setWarrantyPatientObligations: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyExcludedRiskFactors: string;
	setWarrantyExcludedRiskFactors: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyUrgentContactReasons: string;
	setWarrantyUrgentContactReasons: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyLinkedActOrContract: string;
	setWarrantyLinkedActOrContract: (
		val: string | ((prev: string) => string),
	) => void;
	warrantyDoctorFullName: string;
	setWarrantyDoctorFullName: (val: string | ((prev: string) => string)) => void;
	warrantyIssuedAt: string;
	setWarrantyIssuedAt: (val: string | ((prev: string) => string)) => void;
	warrantyPolicyApplied: boolean;
	setWarrantyPolicyApplied: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	warrantyAftercareReceived: boolean;
	setWarrantyAftercareReceived: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	warrantyControlVisitsUnderstood: boolean;
	setWarrantyControlVisitsUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	refundAction: PaymentRefundCorrectionAction;
	setRefundAction: (
		val:
			| PaymentRefundCorrectionAction
			| ((
					prev: PaymentRefundCorrectionAction,
			  ) => PaymentRefundCorrectionAction),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	refundAmountRub: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setRefundAmountRub: (val: any | ((prev: any) => any)) => void;
	refundReason: string;
	setRefundReason: (val: string | ((prev: string) => string)) => void;
	refundMethod: PaymentRefundCorrectionMethod;
	setRefundMethod: (
		val:
			| PaymentRefundCorrectionMethod
			| ((
					prev: PaymentRefundCorrectionMethod,
			  ) => PaymentRefundCorrectionMethod),
	) => void;
	refundRecipientFullName: string;
	setRefundRecipientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	refundRecipientIdentityDocument: string;
	setRefundRecipientIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	refundBankDetails: string;
	setRefundBankDetails: (val: string | ((prev: string) => string)) => void;
	refundSelectedPaymentId: string;
	setRefundSelectedPaymentId: (
		val: string | ((prev: string) => string),
	) => void;
	refundOriginalFiscalReceiptNumber: string;
	setRefundOriginalFiscalReceiptNumber: (
		val: string | ((prev: string) => string),
	) => void;
	refundCorrectionFiscalReceiptNumber: string;
	setRefundCorrectionFiscalReceiptNumber: (
		val: string | ((prev: string) => string),
	) => void;
	refundAccountantDecision: string;
	setRefundAccountantDecision: (
		val: string | ((prev: string) => string),
	) => void;
	paymentAmount: string;
	setPaymentAmount: (val: string | ((prev: string) => string)) => void;
	paymentMethod: PaymentMethod;
	setPaymentMethod: (
		val: PaymentMethod | ((prev: PaymentMethod) => PaymentMethod),
	) => void;
	paymentFiscalReceiptNumber: string;
	setPaymentFiscalReceiptNumber: (
		val: string | ((prev: string) => string),
	) => void;
	paymentFiscalReceiptIssuedAt: string;
	setPaymentFiscalReceiptIssuedAt: (
		val: string | ((prev: string) => string),
	) => void;
	paymentFiscalFn: string;
	setPaymentFiscalFn: (val: string | ((prev: string) => string)) => void;
	paymentFiscalFd: string;
	setPaymentFiscalFd: (val: string | ((prev: string) => string)) => void;
	paymentFiscalFpd: string;
	setPaymentFiscalFpd: (val: string | ((prev: string) => string)) => void;
	paymentFiscalCashierName: string;
	setPaymentFiscalCashierName: (
		val: string | ((prev: string) => string),
	) => void;
	paymentFiscalReceiptUrl: string;
	setPaymentFiscalReceiptUrl: (
		val: string | ((prev: string) => string),
	) => void;
	paymentPayerFullName: string;
	setPaymentPayerFullName: (val: string | ((prev: string) => string)) => void;
	paymentPayerInn: string;
	setPaymentPayerInn: (val: string | ((prev: string) => string)) => void;
	paymentPayerBirthDate: string;
	setPaymentPayerBirthDate: (val: string | ((prev: string) => string)) => void;
	paymentPayerIdentityDocument: string;
	setPaymentPayerIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	paymentPayerRelationship: string;
	setPaymentPayerRelationship: (
		val: string | ((prev: string) => string),
	) => void;
	paymentTaxDeductionCode: "" | "1" | "2";
	setPaymentTaxDeductionCode: (
		val: "" | "1" | "2" | ((prev: "" | "1" | "2") => "" | "1" | "2"),
	) => void;
	paymentFeedback: string;
	setPaymentFeedback: (val: string | ((prev: string) => string)) => void;
}
