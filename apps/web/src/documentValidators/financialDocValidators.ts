import {
	isDateInputValue,
	isDateTimeLocalInputValue,
} from "../AppHelpers";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "../rubAmountInput";
import { requiredDocumentField as defaultRequiredDocumentField } from "./regexRules";
import type { DocumentState, ValidationResult } from "./types";

export function validateCompletedWorksAct(
	state: DocumentState,
): ValidationResult {
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
		completedActLinkedContract,
		completedActFinalScopeConfirmed,
		completedActFiscalReceiptsVerified,
		completedActAccepted,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(completedActNumber, "акт, номер") ??
		requiredDocumentField(completedActDate, "акт, дата") ??
		requiredDocumentField(completedActContractNumber, "акт, договор") ??
		(selectedCompletedActContractDocumentId
			? null
			: "Выберите конкретный уже выданный договор для акта.") ??
		requiredDocumentField(
			completedActServicePeriodStart,
			"акт, начало периода оказания",
		) ??
		requiredDocumentField(
			completedActServicePeriodEnd,
			"акт, окончание периода оказания",
		) ??
		requiredDocumentField(
			completedActDoctorFullNameValue(),
			"акт, врач-исполнитель",
		) ??
		requiredDocumentField(
			completedActServicesSummaryValue(),
			"акт, состав работ",
		) ??
		(completedActTotalRubValue() > 0 ? null : "Укажите сумму по акту.") ??
		(completedActPaidRubValue() > 0
			? null
			: "Для акта нужна фактическая оплаченная сумма.") ??
		(completedActFiscalReceiptLines().length
			? null
			: "Добавьте номера фискальных чеков по акту.") ??
		(completedActLinkedContract
			? null
			: "Подтвердите связь акта с подписанным договором.") ??
		(completedActFinalScopeConfirmed
			? null
			: "Подтвердите финальный состав работ.") ??
		(completedActFiscalReceiptsVerified
			? null
			: "Подтвердите проверку фискальных чеков.") ??
		(completedActAccepted ? null : "Подтвердите приемку работ пациентом.")
	);
}

export function validateTreatmentCostEstimate(
	state: DocumentState,
): ValidationResult {
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
		treatmentEstimateSignedAt,
		treatmentEstimatePreliminaryConfirmed,
		treatmentEstimateScopeConfirmed,
		treatmentEstimateFiscalNoticeConfirmed,
		treatmentEstimateChangeRulesConfirmed,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const serviceLines = plannedServiceLinesForFinancialPayload();
	return (
		requiredDocumentField(treatmentEstimateNumber, "смета, номер") ??
		requiredDocumentField(treatmentEstimateDate, "смета, дата") ??
		requiredDocumentField(
			treatmentEstimatePatientOrPayerFullNameValue(),
			"смета, пациент или плательщик",
		) ??
		requiredDocumentField(
			treatmentEstimateTreatmentBasisValue(),
			"смета, основание лечения",
		) ??
		(serviceLines.length
			? null
			: "Для сметы нужен состав услуг из плана лечения.") ??
		(treatmentEstimateTotalRubValue() > 0
			? null
			: "Укажите итоговую сумму сметы.") ??
		requiredDocumentField(
			treatmentEstimateValidUntil,
			"смета, срок действия",
		) ??
		requiredDocumentField(
			treatmentEstimatePriceChangeRules,
			"смета, правила изменения цены",
		) ??
		(documentTextLines(treatmentEstimateExcludedItems).length
			? null
			: "Укажите, что не входит в текущую смету.") ??
		requiredDocumentField(
			treatmentEstimatePaymentMilestoneNotes,
			"смета, условия оплаты",
		) ??
		requiredDocumentField(
			treatmentEstimateDoctorFullNameValue(),
			"смета, ответственный врач",
		) ??
		requiredDocumentField(
			treatmentEstimateSignedAt,
			"смета, дата ознакомления",
		) ??
		(treatmentEstimatePreliminaryConfirmed
			? null
			: "Подтвердите предварительный характер сметы.") ??
		(treatmentEstimateScopeConfirmed
			? null
			: "Подтвердите соответствие состава услуг плану лечения.") ??
		(treatmentEstimateFiscalNoticeConfirmed
			? null
			: "Подтвердите, что смета не заменяет договор, акт и кассовый чек.") ??
		(treatmentEstimateChangeRulesConfirmed
			? null
			: "Подтвердите правило обновления сметы при изменениях.")
	);
}

