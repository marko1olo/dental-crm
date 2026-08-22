import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	PAID_CONTRACT_736_PRESET,
	PERSONAL_DATA_EGISZ_CONSENT_PRESET,
	type DocumentKind,
	type GeneratedDocument,
} from "@dental/shared";
import { postVisitCarePresets } from "../postVisitCareData";

export type DocumentPackageId = "primary" | "clinical" | "tax" | "hospital";

export interface DocumentPackageItem {
	kind: DocumentKind;
	title: string;
	shortTitle: string;
	required: boolean;
	description: string;
}

export interface DocumentPackageDefinition {
	id: DocumentPackageId;
	title: string;
	shortTitle: string;
	description: string;
	icon: string;
	primaryKind: DocumentKind;
	documentKinds: readonly DocumentKind[];
	items: readonly DocumentPackageItem[];
	badge: string;
	category: "intake" | "treatment" | "finance" | "referral";
}

export const DOCUMENT_PACKAGES: Record<
	DocumentPackageId,
	DocumentPackageDefinition
> = {
	primary: {
		id: "primary",
		title: "Первичный пакет",
		shortTitle: "Первичный",
		description:
			"Полный комплект документов при первичном приеме пациента: анкета здоровья, ИДС на осмотр и диагностику (Приказ № 1051н), согласие на обработку ПДн (152-ФЗ), договор на платные медуслуги (ПП РФ № 736) и фотопротокол.",
		icon: "📋",
		primaryKind: "patient_intake_questionnaire",
		documentKinds: [
			"patient_intake_questionnaire",
			"informed_consent",
			"personal_data_processing_consent",
			"paid_medical_services_contract",
			"photo_video_consent",
		],
		badge: "5 документов",
		category: "intake",
		items: [
			{
				kind: "patient_intake_questionnaire",
				title: "Анкета первичного пациента (анамнез и соматический статус)",
				shortTitle: "Анкета здоровья",
				required: true,
				description: "Сбор соматического статуса, аллергий, хронических патологий и контактных лиц.",
			},
			{
				kind: "informed_consent",
				title: "Информированное добровольное согласие на осмотр и рентген (1051н)",
				shortTitle: "Базовое ИДС 1051н",
				required: true,
				description: "Обязательное согласие ст. 20 323-ФЗ перед проведением осмотра и лучевой диагностики.",
			},
			{
				kind: "personal_data_processing_consent",
				title: "Согласие на обработку персональных данных (152-ФЗ / ЕГИСЗ)",
				shortTitle: "Согласие ПДн 152-ФЗ",
				required: true,
				description: "Правовое основание ведения электронной медкарты и передачи данных в ЕГИСЗ.",
			},
			{
				kind: "paid_medical_services_contract",
				title: "Договор на оказание платных медицинских услуг (ПП РФ № 736)",
				shortTitle: "Договор ПП 736",
				required: true,
				description: "Двусторонний договор с фиксацией гарантий, условий оплаты и уведомления о бесплатной помощи.",
			},
			{
				kind: "photo_video_consent",
				title: "Согласие на фото- и видеосъемку (клинический фотопротокол)",
				shortTitle: "Фотопротокол",
				required: false,
				description: "Разрешение на фиксацию исходной клинической картины и динамики лечения.",
			},
		],
	},

	clinical: {
		id: "clinical",
		title: "Клинический пакет",
		shortTitle: "Клинический",
		description:
			"Клинический пакет документов для ведения лечебного приема: стоматологическая медкарта 043/у, специализированное процедурное ИДС, протокол анестезии, план лечения и памятка пациента.",
		icon: "🦷",
		primaryKind: "dental_medical_card_043u",
		documentKinds: [
			"dental_medical_card_043u",
			"procedure_specific_consent_packet",
			"anesthesia_consent_log",
			"treatment_plan",
			"treatment_plan_acceptance",
			"post_visit_recommendations",
		],
		badge: "6 документов",
		category: "treatment",
		items: [
			{
				kind: "dental_medical_card_043u",
				title: "Медицинская карта стоматологического больного (Форма 043/у)",
				shortTitle: "Медкарта 043/у",
				required: true,
				description: "Официальный дневник приема, зубная формула и протокол вмешательства.",
			},
			{
				kind: "procedure_specific_consent_packet",
				title: "Специализированное информированное согласие на процедуру",
				shortTitle: "Процедурное ИДС",
				required: true,
				description: "Клинические риски, материалы, альтернативы и правила послеоперационного ухода.",
			},
			{
				kind: "anesthesia_consent_log",
				title: "Протокол и согласие на проведение местной анестезии",
				shortTitle: "Анестезия 54-ФЗ",
				required: true,
				description: "Учет карпульного анестетика, дозировки и аллергологических проб.",
			},
			{
				kind: "treatment_plan",
				title: "Комплексный план стоматологического лечения",
				shortTitle: "План лечения",
				required: false,
				description: "Поэтапный план терапевтических, хирургических и ортопедических манипуляций.",
			},
			{
				kind: "treatment_plan_acceptance",
				title: "Информированное согласие с комплексным планом лечения",
				shortTitle: "Принятие плана",
				required: false,
				description: "Фиксация согласования объемов лечения и финансового прогноза пациентом.",
			},
			{
				kind: "post_visit_recommendations",
				title: "Памятка с рекомендациями пациенту после приема",
				shortTitle: "Памятка после приема",
				required: true,
				description: "Режим питания, гигиена, ограничения и тревожные симптомы после лечения.",
			},
		],
	},

	tax: {
		id: "tax",
		title: "Налоговый пакет",
		shortTitle: "Налоговый",
		description:
			"Пакет для оформления социального налогового вычета в ФНС: справка об оплате медуслуг (КНД 1151156 / Приказ № ЕД-7-11/803@), заявление налогоплательщика, реестр платежей и квитанция.",
		icon: "🏛️",
		primaryKind: "tax_deduction_certificate",
		documentKinds: [
			"tax_deduction_certificate",
			"tax_deduction_application",
			"tax_deduction_registry",
			"payment_receipt",
		],
		badge: "4 документа",
		category: "finance",
		items: [
			{
				kind: "tax_deduction_certificate",
				title: "Справка об оплате медицинских услуг для ФНС (КНД 1151156)",
				shortTitle: "Справка ФНС 1151156",
				required: true,
				description: "Официальный документ для предоставления в налоговый орган (Приказ ФНС ЕД-7-11/803@).",
			},
			{
				kind: "tax_deduction_application",
				title: "Заявление налогоплательщика на выдачу налоговой справки",
				shortTitle: "Заявление на вычет",
				required: true,
				description: "Основание для формирования и выдачи справки с указанием степени родства.",
			},
			{
				kind: "tax_deduction_registry",
				title: "Реестр платежей и фискальных чеков к налоговой справке",
				shortTitle: "Реестр оплат ФНС",
				required: false,
				description: "Почековая детализация сумм, дат и фискальных признаков (ФПД/ФН).",
			},
			{
				kind: "payment_receipt",
				title: "Квитанция о совершенных платежах и кассовых операциях",
				shortTitle: "Квитанция об оплате",
				required: false,
				description: "Подтверждение кассовых чеков и расчетных документов за налоговый период.",
			},
		],
	},

	hospital: {
		id: "hospital",
		title: "Госпитальный пакет",
		shortTitle: "Госпитальный",
		description:
			"Пакет направления и выписки для стационара, челюстно-лицевой хирургии, седации или сторонних ЛПУ: направление на КЛКТ/рентген, выписка из карты, амбулаторная карта 025/у, справка о посещении и расписка выдачи.",
		icon: "🏥",
		primaryKind: "xray_cbct_referral",
		documentKinds: [
			"xray_cbct_referral",
			"medical_record_extract",
			"outpatient_medical_card_025u",
			"visit_attendance_certificate",
			"medical_document_release_receipt",
		],
		badge: "5 документов",
		category: "referral",
		items: [
			{
				kind: "xray_cbct_referral",
				title: "Направление на рентгенологическое исследование (КЛКТ / ОПТГ / ТРГ)",
				shortTitle: "Направление на снимок",
				required: true,
				description: "Клиническое обоснование, зона сканирования и цель лучевой диагностики.",
			},
			{
				kind: "medical_record_extract",
				title: "Выписка из медицинской карты стоматологического пациента (027/у)",
				shortTitle: "Выписка из карты",
				required: true,
				description: "Анамнез, проведенное лечение, сопутствующие диагнозы и рекомендации.",
			},
			{
				kind: "outpatient_medical_card_025u",
				title: "Медицинская карта пациента, получающего помощь амбулаторно (025/у)",
				shortTitle: "Амбулаторная 025/у",
				required: false,
				description: "Официальная амбулаторная форма Минздрава РФ № 834н / 274н.",
			},
			{
				kind: "visit_attendance_certificate",
				title: "Справка о факте посещения медицинской организации",
				shortTitle: "Справка о посещении",
				required: false,
				description: "Подтверждение нахождения пациента на приеме без раскрытия врачебной тайны.",
			},
			{
				kind: "medical_document_release_receipt",
				title: "Расписка о получении оригиналов / копий медицинских документов",
				shortTitle: "Расписка о выдаче",
				required: false,
				description: "Юридическая фиксация факта выдачи снимков, выписок и оригиналов справок.",
			},
		],
	},
};

