import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { GeneratedDocument } from "@dental/shared";
import {
	buildClinicalPayload,
	buildConsentPayload,
	buildFinancialPayload,
	documentPayloadForKind,
	type DocumentState,
} from "../documentLogic";

describe("documentPayloadForKind: Comprehensive Payload Generators", () => {
	const baseState: DocumentState = {
		// Financial & Contract fields
		paidContractNumber: "ДОГ-100",
		paidContractDate: "2026-07-28",
		paidContractServiceStart: "2026-07-28",
		paidContractServiceEnd: "2026-08-28",
		paidContractCustomerFullNameValue: () => "Иванов Иван Иванович",
		paidContractRepresentativeFullName: "",
		paidContractCareReasonValue: () => "Лечение кариеса",
		paidContractServiceScopeValue: () => "Терапевтическое лечение зуба 16",
		paidContractTotalRubValue: () => 7500,
		paidContractPaymentTerms: "100% постоплата",
		paidContractPriceChangeRules: "По согласованию сторон",
		paidContractFreeCareNotice: "Ознакомлен с программой госгарантий",
		paidContractRecommendationWarning: "Соблюдать гигиену",
		paidContractRefundTerms: "По закону РФ",
		paidContractWarrantyTerms: "Гарантия 1 год",
		paidContractDoctorFullNameValue: () => "Смирнов А.В.",
		paidContractSignedAt: "2026-07-28 12:00",
		paidContractClinicInfoConfirmed: true,
		paidContractServiceListConfirmed: true,
		paidContractPaidBasisConfirmed: true,
		paidContractWrittenChangesConfirmed: true,

		completedActNumber: "АКТ-100",
		completedActDate: "2026-07-28",
		completedActContractNumber: "ДОГ-100",
		selectedCompletedActContractDocumentId: "doc-uuid-1",
		completedActServicePeriodStart: "2026-07-28",
		completedActServicePeriodEnd: "2026-07-28",
		completedActDoctorFullNameValue: () => "Смирнов А.В.",
		completedActServicesSummaryValue: () => "Пломбирование зуба 16",
		completedActTotalRubValue: () => 7500,
		completedActPaidRubValue: () => 7500,
		completedActFiscalReceiptLines: () => ["ЧЕК-001"],
		completedActPatientClaims: "",
		completedActLinkedContract: true,
		completedActFinalScopeConfirmed: true,
		completedActFiscalReceiptsVerified: true,
		completedActAccepted: true,

		treatmentEstimateNumber: "СМ-100",
		treatmentEstimateDate: "2026-07-28",
		treatmentEstimatePatientOrPayerFullNameValue: () => "Иванов И.И.",
		treatmentEstimateTreatmentBasisValue: () => "План лечения №1",
		plannedServiceLinesForFinancialPayload: () => [
			{ name: "Анестезия", priceRub: 500 },
		],
		treatmentEstimateTotalRubValue: () => 500,
		treatmentEstimateValidUntil: "2026-08-28",
		treatmentEstimatePriceChangeRules: "Без изменений",
		documentTextLines: (val: any) =>
			Array.isArray(val) ? val : typeof val === "string" ? [val] : [],
		treatmentEstimateExcludedItems: [],
		treatmentEstimatePaymentMilestoneNotes: "Поэтапно",
		treatmentEstimateDoctorFullNameValue: () => "Смирнов А.В.",
		treatmentEstimateAdminFullName: "Петрова А.А.",
		treatmentEstimateSignedAt: "2026-07-28",
		treatmentEstimatePreliminaryConfirmed: true,
		treatmentEstimateScopeConfirmed: true,
		treatmentEstimateFiscalNoticeConfirmed: true,
		treatmentEstimateChangeRulesConfirmed: true,

		paymentInvoiceNumber: "СЧ-100",
		paymentInvoiceDate: "2026-07-28",
		paymentInvoicePayerFullNameValue: () => "Иванов И.И.",
		paymentInvoicePayerPhone: "+79991234567",
		paymentInvoicePayerEmail: "ivanov@test.ru",
		paymentInvoicePurpose: "Оплата стоматологических услуг",
		paymentInvoiceTotalRubValue: () => 500,
		paymentInvoiceDueDate: "2026-08-01",
		paymentInvoicePaymentTerms: "Безналичный расчет",
		paymentInvoiceBankDetailsValue: () => "Р/с 40702810...",
		paymentInvoiceCashlessAllowed: true,
		paymentInvoiceCashDeskAllowed: true,
		paymentInvoiceQrPayload: "ST00012|...",
		paymentInvoiceRequisitesVerified: true,
		paymentInvoiceServiceScopeConfirmed: true,
		paymentInvoiceFiscalNoticeConfirmed: true,

		paymentReceiptNumber: "КВ-100",
		paymentReceiptDate: "2026-07-28",
		selectedPaymentReceiptPayments: [{ id: "pay-1" }],
		selectedPaymentReceiptTotalRub: 500,
		paymentReceiptPayerFullNameValue: () => "Иванов И.И.",
		paymentReceiptTaxSupportRequested: false,
		paymentReceiptPurpose: "Оплата услуг",
		paymentReceiptFiscalReceiptLines: () => ["ЧЕК-001"],
		paymentReceiptIssuedByValue: () => "Кассир",
		paymentReceiptPaymentsVerified: true,
		paymentReceiptPayerVerified: true,
		paymentReceiptFiscalNoticeConfirmed: true,

		installmentScheduleNumber: "ГР-100",
		installmentScheduleDate: "2026-07-28",
		installmentScheduleBaseDocumentTitleValue: () => "Договор №100",
		installmentSchedulePayerFullNameValue: () => "Иванов И.И.",
		installmentScheduleTotalRubValue: () => 10000,
		installmentSchedulePrepaidRubValue: () => 5000,
		installmentScheduleRemainingRubValue: () => 5000,
		installmentScheduleInstallmentRows: () => [],
		installmentScheduleLatePolicy: "Пеня 0.1%",
		installmentSchedulePaymentMethodNotes: "В кассу",
		installmentScheduleResponsibleFullNameValue: () => "Администратор",
		installmentScheduleAccepted: true,
		installmentScheduleFiscalNoticeConfirmed: true,
		installmentScheduleWrittenChangesConfirmed: true,

		warrantyServiceOrWorkNameValue: () => "Пломба световая",
		warrantyCompletedAt: "2026-07-28",
		warrantyTeethOrAreaValue: () => "Зуб 16",
		warrantyMaterialsOrSystems: "Filtek Ultimate",
		warrantyPeriod: "12 месяцев",
		warrantyControlVisitSchedule: "Каждые 6 мес.",
		warrantyPatientObligations: ["Гигиена"],
		warrantyExcludedRiskFactors: ["Травмы"],
		warrantyUrgentContactReasons: ["Скол"],
		warrantyLinkedActOrContractValue: () => "АКТ-100",
		warrantyDoctorFullNameValue: () => "Смирнов А.В.",
		warrantyIssuedAt: "2026-07-28",
		warrantyPolicyApplied: true,
		warrantyAftercareReceived: true,
		warrantyControlVisitsUnderstood: true,

		taxApplicationTaxpayerFullName: "Иванов И.И.",
		taxApplicationTaxpayerInn: "123456789012",
		taxApplicationTaxpayerBirthDate: "1990-01-01",
		taxApplicationTaxpayerIdentityDocument: "Паспорт 1234 567890",
		taxApplicationRelationship: "self",
		taxDocumentYear: 2026,
		taxApplicationForm: "spravka",
		selectedTaxPaymentIdsForCurrentDocument: () => ["pay-1"],
		taxApplicationDeliveryChannel: "email",
		taxApplicationContact: "ivanov@test.ru",
		taxApplicationAuthorityDocument: "",
		taxApplicationRequestedAt: "2026-07-28T10:00",
		taxApplicationDuplicateWarningAccepted: true,

		refundAction: "refund",
		refundSelectedPaymentId: "pay-1",
		refundAmountRub: "500",
		refundReason: "Отказ от части услуг",
		refundMethod: "card",
		refundRecipientFullName: "Иванов И.И.",
		refundRecipientIdentityDocument: "Паспорт",
		refundBankDetails: "",
		refundOriginalFiscalReceiptNumber: "ЧЕК-001",
		refundCorrectionFiscalReceiptNumber: "",
		refundAccountantDecision: "Согласовано",

		// Consents
		informedConsentIntervention: "Лечение кариеса",
		informedConsentToothOrArea: "Зуб 16",
		inferredTreatmentArea: "16",
		informedConsentDiagnosisOrIndication: "К02.1 Кариес дентина",
		informedConsentExpectedBenefit: "Восстановление анатомической формы",
		informedConsentAnesthesia: "Ультракаин Д-С",
		informedConsentMaterialNotes: "Filtek",
		informedConsentTrustedContact: "",
		informedConsentRisks: ["Повышенная чувствительность"],
		informedConsentAlternatives: ["Без лечения"],
		informedConsentAftercare: ["Не есть 2 часа"],
		informedConsentDoctorFullName: "Смирнов А.В.",
		informedConsentConfirmedAt: "2026-07-28 10:00",
		informedConsentQuestionsAnswered: true,
		informedConsentRisksUnderstood: true,
		informedConsentWithdrawUnderstood: true,

		procedureConsentProcedureType: "therapeutic",
		procedureConsentProcedureName: "Пломбирование",
		procedureConsentToothOrArea: "Зуб 16",
		procedureConsentDiagnosisOrIndication: "К02.1",
		clinicalToothRowsValue: () => [{ tooth: 16, status: "carious" }],
		procedureConsentAnesthesia: "Ультракаин",
		procedureConsentMaterials: "Композит",
		procedureConsentPatientRiskFactors: [],
		procedureConsentSpecificRisks: [],
		procedureConsentAlternatives: [],
		procedureConsentAftercare: [],
		procedureConsentDoctorFullName: "Смирнов А.В.",
		procedureConsentConfirmedAt: "2026-07-28 10:00",
		procedureConsentLocalFormAttached: false,
		procedureConsentQuestionsAnswered: true,
		procedureConsentExactProcedureConfirmed: true,
		procedureConsentRisksUnderstood: true,

		anesthesiaMethod: "Инфильтрационная",
		anesthesiaAnesthetic: "Артикаин",
		anesthesiaVasoconstrictor: "Эпинефрин 1:200000",
		anesthesiaZone: "16",
		anesthesiaAllergyStatus: "Отрицательный",
		anesthesiaRestrictionNotes: "",
		anesthesiaDoseTime: "10:05",
		anesthesiaDoseMl: "1.7",
		anesthesiaReaction: "Норма",
		anesthesiaRisksExplained: true,
		anesthesiaAllergyRestrictionsChecked: true,
		anesthesiaConsentConfirmed: true,

		photoVideoClinicalRecordUseConfirmed: true,
		photoVideoLabTransferAllowed: true,
		photoVideoColleagueConsultationAllowed: false,
		photoVideoEducationUseAllowed: false,
		photoVideoMarketingUseAllowed: false,
		photoVideoRecognizablePublicationAllowed: false,
		photoVideoMaterials: ["intraoral"],
		photoVideoAnonymizationConfirmed: true,
		photoVideoRevocationChannel: "Заявление",
		photoVideoScopeNotes: "",

		personalDataPurposes: ["Медицинская деятельность"],
		personalDataCategories: ["ФИО", "Паспорт"],
		personalDataActions: ["Сбор", "Хранение"],
		personalDataTransferRules: "Без передачи третьим лицам",
		personalDataCrossBorderAllowed: false,
		personalDataAutomatedDecisionAllowed: false,
		personalDataRetentionPeriod: "5 лет",
		personalDataRevocationChannel: "Лично",
		personalDataConsentGivenAt: "2026-07-28",
		personalDataVoluntaryConsentConfirmed: true,
		personalDataMedicalProcessingAcknowledged: true,

		refusalIntervention: "Рентгенография",
		refusalClinicalIndication: "Подозрение на скрытый кариес",
		refusalPatientReason: "Личное нежелание",
		refusalExplainedRisks: ["Невозможность точной диагностики"],
		refusalAlternatives: ["Визуальный осмотр"],
		refusalUrgentWarningSigns: ["Острая боль"],
		refusalDoctorFullName: "Смирнов А.В.",
		refusalConfirmedAt: "2026-07-28",
		refusalConsequencesUnderstood: true,
		refusalSecondOpinionOffered: true,
		refusalEmergencyCareExplained: true,

		intakeChiefComplaint: "Боль при приеме сладкого",
		intakeAllergyStatus: "Нет",
		intakeCurrentMedications: "Нет",
		intakeChronicConditions: "Нет",
		intakePregnancyStatus: "none",
		intakeAnticoagulants: "Нет",
		intakeInfectiousRiskNotes: "Нет",
		intakeCardioEndocrineNotes: "Нет",
		intakeEmergencyContact: "+79998887766",
		intakeAdditionalNotes: "",
		intakeAccuracyConfirmed: true,

		minorRepresentativeFullNameValue: () => "Иванова Анна Ивановна",
		minorRepresentativeRelationshipValue: () => "Мать",
		minorRepresentativeIdentityDocumentValue: () => "Паспорт",
		minorRepresentativeAuthorityDocument: "Свидетельство о рождении",
		minorRepresentativePhoneValue: () => "+79991112233",
		minorConsentPatientFullNameValue: () => "Иванов Петр Иванович",
		minorConsentPatientBirthDateValue: () => "2018-05-15",
		minorConsentInterventionScopeValue: () => "Осмотр",
		minorConsentDiagnosisOrIndicationValue: () => "Профилактический осмотр",
		minorConsentRisks: [],
		minorConsentAlternatives: [],
		minorConsentDoctorFullNameValue: () => "Смирнов А.В.",
		minorConsentSignedAt: "2026-07-28",
		minorConsentIdentityVerified: true,
		minorConsentAuthorityVerified: true,
		minorConsentExplained: true,
		minorConsentStored: true,
		minorConsentAgeExplanation: true,

		// Clinical
		treatmentPlanClinicalReasonValue: () => "Санация полости рта",
		treatmentPlanDiagnosisSummaryValue: () => "Кариес 16, 26",
		treatmentPlanTeethOrAreaValue: () => "16, 26",
		treatmentPlanGoals: ["Купирование воспаления"],
		treatmentPlanStageRows: () => [{ stage: 1, title: "Лечение 16" }],
		treatmentPlanTotalRubValue: () => 15000,
		treatmentPlanAlternatives: [],
		treatmentPlanRisks: [],
		treatmentPlanPrognosis: "Благоприятный",
		treatmentPlanControlPlan: "Осмотр через 6 мес",
		treatmentPlanDoctorFullNameValue: () => "Смирнов А.В.",
		treatmentPlanPlannedAt: "2026-07-28",
		treatmentPlanQuestionsAnswered: true,
		treatmentPlanSeparateConsentAcknowledged: true,
		treatmentPlanNewApprovalAcknowledged: true,

		treatmentAcceptanceVariant: "optimal",
		treatmentAcceptanceClinicalGoal: "Санация",
		treatmentAcceptanceDiagnosisSummary: "Кариес",
		treatmentAcceptanceTeethOrArea: "16",
		treatmentAcceptanceStageRows: () => [],
		treatmentAcceptanceTotalRubValue: () => 15000,
		treatmentAcceptanceEstimateValidUntil: "2026-08-28",
		treatmentAcceptancePaymentTerms: "Поэтапно",
		treatmentAcceptanceRejectedAlternatives: [],
		treatmentAcceptanceRisks: [],
		treatmentAcceptanceWarrantyTerms: "12 мес",
		treatmentAcceptanceDoctorFullName: "Смирнов А.В.",
		treatmentAcceptanceAcceptedAt: "2026-07-28",
		treatmentAcceptanceQuestionsAnswered: true,
		treatmentAcceptanceAlternativesUnderstood: true,
		treatmentAcceptanceCostChangeUnderstood: true,
		treatmentAcceptanceRevisionAcknowledged: true,

		postVisitCareTopic: "therapy",
		postVisitProcedureNameValue: () => "Лечение глубокого кариеса",
		postVisitToothOrAreaValue: () => "16",
		postVisitPerformedAt: "2026-07-28",
		postVisitDoctorFullNameValue: () => "Смирнов А.В.",
		postVisitAllowedAfter: ["Прием мягкой пищи"],
		postVisitRestrictions: ["Твердая пища 24ч"],
		postVisitMedicationAndRinsePlan: ["Полоскание ромашкой"],
		postVisitHygieneInstructions: ["Мягкая щетка"],
		postVisitNutritionInstructions: ["Не жевать на правой стороне"],
		postVisitUrgentWarningSigns: ["Ноющая ночная боль"],
		postVisitFollowUpAt: "",
		postVisitClinicContactInstruction: "Звонить по тел. +7...",
		postVisitTelegramSummary: "Рекомендации после лечения кариеса 16",
		postVisitPrintedCopyReceived: true,
		postVisitUrgentSignsUnderstood: true,
		postVisitTelegramSafe: true,

		prescriptionMedication: "Ибупрофен",
		prescriptionDosage: "400 мг",
		prescriptionInstructions: "1 таб при болях после еды",
		prescriptionDuration: "3 дня",
		prescriptionSafetyNotes: ["Не превышать суточную дозу"],
		prescriptionUrgentContactReason: "Аллергическая реакция",

		labWorkType: "Коронка циркониевая",
		labTeethOrArea: "16",
		labMaterial: "Диоксид циркония",
		labShade: "A2",
		labSource: "Скан 3D",
		labDeadline: "2026-08-05",
		labTechnicianNotes: "С анатомической окклюзией",

		xrayStudyType: "cbct",
		xrayArea: "Верхняя челюсть",
		xrayClinicalQuestion: "Оценка периапикальных тканей 16",
		xrayIndication: "Подготовка к лечению",
		xrayPregnancyStatus: "none",
		xraySafetyNotes: "Защитный фартук",
		xrayPriority: "routine",
		xrayIncludeDicomExport: true,
		xrayIncludeRadiologistReport: false,
		xrayRequestedBy: "Смирнов А.В.",
		xrayRecipientClinic: "",
		xrayDueDate: "",

		dentalMedicalCard043uPayloadValue: () => ({
			cardNumber: "043-100",
			patientFullName: "Иванов И.И.",
		}),

		recordExtractSourceVisitIds: ["visit-1"],
		recordExtractPeriodStart: "2026-01-01",
		recordExtractPeriodEnd: "2026-07-28",
		recordExtractComplaintAndAnamnesisValue: () => "Жалоб нет",
		recordExtractObjectiveStatusValue: () => "Полость рта санирована",
		recordExtractDiagnosisValue: () => "К02.1",
		recordExtractTreatmentProvidedValue: () => "Пломбирование 16",
		recordExtractRecommendations: "Наблюдение",
		recordExtractDoctorFullName: "Смирнов А.В.",
		recordExtractRecipientFullName: "Иванов И.И.",
		recordExtractRecipientAuthority: "Лично",
		recordExtractIssuedAt: "2026-07-28",
		recordExtractPreparedFromSignedRecords: true,
		recordExtractThirdPartyDataChecked: true,

		copyRequestDocumentTypes: ["Медицинская карта 043/у"],
		copyRequestPeriodStart: "2026-01-01",
		copyRequestPeriodEnd: "2026-07-28",
		copyRequestFormat: "paper",
		copyRequestRecipientFullName: "Иванов И.И.",
		copyRequestRecipientIdentityDocument: "Паспорт",
		copyRequestRecipientAuthority: "Лично",
		copyRequestRepresentativeAuthorityDocument: "",
		copyRequestRequestedAt: "2026-07-28",
		copyRequestContactForDelivery: "+7999...",
		copyRequestSpecialInstructions: "",
		copyRequestIncludeDicomSourceData: false,
		copyRequestIdentityVerified: true,
		copyRequestThirdPartyDataChecked: true,

		attendanceStartedAtValue: () => "2026-07-28 10:00",
		attendanceEndedAtValue: () => "2026-07-28 11:00",
		attendancePurpose: "Стоматологический приём",
		attendanceRecipientOrganization: "По месту требования",
		attendanceIssuedAt: "2026-07-28",
		attendanceSignedByValue: () => "Смирнов А.В.",
		attendanceSignedByRole: "Врач-стоматолог",
		attendanceDiagnosisDisclosureExcluded: true,
		attendanceNotSickLeaveAcknowledged: true,

		selectedReleaseSourceRequestDocumentId: "req-1",
		releaseRecipientFullName: "Иванов И.И.",
		releaseRecipientIdentityDocument: "Паспорт",
		releaseRecipientAuthority: "Лично",
		releaseChannel: "in_person",
		releaseDocumentTypes: ["Выписка"],
		releasePeriodStart: "",
		releasePeriodEnd: "",
		releaseDeliveredAt: "2026-07-28",
		releaseAccessExpiresAt: "",
		releaseProtectionNote: "Выдано лично в руки",
		releaseThirdPartyDataChecked: true,
	};

	it("generates paid_medical_services_contract payload", () => {
		const payload = documentPayloadForKind(
			"paid_medical_services_contract",
			baseState,
		);
		assert.ok(payload?.paidMedicalServicesContract);
		assert.equal(
			payload.paidMedicalServicesContract.contractNumber,
			"ДОГ-100",
		);
		assert.equal(
			payload.paidMedicalServicesContract.customerFullName,
			"Иванов Иван Иванович",
		);
	});

	it("generates completed_works_act payload", () => {
		const payload = documentPayloadForKind("completed_works_act", baseState);
		assert.ok(payload?.completedWorksAct);
		assert.equal(payload.completedWorksAct.actNumber, "АКТ-100");
		assert.equal(payload.completedWorksAct.totalByActRub, 7500);
	});

	it("generates treatment_cost_estimate payload", () => {
		const payload = documentPayloadForKind(
			"treatment_cost_estimate",
			baseState,
		);
		assert.ok(payload?.treatmentCostEstimate);
		assert.equal(payload.treatmentCostEstimate.estimateNumber, "СМ-100");
		assert.equal(payload.treatmentCostEstimate.totalAmountRub, 500);
	});

	it("generates payment_invoice payload", () => {
		const payload = documentPayloadForKind("payment_invoice", baseState);
		assert.ok(payload?.paymentInvoice);
		assert.equal(payload.paymentInvoice.invoiceNumber, "СЧ-100");
	});

	it("generates payment_receipt payload", () => {
		const payload = documentPayloadForKind("payment_receipt", baseState);
		assert.ok(payload?.paymentReceipt);
		assert.equal(payload.paymentReceipt.receiptNumber, "КВ-100");
	});

	it("generates installment_payment_schedule payload", () => {
		const payload = documentPayloadForKind(
			"installment_payment_schedule",
			baseState,
		);
		assert.ok(payload?.installmentPaymentSchedule);
		assert.equal(payload.installmentPaymentSchedule.scheduleNumber, "ГР-100");
	});

	it("generates warranty_service_memo payload", () => {
		const payload = documentPayloadForKind("warranty_service_memo", baseState);
		assert.ok(payload?.warrantyServiceMemo);
		assert.equal(
			payload.warrantyServiceMemo.serviceOrWorkName,
			"Пломба световая",
		);
	});

	it("generates tax_deduction_application payload", () => {
		const payload = documentPayloadForKind(
			"tax_deduction_application",
			baseState,
		);
		assert.ok(payload?.taxDeductionApplication);
		assert.equal(
			payload.taxDeductionApplication.taxpayerFullName,
			"Иванов И.И.",
		);
		assert.equal(payload.taxDeductionApplication.requestedTaxYear, 2026);
	});

	it("generates payment_refund_correction_request payload", () => {
		const payload = documentPayloadForKind(
			"payment_refund_correction_request",
			baseState,
		);
		assert.ok(payload?.paymentRefundCorrection);
		assert.equal(payload.paymentRefundCorrection.amountRub, 500);
	});

	it("generates informed_consent payload", () => {
		const payload = documentPayloadForKind("informed_consent", baseState);
		assert.ok(payload?.informedConsent);
		assert.equal(
			payload.informedConsent.intervention,
			"Лечение кариеса",
		);
	});

	it("generates procedure_specific_consent_packet payload", () => {
		const payload = documentPayloadForKind(
			"procedure_specific_consent_packet",
			baseState,
		);
		assert.ok(payload?.procedureSpecificConsent);
		assert.equal(
			payload.procedureSpecificConsent.procedureName,
			"Пломбирование",
		);
	});

	it("generates treatment_plan payload", () => {
		const payload = documentPayloadForKind("treatment_plan", baseState);
		assert.ok(payload?.treatmentPlan);
		assert.equal(
			payload.treatmentPlan.clinicalReason,
			"Санация полости рта",
		);
	});

	it("generates treatment_plan_acceptance payload", () => {
		const payload = documentPayloadForKind(
			"treatment_plan_acceptance",
			baseState,
		);
		assert.ok(payload?.treatmentPlanAcceptance);
		assert.equal(
			payload.treatmentPlanAcceptance.selectedVariant,
			"optimal",
		);
	});

	it("generates post_visit_recommendations payload", () => {
		const payload = documentPayloadForKind(
			"post_visit_recommendations",
			baseState,
		);
		assert.ok(payload?.postVisitRecommendations);
		assert.equal(payload.postVisitRecommendations.careTopic, "therapy");
	});

	it("generates prescription_medication_order payload", () => {
		const payload = documentPayloadForKind(
			"prescription_medication_order",
			baseState,
		);
		assert.ok(payload?.prescriptionMedicationOrder);
		assert.equal(
			payload.prescriptionMedicationOrder.medications[0].medication,
			"Ибупрофен",
		);
	});

	it("generates lab_work_order payload", () => {
		const payload = documentPayloadForKind("lab_work_order", baseState);
		assert.ok(payload?.labWorkOrder);
		assert.equal(payload.labWorkOrder.workType, "Коронка циркониевая");
	});

	it("generates xray_cbct_referral payload", () => {
		const payload = documentPayloadForKind("xray_cbct_referral", baseState);
		assert.ok(payload?.xrayCbctReferral);
		assert.equal(payload.xrayCbctReferral.studyType, "cbct");
	});

	it("generates dental_medical_card_043u payload", () => {
		const payload = documentPayloadForKind("dental_medical_card_043u", baseState);
		assert.ok(payload?.dentalMedicalCard043u);
	});

	it("generates medical_record_extract payload", () => {
		const payload = documentPayloadForKind("medical_record_extract", baseState);
		assert.ok(payload?.medicalRecordExtract);
		assert.equal(
			payload.medicalRecordExtract.complaintAndAnamnesis,
			"Жалоб нет",
		);
	});

	it("generates medical_record_copy_request payload", () => {
		const payload = documentPayloadForKind(
			"medical_record_copy_request",
			baseState,
		);
		assert.ok(payload?.medicalRecordCopyRequest);
		assert.equal(payload.medicalRecordCopyRequest.requestedFormat, "paper");
	});

	it("generates visit_attendance_certificate payload", () => {
		const payload = documentPayloadForKind(
			"visit_attendance_certificate",
			baseState,
		);
		assert.ok(payload?.visitAttendanceCertificate);
		assert.equal(
			payload.visitAttendanceCertificate.purpose,
			"Стоматологический приём",
		);
	});

	it("generates medical_document_release_receipt payload", () => {
		const payload = documentPayloadForKind(
			"medical_document_release_receipt",
			baseState,
		);
		assert.ok(payload?.medicalDocumentReleaseReceipt);
		assert.equal(
			payload.medicalDocumentReleaseReceipt.releaseChannel,
			"in_person",
		);
	});

	it("generates anesthesia_consent_log payload", () => {
		const payload = documentPayloadForKind("anesthesia_consent_log", baseState);
		assert.ok(payload?.anesthesiaConsentLog);
		assert.equal(payload.anesthesiaConsentLog.method, "Инфильтрационная");
	});

	it("generates photo_video_consent payload", () => {
		const payload = documentPayloadForKind("photo_video_consent", baseState);
		assert.ok(payload?.photoVideoConsent);
		assert.equal(payload.photoVideoConsent.labTransferAllowed, true);
	});

	it("generates personal_data_processing_consent payload", () => {
		const payload = documentPayloadForKind(
			"personal_data_processing_consent",
			baseState,
		);
		assert.ok(payload?.personalDataProcessingConsent);
	});

	it("generates medical_intervention_refusal payload", () => {
		const payload = documentPayloadForKind(
			"medical_intervention_refusal",
			baseState,
		);
		assert.ok(payload?.medicalInterventionRefusal);
		assert.equal(
			payload.medicalInterventionRefusal.refusedIntervention,
			"Рентгенография",
		);
	});

	it("generates minor_legal_representative_consent payload", () => {
		const payload = documentPayloadForKind(
			"minor_legal_representative_consent",
			baseState,
		);
		assert.ok(payload?.minorLegalRepresentativeConsent);
		assert.equal(
			payload.minorLegalRepresentativeConsent.representativeFullName,
			"Иванова Анна Ивановна",
		);
	});

	it("generates patient_intake_questionnaire payload", () => {
		const payload = documentPayloadForKind(
			"patient_intake_questionnaire",
			baseState,
		);
		assert.ok(payload?.patientIntakeQuestionnaire);
		assert.equal(
			payload.patientIntakeQuestionnaire.chiefComplaint,
			"Боль при приеме сладкого",
		);
	});

	it("returns null for unknown document kind", () => {
		const payload = documentPayloadForKind(
			"non_existent_kind" as GeneratedDocument["kind"],
			baseState,
		);
		assert.equal(payload, null);
	});

	it("throws error when confirmedDocumentLiteral condition is false", () => {
		const unconfirmedState = {
			...baseState,
			paidContractClinicInfoConfirmed: false,
		};
		assert.throws(
			() =>
				documentPayloadForKind(
					"paid_medical_services_contract",
					unconfirmedState,
				),
			/Не подтверждено обязательное условие документа: информация о клинике получена/,
		);
	});
});