export function validatePaymentInvoice(
	state: DocumentState,
): ValidationResult {
	const {
		plannedServiceLinesForFinancialPayload,
		paymentInvoiceNumber,
		paymentInvoiceDate,
		paymentInvoicePayerFullNameValue,
		paymentInvoicePurpose,
		paymentInvoiceTotalRubValue,
		paymentInvoiceDueDate,
		paymentInvoicePaymentTerms,
		paymentInvoiceBankDetailsValue,
		paymentInvoiceCashlessAllowed,
		paymentInvoiceCashDeskAllowed,
		paymentInvoiceRequisitesVerified,
		paymentInvoiceServiceScopeConfirmed,
		paymentInvoiceFiscalNoticeConfirmed,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const serviceLines = plannedServiceLinesForFinancialPayload();
	return (
		requiredDocumentField(paymentInvoiceNumber, "счет, номер") ??
		requiredDocumentField(paymentInvoiceDate, "счет, дата") ??
		requiredDocumentField(
			paymentInvoicePayerFullNameValue(),
			"счет, плательщик",
		) ??
		requiredDocumentField(paymentInvoicePurpose, "счет, назначение платежа") ??
		(serviceLines.length
			? null
			: "Для счета нужен состав услуг из плана лечения.") ??
		(paymentInvoiceTotalRubValue() > 0 ? null : "Укажите сумму счета.") ??
		requiredDocumentField(paymentInvoiceDueDate, "счет, срок оплаты") ??
		requiredDocumentField(paymentInvoicePaymentTerms, "счет, условия оплаты") ??
		requiredDocumentField(
			paymentInvoiceBankDetailsValue(),
			"счет, реквизиты клиники",
		) ??
		(paymentInvoiceCashlessAllowed || paymentInvoiceCashDeskAllowed
			? null
			: "Выберите хотя бы один способ оплаты.") ??
		(paymentInvoiceRequisitesVerified
			? null
			: "Подтвердите проверку реквизитов клиники.") ??
		(paymentInvoiceServiceScopeConfirmed
			? null
			: "Подтвердите состав услуг счета.") ??
		(paymentInvoiceFiscalNoticeConfirmed
			? null
			: "Подтвердите предупреждение: счет не заменяет кассовый чек.")
	);
}

export function validatePaymentReceipt(
	state: DocumentState,
): ValidationResult {
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
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(paymentReceiptNumber, "квитанция, номер") ??
		requiredDocumentField(paymentReceiptDate, "квитанция, дата") ??
		(selectedPaymentReceiptPayments.length
			? null
			: "Выберите оплаченные платежи для квитанции.") ??
		(selectedPaymentReceiptTotalRub > 0
			? null
			: "Сумма выбранных платежей должна быть больше нуля.") ??
		requiredDocumentField(
			paymentReceiptPayerFullNameValue(),
			"квитанция, ФИО плательщика",
		) ??
		(paymentReceiptTaxSupportRequested
			? (requiredDocumentField(
					paymentReceiptPayerBirthDateValue(),
					"квитанция, дата рождения плательщика",
				) ??
				requiredDocumentField(
					paymentReceiptPayerRelationshipValue(),
					"квитанция, связь плательщика с пациентом",
				) ??
				(paymentReceiptPayerInnValue().replace(/\D+/g, "").length === 12 ||
				paymentReceiptPayerIdentityDocumentValue().trim()
					? null
					: "Для налоговой квитанции укажите 12-значный ИНН плательщика или документ плательщика."))
			: null) ??
		requiredDocumentField(
			paymentReceiptPurpose,
			"квитанция, назначение оплаты",
		) ??
		(paymentReceiptFiscalReceiptLines().length ===
		selectedPaymentReceiptPayments.length
			? null
			: "У каждого выбранного платежа должен быть номер фискального чека.") ??
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(selectedPaymentReceiptPayments.every((payment: any) =>
			Boolean(payment.fiscalReceiptIssuedAt?.trim()),
		)
			? null
			: "У каждого выбранного платежа должна быть дата фискального чека.") ??
		requiredDocumentField(
			paymentReceiptIssuedByValue(),
			"квитанция, кто выдал",
		) ??
		(paymentReceiptPaymentsVerified
			? null
			: "Подтвердите сверку выбранных платежей и фискальных чеков.") ??
		(paymentReceiptPayerVerified
			? null
			: "Подтвердите проверку данных плательщика.") ??
		(paymentReceiptFiscalNoticeConfirmed
			? null
			: "Подтвердите, что квитанция не заменяет кассовый чек.")
	);
}

