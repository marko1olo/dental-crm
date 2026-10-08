import { requiredDocumentField as defaultRequiredDocumentField } from "./regexRules";
import type { DocumentState, ValidationResult } from "./types";

export function validatePaidMedicalServicesContract(
	state: DocumentState,
): ValidationResult {
	const {
		paidContractNumber,
		paidContractDate,
		paidContractServiceStart,
		paidContractServiceEnd,
		paidContractCustomerFullNameValue,
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
		paidContractClinicInfoConfirmed,
		paidContractServiceListConfirmed,
		paidContractPaidBasisConfirmed,
		paidContractWrittenChangesConfirmed,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const allowBlankForPrint = Boolean(state.allowBlankForPrint);
	if (allowBlankForPrint) {
		return null;
	}
	return (
		requiredDocumentField(paidContractNumber, "договор, номер") ??
		requiredDocumentField(paidContractDate, "договор, дата") ??
		requiredDocumentField(
			paidContractServiceStart,
			"договор, начало оказания услуг",
		) ??
		requiredDocumentField(
			paidContractServiceEnd,
			"договор, окончание или условие завершения",
		) ??
		requiredDocumentField(
			paidContractCustomerFullNameValue(),
			"договор, заказчик",
		) ??
		requiredDocumentField(
			paidContractCareReasonValue(),
			"договор, основание обращения",
		) ??
		requiredDocumentField(
			paidContractServiceScopeValue(),
			"договор, состав услуг",
		) ??
		(paidContractTotalRubValue() > 0
			? null
			: "Укажите ориентировочную стоимость договора.") ??
		requiredDocumentField(
			paidContractPaymentTerms,
			"договор, порядок оплаты",
		) ??
		requiredDocumentField(
			paidContractPriceChangeRules,
			"договор, изменение цены и объема",
		) ??
		requiredDocumentField(
			paidContractFreeCareNotice,
			"договор, уведомление о бесплатной помощи",
		) ??
		requiredDocumentField(
			paidContractRecommendationWarning,
			"договор, предупреждение о рекомендациях врача",
		) ??
		requiredDocumentField(
			paidContractRefundTerms,
			"договор, отказ и возврат",
		) ??
		requiredDocumentField(
			paidContractWarrantyTerms,
			"договор, гарантия и претензии",
		) ??
		requiredDocumentField(paidContractDoctorFullNameValue(), "договор, врач") ??
		requiredDocumentField(paidContractSignedAt, "договор, дата подписания") ??
		(paidContractClinicInfoConfirmed !== false
			? null
			: "Подтвердите, что пациент получил сведения о клинике и лицензии.") ??
		(paidContractServiceListConfirmed !== false
			? null
			: "Подтвердите, что пациент получил перечень услуг и стоимость.") ??
		(paidContractPaidBasisConfirmed !== false
			? null
			: "Подтвердите, что пациент понимает платную основу услуг.") ??
		(paidContractWrittenChangesConfirmed !== false
			? null
			: "Подтвердите, что изменения договора оформляются письменно.")
	);
}

export function validateWarrantyServiceMemo(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
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
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			warrantyServiceOrWorkNameValue(),
			"гарантия, работа или услуга",
		) ??
		requiredDocumentField(warrantyCompletedAt, "гарантия, дата завершения") ??
		requiredDocumentField(
			warrantyTeethOrAreaValue(),
			"гарантия, зубы или область",
		) ??
		requiredDocumentField(
			warrantyMaterialsOrSystems,
			"гарантия, материалы или системы",
		) ??
		requiredDocumentField(warrantyPeriod, "гарантия, срок и условия") ??
		requiredDocumentField(
			warrantyControlVisitSchedule,
			"гарантия, контрольные визиты",
		) ??
		(documentTextLines(warrantyPatientObligations).length
			? null
			: "Добавьте обязанности пациента для сохранения гарантии.") ??
		(documentTextLines(warrantyExcludedRiskFactors).length
			? null
			: "Добавьте условия, требующие отдельной оценки.") ??
		(documentTextLines(warrantyUrgentContactReasons).length
			? null
			: "Добавьте признаки для срочной связи с клиникой.") ??
		requiredDocumentField(
			warrantyLinkedActOrContractValue(),
			"гарантия, связанный акт или договор",
		) ??
		requiredDocumentField(warrantyDoctorFullNameValue(), "гарантия, врач") ??
		requiredDocumentField(warrantyIssuedAt, "гарантия, дата выдачи") ??
		(warrantyPolicyApplied
			? null
			: "Подтвердите применение локального гарантийного положения.") ??
		(warrantyAftercareReceived
			? null
			: "Подтвердите выдачу рекомендаций после лечения.") ??
		(warrantyControlVisitsUnderstood
			? null
			: "Подтвердите понимание контрольных визитов пациентом.")
	);
}

