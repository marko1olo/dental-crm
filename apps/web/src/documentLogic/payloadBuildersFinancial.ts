import type { DocumentPayload, GeneratedDocument } from "@dental/shared";
import { fromDateTimeLocalValue } from "../AppHelpers";
import { normalizeRubAmountInput } from "../rubAmountInput";
import type { DocumentState } from "./types";

export function buildFinancialPayload(
	kind: GeneratedDocument["kind"],
	state: DocumentState,
): DocumentPayload | null {
	if (kind === "paid_medical_services_contract") {
		const {
			paidContractNumber,
			paidContractDate,
			paidContractServiceStart,
			paidContractServiceEnd,
			paidContractCustomerFullNameValue,
			paidContractRepresentativeFullName,
			paidContractCareReasonValue,
			paidContractServiceScopeValue,
			paidContractTotalRubValue,
			paidContractPaymentTerms,
			paidContractPriceChangeRules,
			paidContractFreeCareNotice,
			paidContractRecommendationWarning,
			paidContractRefundTerms,
			paidContractWarrantyTerms,
			paidContractDoctorFullNameValue,
			paidContractSignedAt,
			confirmedDocumentLiteral,
			paidContractClinicInfoConfirmed,
			paidContractServiceListConfirmed,
			paidContractPaidBasisConfirmed,
			paidContractWrittenChangesConfirmed,
		} = state;
		return {
			paidMedicalServicesContract: {
				contractNumber: paidContractNumber.trim(),
				contractDate: paidContractDate.trim(),
				serviceStart: paidContractServiceStart.trim(),
				serviceEndOrCondition: paidContractServiceEnd.trim(),
				customerFullName: paidContractCustomerFullNameValue(),
				representativeFullName:
					paidContractRepresentativeFullName.trim() || null,
				plannedCareReason: paidContractCareReasonValue(),
				serviceScopeSummary: paidContractServiceScopeValue(),
				estimatedTotalRub: paidContractTotalRubValue(),
				paymentTerms: paidContractPaymentTerms.trim(),
				priceChangeRules: paidContractPriceChangeRules.trim(),
				freeCareAvailabilityNotice: paidContractFreeCareNotice.trim(),
				medicalRecommendationWarning: paidContractRecommendationWarning.trim(),
				refusalAndRefundTerms: paidContractRefundTerms.trim(),
				warrantyAndClaimsTerms: paidContractWarrantyTerms.trim(),
				doctorFullName: paidContractDoctorFullNameValue(),
				signedAt: paidContractSignedAt.trim(),
				patientReceivedClinicInfo: confirmedDocumentLiteral(
					paidContractClinicInfoConfirmed,
					"информация о клинике получена",
				),
				patientReceivedPriceAndServiceList: confirmedDocumentLiteral(
					paidContractServiceListConfirmed,
					"перечень услуг и цены получены",
				),
				patientUnderstandsPaidBasis: confirmedDocumentLiteral(
					paidContractPaidBasisConfirmed,
					"платная основа понятна",
				),
				changesRequireWrittenAgreement: confirmedDocumentLiteral(
					paidContractWrittenChangesConfirmed,
					"изменения оформляются письменно",
				),
			},
		};
	}

	if (kind === "completed_works_act") {
		const {
			completedActNumber,
			completedActDate,
			completedActContractNumber,
			selectedCompletedActContractDocumentId,
			completedActServicePeriodStart,
			completedActServicePeriodEnd,
			completedActDoctorFullNameValue,
			completedActServicesSummaryValue,
			completedActTotalRubValue,
			completedActPaidRubValue,
			completedActFiscalReceiptLines,
			completedActPatientClaims,
			completedActLinkedContract,
			completedActFinalScopeConfirmed,
			completedActFiscalReceiptsVerified,
			completedActAccepted,
			confirmedDocumentLiteral,
		} = state;
		return {
			completedWorksAct: {
				actNumber: completedActNumber.trim(),
				actDate: completedActDate.trim(),
				contractNumber: completedActContractNumber.trim(),
				linkedContractDocumentId: selectedCompletedActContractDocumentId,
				servicePeriodStart: completedActServicePeriodStart.trim(),
				servicePeriodEnd: completedActServicePeriodEnd.trim(),
				doctorFullName: completedActDoctorFullNameValue(),
				acceptedServicesSummary: completedActServicesSummaryValue(),
				totalByActRub: completedActTotalRubValue(),
				paidRub: completedActPaidRubValue(),
				fiscalReceiptNumbers: completedActFiscalReceiptLines(),
				patientClaimsText: completedActPatientClaims.trim() || null,
				linkedToSignedContract: confirmedDocumentLiteral(
					completedActLinkedContract,
					"акт связан с подписанным договором",
				),
				finalServiceScopeConfirmed: confirmedDocumentLiteral(
					completedActFinalScopeConfirmed,
					"итоговый объем услуг подтвержден",
				),
				fiscalReceiptsVerified: confirmedDocumentLiteral(
					completedActFiscalReceiptsVerified,
					"фискальные чеки проверены",
				),
				patientAcceptedWorks: confirmedDocumentLiteral(
					completedActAccepted,
					"пациент принял работы",
				),
			},
		};
	}

	if (kind === "treatment_cost_estimate") {
		const {
			treatmentEstimateNumber,
			treatmentEstimateDate,
			treatmentEstimatePatientOrPayerFullNameValue,
			treatmentEstimateTreatmentBasisValue,
			plannedServiceLinesForFinancialPayload,
			treatmentEstimateTotalRubValue,
			treatmentEstimateValidUntil,
			treatmentEstimatePriceChangeRules,
			documentTextLines,
			treatmentEstimateExcludedItems,
			treatmentEstimatePaymentMilestoneNotes,
			treatmentEstimateDoctorFullNameValue,
			treatmentEstimateAdminFullName,
			treatmentEstimateSignedAt,
			treatmentEstimatePreliminaryConfirmed,
			treatmentEstimateScopeConfirmed,
			treatmentEstimateFiscalNoticeConfirmed,
			treatmentEstimateChangeRulesConfirmed,
			confirmedDocumentLiteral,
		} = state;
		return {
			treatmentCostEstimate: {
				estimateNumber: treatmentEstimateNumber.trim(),
				estimateDate: treatmentEstimateDate.trim(),
				patientOrPayerFullName: treatmentEstimatePatientOrPayerFullNameValue(),
				treatmentBasis: treatmentEstimateTreatmentBasisValue(),
				serviceLines: plannedServiceLinesForFinancialPayload(),
				totalAmountRub: treatmentEstimateTotalRubValue(),
				estimateValidUntil: treatmentEstimateValidUntil.trim(),
				priceChangeRules: treatmentEstimatePriceChangeRules.trim(),
				excludedItems: documentTextLines(treatmentEstimateExcludedItems),
				paymentMilestoneNotes: treatmentEstimatePaymentMilestoneNotes.trim(),
				responsibleDoctorFullName: treatmentEstimateDoctorFullNameValue(),
				responsibleAdminFullName: treatmentEstimateAdminFullName.trim() || null,
				signedAt: treatmentEstimateSignedAt.trim(),
				patientUnderstandsPreliminaryEstimate: confirmedDocumentLiteral(
					treatmentEstimatePreliminaryConfirmed,
					"предварительный характер сметы понятен",
				),
				serviceScopeMatchesTreatmentPlan: confirmedDocumentLiteral(
					treatmentEstimateScopeConfirmed,
					"объем сметы соответствует плану",
				),
				estimateDoesNotReplaceContractOrFiscalReceipt: confirmedDocumentLiteral(
					treatmentEstimateFiscalNoticeConfirmed,
					"смета не заменяет договор и чек",
				),
				changesRequireUpdatedEstimate: confirmedDocumentLiteral(
					treatmentEstimateChangeRulesConfirmed,
					"изменения требуют обновления сметы",
				),
			},
		};
	}

	if (kind === "payment_invoice") {
		const {
			paymentInvoiceNumber,
			paymentInvoiceDate,
			paymentInvoicePayerFullNameValue,
			paymentInvoicePayerPhone,
			paymentInvoicePayerEmail,
			paymentInvoicePurpose,
			plannedServiceLinesForFinancialPayload,
			paymentInvoiceTotalRubValue,
			paymentInvoiceDueDate,
			paymentInvoicePaymentTerms,
			paymentInvoiceBankDetailsValue,
			paymentInvoiceCashlessAllowed,
			paymentInvoiceCashDeskAllowed,
			paymentInvoiceQrPayload,
			paymentInvoiceRequisitesVerified,
			paymentInvoiceServiceScopeConfirmed,
			paymentInvoiceFiscalNoticeConfirmed,
			confirmedDocumentLiteral,
		} = state;
		return {
			paymentInvoice: {
				invoiceNumber: paymentInvoiceNumber.trim(),
				invoiceDate: paymentInvoiceDate.trim(),
				payerFullName: paymentInvoicePayerFullNameValue(),
				payerPhone: paymentInvoicePayerPhone.trim() || null,
				payerEmail: paymentInvoicePayerEmail.trim() || null,
				paymentPurpose: paymentInvoicePurpose.trim(),
				serviceLines: plannedServiceLinesForFinancialPayload(),
				totalAmountRub: paymentInvoiceTotalRubValue(),
				dueDate: paymentInvoiceDueDate.trim(),
				paymentTerms: paymentInvoicePaymentTerms.trim(),
				clinicBankDetails: paymentInvoiceBankDetailsValue(),
				cashlessPaymentAllowed: paymentInvoiceCashlessAllowed,
				cashDeskPaymentAllowed: paymentInvoiceCashDeskAllowed,
				qrPaymentPayload: paymentInvoiceQrPayload.trim() || null,
				clinicRequisitesVerified: confirmedDocumentLiteral(
					paymentInvoiceRequisitesVerified,
					"реквизиты клиники проверены",
				),
				serviceScopeConfirmed: confirmedDocumentLiteral(
					paymentInvoiceServiceScopeConfirmed,
					"объем услуги в счете подтвержден",
				),
				payerInformedInvoiceIsNotFiscalReceipt: confirmedDocumentLiteral(
					paymentInvoiceFiscalNoticeConfirmed,
					"плательщик понимает, что счет не является чеком",
				),
			},
		};
	}

	if (kind === "payment_receipt") {
		const {
			paymentReceiptNumber,
			paymentReceiptDate,
			selectedPaymentReceiptPayments,
			selectedPaymentReceiptTotalRub,
			paymentReceiptPayerFullNameValue,
			paymentReceiptTaxSupportRequested,
			paymentReceiptPayerBirthDateValue,
			paymentReceiptPayerInnValue,
			paymentReceiptPayerIdentityDocumentValue,
			paymentReceiptPayerRelationshipValue,
			paymentReceiptPurpose,
			paymentReceiptFiscalReceiptLines,
			paymentReceiptIssuedByValue,
			paymentReceiptPaymentsVerified,
			paymentReceiptPayerVerified,
			paymentReceiptFiscalNoticeConfirmed,
			confirmedDocumentLiteral,
		} = state;
		return {
			paymentReceipt: {
				receiptNumber: paymentReceiptNumber.trim(),
				receiptDate: paymentReceiptDate.trim(),
				selectedPaymentIds: selectedPaymentReceiptPayments.map(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(payment: any) => payment.id,
				),
				totalPaidRub: selectedPaymentReceiptTotalRub,
				payerFullName: paymentReceiptPayerFullNameValue(),
				taxSupportRequested: paymentReceiptTaxSupportRequested,
				payerBirthDate: paymentReceiptTaxSupportRequested
					? paymentReceiptPayerBirthDateValue()
					: null,
				payerInn: paymentReceiptTaxSupportRequested
					? paymentReceiptPayerInnValue() || null
					: null,
				payerIdentityDocument: paymentReceiptTaxSupportRequested
					? paymentReceiptPayerIdentityDocumentValue() || null
					: null,
				payerRelationship: paymentReceiptTaxSupportRequested
					? paymentReceiptPayerRelationshipValue()
					: null,
				paymentPurpose: paymentReceiptPurpose.trim(),
				fiscalReceiptNumbers: paymentReceiptFiscalReceiptLines(),
				issuedByFullName: paymentReceiptIssuedByValue(),
				paymentAndFiscalDataVerified: confirmedDocumentLiteral(
					paymentReceiptPaymentsVerified,
					"платежи и фискальные чеки сверены",
				),
				payerIdentityVerified: confirmedDocumentLiteral(
					paymentReceiptPayerVerified,
					"данные плательщика проверены",
				),
				receiptDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(
					paymentReceiptFiscalNoticeConfirmed,
					"квитанция не заменяет кассовый чек",
				),
			},
		};
	}

	if (kind === "installment_payment_schedule") {
		const {
			installmentScheduleNumber,
			installmentScheduleDate,
			installmentScheduleBaseDocumentTitleValue,
			installmentSchedulePayerFullNameValue,
			installmentScheduleTotalRubValue,
			installmentSchedulePrepaidRubValue,
			installmentScheduleRemainingRubValue,
			installmentScheduleInstallmentRows,
			installmentScheduleLatePolicy,
			installmentSchedulePaymentMethodNotes,
			installmentScheduleResponsibleFullNameValue,
			installmentScheduleAccepted,
			installmentScheduleFiscalNoticeConfirmed,
			installmentScheduleWrittenChangesConfirmed,
			confirmedDocumentLiteral,
		} = state;
		return {
			installmentPaymentSchedule: {
				scheduleNumber: installmentScheduleNumber.trim(),
				scheduleDate: installmentScheduleDate.trim(),
				baseDocumentTitle: installmentScheduleBaseDocumentTitleValue(),
				payerFullName: installmentSchedulePayerFullNameValue(),
				totalAmountRub: installmentScheduleTotalRubValue(),
				prepaidAmountRub: installmentSchedulePrepaidRubValue(),
				remainingAmountRub: installmentScheduleRemainingRubValue(),
				installments: installmentScheduleInstallmentRows(),
				latePaymentPolicy: installmentScheduleLatePolicy.trim(),
				paymentMethodNotes: installmentSchedulePaymentMethodNotes.trim(),
				responsibleStaffFullName: installmentScheduleResponsibleFullNameValue(),
				patientAcceptedSchedule: confirmedDocumentLiteral(
					installmentScheduleAccepted,
					"график платежей принят",
				),
				scheduleDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(
					installmentScheduleFiscalNoticeConfirmed,
					"график не заменяет кассовый чек",
				),
				changesRequireWrittenAgreement: confirmedDocumentLiteral(
					installmentScheduleWrittenChangesConfirmed,
					"изменения графика оформляются письменно",
				),
			},
		};
	}

	if (kind === "warranty_service_memo") {
		const {
			warrantyServiceOrWorkNameValue,
			warrantyCompletedAt,
			warrantyTeethOrAreaValue,
			warrantyMaterialsOrSystems,
			warrantyPeriod,
			warrantyControlVisitSchedule,
			warrantyPatientObligations,
			warrantyExcludedRiskFactors,
			warrantyUrgentContactReasons,
			warrantyLinkedActOrContractValue,
			warrantyDoctorFullNameValue,
			warrantyIssuedAt,
			warrantyPolicyApplied,
			warrantyAftercareReceived,
			warrantyControlVisitsUnderstood,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			warrantyServiceMemo: {
				serviceOrWorkName: warrantyServiceOrWorkNameValue(),
				completedAt: warrantyCompletedAt.trim(),
				teethOrArea: warrantyTeethOrAreaValue(),
				materialsOrSystems: warrantyMaterialsOrSystems.trim(),
				warrantyPeriod: warrantyPeriod.trim(),
				controlVisitSchedule: warrantyControlVisitSchedule.trim(),
				patientObligations: documentTextLines(warrantyPatientObligations),
				excludedRiskFactors: documentTextLines(warrantyExcludedRiskFactors),
				urgentContactReasons: documentTextLines(warrantyUrgentContactReasons),
				linkedActOrContract: warrantyLinkedActOrContractValue(),
				doctorFullName: warrantyDoctorFullNameValue(),
				issuedAt: warrantyIssuedAt.trim(),
				localWarrantyPolicyApplied: confirmedDocumentLiteral(
					warrantyPolicyApplied,
					"локальное гарантийное положение применено",
				),
				patientReceivedAftercare: confirmedDocumentLiteral(
					warrantyAftercareReceived,
					"пациент получил рекомендации",
				),
				patientUnderstandsControlVisits: confirmedDocumentLiteral(
					warrantyControlVisitsUnderstood,
					"контрольные визиты понятны",
				),
			},
		};
	}

	if (kind === "tax_deduction_application") {
		const {
			taxApplicationTaxpayerFullName,
			taxApplicationTaxpayerInn,
			taxApplicationTaxpayerBirthDate,
			taxApplicationTaxpayerIdentityDocument,
			taxApplicationRelationship,
			taxDocumentYear,
			taxApplicationForm,
			selectedTaxPaymentIdsForCurrentDocument,
			taxApplicationDeliveryChannel,
			taxApplicationContact,
			taxApplicationAuthorityDocument,
			taxApplicationRequestedAt,
			taxApplicationDuplicateWarningAccepted,
			confirmedDocumentLiteral,
		} = state;
		return {
			taxDeductionApplication: {
				taxpayerFullName: taxApplicationTaxpayerFullName.trim(),
				taxpayerInn: taxApplicationTaxpayerInn.replace(/[^\d]/g, ""),
				taxpayerBirthDate: taxApplicationTaxpayerBirthDate.trim(),
				taxpayerIdentityDocument: taxApplicationTaxpayerIdentityDocument.trim(),
				relationshipToPatient: taxApplicationRelationship,
				requestedTaxYear: taxDocumentYear,
				requestedForm: taxApplicationForm,
				selectedPaymentIds: selectedTaxPaymentIdsForCurrentDocument(),
				deliveryChannel: taxApplicationDeliveryChannel,
				contactForReadyDocument: taxApplicationContact.trim(),
				applicantAuthorityDocument:
					taxApplicationAuthorityDocument.trim() || null,
				requestedAt: fromDateTimeLocalValue(taxApplicationRequestedAt),
				duplicateWarningAccepted: confirmedDocumentLiteral(
					taxApplicationDuplicateWarningAccepted,
					"проверка дублей налоговой справки подтверждена",
				),
			},
		};
	}

	if (kind === "payment_refund_correction_request") {
		const {
			refundAction,
			refundSelectedPaymentId,
			refundAmountRub,
			refundReason,
			refundRecipientFullName,
			refundRecipientIdentityDocument,
			refundBankDetails,
			refundOriginalFiscalReceiptNumber,
			refundCorrectionFiscalReceiptNumber,
			refundAccountantDecision,
		} = state;
		return {
			paymentRefundCorrection: {
				action: refundAction,
				selectedPaymentIds: refundSelectedPaymentId
					? [refundSelectedPaymentId]
					: [],
				amountRub: normalizeRubAmountInput(refundAmountRub) ?? 0,
				reason: refundReason.trim(),
				refundMethod: state.refundMethod,
				recipientFullName: refundRecipientFullName.trim(),
				recipientIdentityDocument: refundRecipientIdentityDocument.trim(),
				bankDetails: refundBankDetails.trim() || null,
				originalFiscalReceiptNumber: refundOriginalFiscalReceiptNumber.trim(),
				correctionFiscalReceiptNumber:
					refundCorrectionFiscalReceiptNumber.trim() || null,
				accountantDecision: refundAccountantDecision.trim(),
			},
		};
	}

	return null;
}