export function validateInstallmentPaymentSchedule(
	state: DocumentState,
): ValidationResult {
	const {
		installmentScheduleNumber,
		installmentScheduleDate,
		installmentScheduleBaseDocumentTitleValue,
		installmentSchedulePayerFullNameValue,
		installmentScheduleTotalRubValue,
		installmentScheduleRemainingRubValue,
		installmentScheduleInstallmentRows,
		installmentScheduleLatePolicy,
		installmentSchedulePaymentMethodNotes,
		installmentScheduleResponsibleFullNameValue,
		installmentScheduleAccepted,
		installmentScheduleFiscalNoticeConfirmed,
		installmentScheduleWrittenChangesConfirmed,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const installments = installmentScheduleInstallmentRows();
	return (
		requiredDocumentField(installmentScheduleNumber, "график, номер") ??
		requiredDocumentField(installmentScheduleDate, "график, дата") ??
		requiredDocumentField(
			installmentScheduleBaseDocumentTitleValue(),
			"график, основание",
		) ??
		requiredDocumentField(
			installmentSchedulePayerFullNameValue(),
			"график, плательщик",
		) ??
		(installmentScheduleTotalRubValue() > 0
			? null
			: "Укажите общую сумму графика.") ??
		(installmentScheduleRemainingRubValue() >= 0
			? null
			: "Остаток по графику не может быть отрицательным.") ??
		(installments.length
			? null
			: "Добавьте платежи графика или укажите остаток к оплате.") ??
		requiredDocumentField(
			installmentScheduleLatePolicy,
			"график, правила просрочки",
		) ??
		requiredDocumentField(
			installmentSchedulePaymentMethodNotes,
			"график, способы оплаты",
		) ??
		requiredDocumentField(
			installmentScheduleResponsibleFullNameValue(),
			"график, ответственный",
		) ??
		(installmentScheduleAccepted
			? null
			: "Подтвердите принятие графика пациентом.") ??
		(installmentScheduleFiscalNoticeConfirmed
			? null
			: "Подтвердите, что график не заменяет кассовый чек.") ??
		(installmentScheduleWrittenChangesConfirmed
			? null
			: "Подтвердите письменное оформление изменений графика.")
	);
}

export function validateTaxDeductionApplication(
	state: DocumentState,
): ValidationResult {
	const {
		taxApplicationTaxpayerFullName,
		taxApplicationTaxpayerInn,
		taxApplicationTaxpayerBirthDate,
		taxApplicationTaxpayerIdentityDocument,
		taxApplicationRelationship,
		taxApplicationForm,
		taxApplicationContact,
		taxApplicationAuthorityDocument,
		taxApplicationRequestedAt,
		taxApplicationDuplicateWarningAccepted,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const normalizedInn = (taxApplicationTaxpayerInn || "").replace(/[^\d]/g, "");
	return (
		requiredDocumentField(
			taxApplicationTaxpayerFullName,
			"налоговое заявление, заявитель",
		) ??
		(taxApplicationForm === "legacy_2021_2023" &&
		normalizedInn.length !== 10 &&
		normalizedInn.length !== 12
			? "Для старой налоговой справки укажите 10- или 12-значный ИНН заявителя."
			: null) ??
		(normalizedInn && normalizedInn.length !== 10 && normalizedInn.length !== 12
			? "ИНН заявителя должен содержать 10 или 12 цифр."
			: null) ??
		(taxApplicationForm === "knd_1151156" &&
		normalizedInn &&
		normalizedInn.length !== 12
			? "Для справки на налоговый вычет ИНН физического лица должен быть 12-значным. Если ИНН нет, оставьте поле пустым и заполните документ заявителя."
			: null) ??
		(isDateInputValue(taxApplicationTaxpayerBirthDate)
			? null
			: "Укажите дату рождения заявителя в формате календарной даты.") ??
		requiredDocumentField(
			taxApplicationTaxpayerIdentityDocument,
			"налоговое заявление, документ заявителя",
		) ??
		(taxApplicationRelationship === "self" ||
		taxApplicationAuthorityDocument?.trim()
			? null
			: "Для заявления представителя укажите документ, подтверждающий полномочия.") ??
		requiredDocumentField(
			taxApplicationContact,
			"налоговое заявление, контакт или канал выдачи",
		) ??
		(isDateTimeLocalInputValue(taxApplicationRequestedAt)
			? null
			: "Укажите дату и время заявления через календарь.") ??
		(taxApplicationDuplicateWarningAccepted
			? null
			: "Подтвердите, что администратор проверит отсутствие повторной справки по тем же расходам.")
	);
}

export function validatePaymentRefundCorrectionRequest(
	state: DocumentState,
): ValidationResult {
	const {
		refundSelectedPaymentId,
		refundAmountRub,
		refundReason,
		refundRecipientFullName,
		refundRecipientIdentityDocument,
		refundOriginalFiscalReceiptNumber,
		refundAccountantDecision,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const requestedAmount = normalizeRubAmountInput(refundAmountRub);
	return (
		requiredDocumentField(
			refundSelectedPaymentId,
			"возврат/коррекция, исходный платеж",
		) ??
		(requestedAmount !== null && requestedAmount > 0
			? null
			: validateRubAmountInput(
					refundAmountRub,
					"Укажите сумму возврата или коррекции больше нуля.",
					"Укажите сумму возврата или коррекции целыми рублями без копеек.",
				)) ??
		requiredDocumentField(refundReason, "возврат/коррекция, основание") ??
		requiredDocumentField(
			refundRecipientFullName,
			"возврат/коррекция, получатель",
		) ??
		requiredDocumentField(
			refundRecipientIdentityDocument,
			"возврат/коррекция, документ получателя",
		) ??
		requiredDocumentField(
			refundOriginalFiscalReceiptNumber,
			"возврат/коррекция, исходный фискальный чек",
		) ??
		requiredDocumentField(
			refundAccountantDecision,
			"возврат/коррекция, решение ответственного",
		)
	);
}