export const DOCUMENT_PACKAGE_LIST = Object.values(DOCUMENT_PACKAGES);

export interface DocumentPackagePresetOptions {
	doctorFullName?: string;
	patientFullName?: string;
	taxYear?: number;
	clinicName?: string;
	procedureType?: keyof typeof CLINICAL_CONSENT_PRESETS;
}

/**
 * Генерирует набор полей состояния стора для быстрого применения пакета.
 */
export function buildDocumentPackageStatePatch(
	packageId: DocumentPackageId,
	options: DocumentPackagePresetOptions = {},
): Record<string, unknown> {
	const currentYear = options.taxYear || new Date().getFullYear();
	const procedureType = options.procedureType || "therapy_endo_restoration";
	const procPreset = CLINICAL_CONSENT_PRESETS[procedureType] || CLINICAL_CONSENT_PRESETS.therapy_endo_restoration;

	switch (packageId) {
		case "primary": {
			return {
				selectedDocumentKind: "patient_intake_questionnaire" as DocumentKind,
				// 1051n Informed Consent Defaults
				informedConsentIntervention: BASE_INFORMED_CONSENT_PRESET.intervention,
				informedConsentDiagnosisOrIndication: BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication,
				informedConsentExpectedBenefit: BASE_INFORMED_CONSENT_PRESET.expectedBenefit,
				informedConsentAnesthesia: BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia,
				informedConsentMaterialNotes: BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes,
				informedConsentRisks: BASE_INFORMED_CONSENT_PRESET.explainedRisks.join("\n"),
				informedConsentAlternatives: BASE_INFORMED_CONSENT_PRESET.alternatives.join("\n"),
				informedConsentAftercare: BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.join("\n"),
				informedConsentQuestionsAnswered: true,
				informedConsentRisksUnderstood: true,
				informedConsentWithdrawUnderstood: true,
				...(options.doctorFullName ? { informedConsentDoctorFullName: options.doctorFullName } : {}),

				// 152-FZ Personal Data Defaults
				personalDataPurposes: PERSONAL_DATA_EGISZ_CONSENT_PRESET.purposes.join("\n"),
				personalDataCategories: PERSONAL_DATA_EGISZ_CONSENT_PRESET.categories.join("\n"),
				personalDataActions: PERSONAL_DATA_EGISZ_CONSENT_PRESET.actions.join("\n"),
				personalDataTransferRules: PERSONAL_DATA_EGISZ_CONSENT_PRESET.transferRules,
				personalDataRetentionPeriod: PERSONAL_DATA_EGISZ_CONSENT_PRESET.retentionPeriod,
				personalDataRevocationChannel: PERSONAL_DATA_EGISZ_CONSENT_PRESET.revocationChannel,
				personalDataVoluntaryConsentConfirmed: true,
				personalDataMedicalProcessingAcknowledged: true,

				// Paid Contract PP 736 Defaults
				paidContractPaymentTerms: PAID_CONTRACT_736_PRESET.paymentTerms,
				paidContractPriceChangeRules: PAID_CONTRACT_736_PRESET.priceChangeRules,
				paidContractFreeCareNotice: PAID_CONTRACT_736_PRESET.freeCareNotice,
				paidContractRecommendationWarning: PAID_CONTRACT_736_PRESET.medicalRecommendationWarning,
				paidContractRefundTerms: PAID_CONTRACT_736_PRESET.refusalAndRefundTerms,
				paidContractWarrantyTerms: PAID_CONTRACT_736_PRESET.warrantyTerms,
				paidContractClinicInfoConfirmed: true,
				paidContractServiceListConfirmed: true,
				paidContractPaidBasisConfirmed: true,
				paidContractWrittenChangesConfirmed: true,
				...(options.doctorFullName ? { paidContractDoctorFullName: options.doctorFullName } : {}),

				// Photo Video Consent Defaults
				photoVideoClinicalRecordUseConfirmed: true,
				photoVideoRecognizablePublicationAllowed: false,
				photoVideoEducationUseAllowed: true,
				photoVideoColleagueConsultationAllowed: true,

				// Intake Questionnaire Defaults
				intakeAccuracyConfirmed: true,
			};
		}

		case "clinical": {
			const carePreset = postVisitCarePresets.filling_restoration;
			return {
				selectedDocumentKind: "dental_medical_card_043u" as DocumentKind,
				// Procedure Specific Consent Defaults
				procedureConsentProcedureType: procPreset.procedureType,
				procedureConsentProcedureName: procPreset.procedureName,
				procedureConsentDiagnosisOrIndication: procPreset.diagnosisOrIndication,
				procedureConsentAnesthesia: procPreset.plannedAnesthesia,
				procedureConsentMaterials: procPreset.materialsAndSystems,
				procedureConsentPatientRiskFactors: procPreset.patientSpecificRiskFactors.join("\n"),
				procedureConsentSpecificRisks: procPreset.procedureSpecificRisks.join("\n"),
				procedureConsentAlternatives: procPreset.alternatives.join("\n"),
				procedureConsentAftercare: procPreset.aftercareAndLimits.join("\n"),
				procedureConsentLocalFormAttached: true,
				procedureConsentQuestionsAnswered: true,
				procedureConsentExactProcedureConfirmed: true,
				procedureConsentRisksUnderstood: true,
				...(options.doctorFullName ? { procedureConsentDoctorFullName: options.doctorFullName } : {}),

				// Post Visit Care Defaults
				postVisitCareTopic: "filling_restoration",
				postVisitProcedureName: carePreset.procedureName,
				postVisitAllowedAfter: carePreset.allowedAfter,
				postVisitRestrictions: carePreset.temporaryRestrictions,
				postVisitMedicationAndRinsePlan: carePreset.medicationAndRinsePlan,
				postVisitHygieneInstructions: carePreset.hygieneInstructions,
				postVisitNutritionInstructions: carePreset.nutritionInstructions,
				postVisitUrgentWarningSigns: carePreset.urgentWarningSigns,
				postVisitFollowUpAt: carePreset.plannedFollowUpAt,
				postVisitTelegramSummary: carePreset.telegramSummary,
				...(options.doctorFullName ? { postVisitDoctorFullName: options.doctorFullName } : {}),
			};
		}

		case "tax": {
			return {
				selectedDocumentKind: "tax_deduction_certificate" as DocumentKind,
				taxDocumentYear: currentYear,
				taxApplicationForm: "standard",
				taxApplicationDeliveryChannel: "in_person",
				taxApplicationRelationship: "self",
				taxApplicationDuplicateWarningAccepted: true,
				paymentReceiptTaxSupportRequested: true,
				paymentReceiptPaymentsVerified: true,
				paymentReceiptPayerVerified: true,
				paymentReceiptFiscalNoticeConfirmed: true,
				paymentReceiptPurpose: `Оплата стоматологических медицинских услуг за ${currentYear} год`,
				...(options.patientFullName
					? {
							taxApplicationTaxpayerFullName: options.patientFullName,
							paymentReceiptPayerFullName: options.patientFullName,
						}
					: {}),
			};
		}

		case "hospital": {
			return {
				selectedDocumentKind: "xray_cbct_referral" as DocumentKind,
				// Outpatient 025u & Extract
				outpatient025uOfficialForm274nChecked: true,
				outpatient025uThirdPartyDataChecked: true,
				// Attendance Certificate
				attendanceDiagnosisDisclosureExcluded: true,
				attendanceNotSickLeaveAcknowledged: true,
				attendancePurpose: "Консультация и лечение в специализированном стационаре / челюстно-лицевом отделении",
				// Release Receipt
				releaseChannel: "paper",
				releaseThirdPartyDataChecked: true,
				releaseDocumentTypes: "Выписка из медицинской карты (027/у)\nДанные рентгенологических исследований (КЛКТ / ОПТГ)",
				releaseRecipientAuthority: "пациент лично",
				// Copy Request
				copyRequestIncludeDicomSourceData: true,
				copyRequestIdentityVerified: true,
				copyRequestThirdPartyDataChecked: true,
				copyRequestFormat: "paper",
				copyRequestDocumentTypes: "Выписка из медицинской карты\nАрхив диагностических снимков",
			};
		}

		default:
			return {};
	}
}

/**
 * Проверяет, валиден ли идентификатор пакета документов.
 */
export function isDocumentPackageId(value: unknown): value is DocumentPackageId {
	return typeof value === "string" && (value === "primary" || value === "clinical" || value === "tax" || value === "hospital");
}

/**
 * Возвращает метаданные пакета документов по его ID.
 */
export function getDocumentPackage(packageId: DocumentPackageId): DocumentPackageDefinition {
	return DOCUMENT_PACKAGES[packageId];
}