export function validateInformedConsent(
	state: DocumentState,
): ValidationResult {
	const allowBlankForPrint = Boolean(state.allowBlankForPrint);
	if (allowBlankForPrint) {
		return null;
	}
	const {
		documentTextLines,
		informedConsentIntervention,
		informedConsentToothOrArea,
		inferredTreatmentArea,
		informedConsentDiagnosisOrIndication,
		dashboard,
		informedConsentExpectedBenefit,
		informedConsentRisks,
		informedConsentAlternatives,
		informedConsentAftercare,
		informedConsentDoctorFullName,
		activeDoctor,
		informedConsentConfirmedAt,
		informedConsentQuestionsAnswered,
		informedConsentRisksUnderstood,
		informedConsentWithdrawUnderstood,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const effectiveIntervention =
		informedConsentIntervention.trim() ||
		"Стоматологический осмотр, консультация и диагностика";
	const effectiveArea =
		informedConsentToothOrArea.trim() || inferredTreatmentArea || "Полость рта (все сегменты)";
	const effectiveIndication =
		informedConsentDiagnosisOrIndication.trim() ||
		dashboard?.activeVisit?.complaint ||
		"Первичный/плановый осмотр, определение стоматологического статуса";
	const effectiveExpectedBenefit =
		informedConsentExpectedBenefit.trim() ||
		"Своевременная диагностика, профилактика осложнений и восстановление функции зубочелюстной системы";
	const effectiveDoctor =
		informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "Врач-стоматолог клиники";
	const effectiveConfirmedAt =
		informedConsentConfirmedAt.trim() || new Date().toISOString().slice(0, 16);

	const risksCount = documentTextLines(informedConsentRisks).length || (informedConsentRisks.trim() ? 1 : 0);
	const alternativesCount = documentTextLines(informedConsentAlternatives).length || (informedConsentAlternatives.trim() ? 1 : 0);
	const aftercareCount = documentTextLines(informedConsentAftercare).length || (informedConsentAftercare.trim() ? 1 : 0);

	return (
		requiredDocumentField(
			effectiveIntervention,
			"информированное согласие, вмешательство",
		) ??
		requiredDocumentField(
			effectiveArea,
			"информированное согласие, область или зубы",
		) ??
		requiredDocumentField(
			effectiveIndication,
			"информированное согласие, диагноз или показание",
		) ??
		requiredDocumentField(
			effectiveExpectedBenefit,
			"информированное согласие, ожидаемая польза",
		) ??
		(risksCount
			? null
			: "Добавьте разъясненные риски для информированного согласия.") ??
		(alternativesCount
			? null
			: "Добавьте альтернативы лечения для информированного согласия.") ??
		(aftercareCount
			? null
			: "Добавьте рекомендации после вмешательства для информированного согласия.") ??
		requiredDocumentField(effectiveDoctor, "информированное согласие, врач") ??
		requiredDocumentField(
			effectiveConfirmedAt,
			"информированное согласие, дата подтверждения",
		) ??
		(informedConsentQuestionsAnswered !== false
			? null
			: "Подтвердите, что пациент получил ответы на вопросы перед согласием.") ??
		(informedConsentRisksUnderstood !== false
			? null
			: "Подтвердите, что пациент понял риски, ограничения и прогноз.") ??
		(informedConsentWithdrawUnderstood !== false
			? null
			: "Подтвердите, что пациенту объяснено право отказаться до вмешательства.")
	);
}

export function validateProcedureSpecificConsentPacket(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		inferredTreatmentArea,
		dashboard,
		activeDoctor,
		procedureConsentProcedureName,
		procedureConsentToothOrArea,
		procedureConsentDiagnosisOrIndication,
		clinicalToothRowsValue,
		procedureConsentPatientRiskFactors,
		procedureConsentSpecificRisks,
		procedureConsentAlternatives,
		procedureConsentAftercare,
		procedureConsentDoctorFullName,
		procedureConsentConfirmedAt,
		procedureConsentQuestionsAnswered,
		procedureConsentExactProcedureConfirmed,
		procedureConsentRisksUnderstood,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const effectiveArea =
		procedureConsentToothOrArea.trim() || inferredTreatmentArea || "";
	const effectiveIndication =
		procedureConsentDiagnosisOrIndication.trim() ||
		dashboard?.activeVisit?.complaint ||
		"";
	const effectiveDoctor =
		procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
	return (
		requiredDocumentField(
			procedureConsentProcedureName,
			"процедурное согласие, процедура",
		) ??
		requiredDocumentField(
			effectiveArea,
			"процедурное согласие, область или зубы",
		) ??
		requiredDocumentField(
			effectiveIndication,
			"процедурное согласие, показание",
		) ??
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		(documentTextLines(procedureConsentPatientRiskFactors).length
			? null
			: "Добавьте персональные факторы риска пациента для процедурного согласия.") ??
		(documentTextLines(procedureConsentSpecificRisks).length
			? null
			: "Добавьте процедурные риски для процедурного согласия.") ??
		(documentTextLines(procedureConsentAlternatives).length
			? null
			: "Добавьте альтернативы лечения для процедурного согласия.") ??
		(documentTextLines(procedureConsentAftercare).length
			? null
			: "Добавьте ограничения и рекомендации после процедуры.") ??
		requiredDocumentField(effectiveDoctor, "процедурное согласие, врач") ??
		requiredDocumentField(
			procedureConsentConfirmedAt,
			"процедурное согласие, дата подтверждения",
		) ??
		(procedureConsentQuestionsAnswered
			? null
			: "Подтвердите, что пациент получил ответы на вопросы по процедуре.") ??
		(procedureConsentExactProcedureConfirmed
			? null
			: "Подтвердите, что пациенту названа конкретная процедура, зона и объем.") ??
		(procedureConsentRisksUnderstood
			? null
			: "Подтвердите, что пациент понял процедурные риски и ограничения.")
	);
}

export function validateAnesthesiaConsentLog(
	state: DocumentState,
): ValidationResult {
	const {
		anesthesiaMethod,
		anesthesiaAnesthetic,
		anesthesiaZone,
		anesthesiaAllergyStatus,
		anesthesiaDoseTime,
		anesthesiaDoseMl,
		anesthesiaRisksExplained,
		anesthesiaAllergyRestrictionsChecked,
		anesthesiaConsentConfirmed,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(anesthesiaMethod, "анестезия, метод") ??
		requiredDocumentField(anesthesiaAnesthetic, "анестезия, препарат") ??
		requiredDocumentField(anesthesiaZone, "анестезия, зона") ??
		requiredDocumentField(
			anesthesiaAllergyStatus,
			"анестезия, аллергоанамнез",
		) ??
		requiredDocumentField(anesthesiaDoseTime, "анестезия, время введения") ??
		requiredDocumentField(anesthesiaDoseMl, "анестезия, доза") ??
		(anesthesiaRisksExplained
			? null
			: "Подтвердите, что пациенту объяснены риски и ограничения анестезии.") ??
		(anesthesiaAllergyRestrictionsChecked
			? null
			: "Подтвердите, что аллергии, лекарства и ограничения проверены до введения.") ??
		(anesthesiaConsentConfirmed
			? null
			: "Подтвердите согласие пациента на выбранную местную анестезию.")
	);
}

export function validatePhotoVideoConsent(
	state: DocumentState,
): ValidationResult {
	const {
		photoVideoClinicalRecordUseConfirmed,
		photoVideoEducationUseAllowed,
		photoVideoMarketingUseAllowed,
		photoVideoRecognizablePublicationAllowed,
		photoVideoMaterials,
		photoVideoAnonymizationConfirmed,
		photoVideoRevocationChannel,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		(photoVideoMaterials.length
			? null
			: "Отметьте хотя бы один тип фото, видео или снимков.") ??
		(photoVideoClinicalRecordUseConfirmed
			? null
			: "Подтвердите, что фото, видео и снимки вносятся в медицинскую карту пациента.") ??
		(photoVideoAnonymizationConfirmed
			? null
			: "Подтвердите, что внешнее использование возможно только после обезличивания, кроме отдельно разрешенной узнаваемой публикации.") ??
		requiredDocumentField(
			photoVideoRevocationChannel,
			"фото/видео, порядок отзыва согласия",
		) ??
		(photoVideoRecognizablePublicationAllowed &&
		!photoVideoMarketingUseAllowed &&
		!photoVideoEducationUseAllowed
			? "Публикация узнаваемых материалов возможна только вместе с отдельным разрешением на обучение или маркетинг."
			: null)
	);
}

export function validateMedicalInterventionRefusal(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		activeDoctor,
		refusalIntervention,
		refusalClinicalIndication,
		refusalExplainedRisks,
		refusalAlternatives,
		refusalUrgentWarningSigns,
		refusalDoctorFullName,
		refusalConfirmedAt,
		refusalConsequencesUnderstood,
		refusalSecondOpinionOffered,
		refusalEmergencyCareExplained,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(refusalIntervention, "отказ, вмешательство") ??
		requiredDocumentField(
			refusalClinicalIndication,
			"отказ, клиническое показание",
		) ??
		(documentTextLines(refusalExplainedRisks).length
			? null
			: "Добавьте разъясненные риски отказа.") ??
		(documentTextLines(refusalAlternatives).length
			? null
			: "Добавьте предложенные альтернативы.") ??
		(documentTextLines(refusalUrgentWarningSigns).length
			? null
			: "Добавьте тревожные признаки для срочного обращения.") ??
		requiredDocumentField(
			refusalDoctorFullName.trim() || activeDoctor?.fullName || "",
			"отказ, врач",
		) ??
		requiredDocumentField(refusalConfirmedAt, "отказ, дата подтверждения") ??
		(refusalConsequencesUnderstood
			? null
			: "Подтвердите, что пациент понял последствия отказа.") ??
		(refusalSecondOpinionOffered
			? null
			: "Подтвердите, что пациенту предложено второе мнение или альтернатива.") ??
		(refusalEmergencyCareExplained
			? null
			: "Подтвердите, что пациенту объяснено, когда нужна экстренная помощь.")
	);
}
