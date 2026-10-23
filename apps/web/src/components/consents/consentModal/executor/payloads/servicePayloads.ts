import type { ConsentTemplate, ConsentSubstitutionContext } from "../../types";

export function buildServiceConsentPayload(
	kind: string,
	template: ConsentTemplate,
	effectiveContext: ConsentSubstitutionContext,
	todayIsoDate: string,
	doctorFullName: string,
	toothOrArea: string,
	diagnosisOrIndication: string,
): Record<string, unknown> | null {
	if (kind === "photo_video_consent") {
		return {
			photoVideoConsent: {
				clinicalRecordUse: true,
				labTransferAllowed: true,
				colleagueConsultationAllowed: true,
				educationUseAllowed: false,
				marketingUseAllowed: false,
				recognizablePublicationAllowed: false,
				materials: ["photographs", "xray_images"],
				anonymizationRequired: true,
				revocationChannel: "Письменное заявление в клинику",
				scopeNotes: null,
			},
		};
	}

	if (kind === "patient_intake_questionnaire") {
		return {
			patientIntakeQuestionnaire: {
				chiefComplaint: diagnosisOrIndication,
				allergyStatus: "Отягощенный аллергоанамнез не выявлен",
				currentMedications: "Не принимает",
				chronicConditions: "Соматически здоров",
				pregnancyStatus: "not_applicable",
				anticoagulants: "Не принимает",
				infectiousRiskNotes: "Особых рисков нет",
				cardioEndocrineNotes: "В норме",
				emergencyContact: effectiveContext.phone || null,
				additionalNotes: null,
				accuracyConfirmed: true,
			},
		};
	}

	if (kind === "warranty_service_memo") {
		return {
			warrantyServiceMemo: {
				completedWorkTitle: template.title,
				treatmentCompletedAt: todayIsoDate,
				toothOrArea,
				materialsUsed: "Композитный пломбировочный материал светового отверждения",
				warrantyMonths: 12,
				freeServiceMonths: 24,
				mandatoryRecallMonths: [6, 12],
				patientDuties: [
					"Соблюдение индивидуальной гигиены полости рта",
					"Явка на профилактический осмотр не реже 1 раза в 6 месяцев",
				],
				warrantyExclusions: [
					"Травматические повреждения челюстно-лицевой области",
					"Самостоятельное вмешательство или лечение в другой клинике",
				],
				urgentWarningSigns: [
					"Появление острой боли",
					"Подвижность реставрации или ортопедической конструкции",
				],
				relatedContractOrActNumber: "Д-2026/01",
				doctorFullName,
				doctorSpecialty: "Врач-стоматолог",
				issuedAt: todayIsoDate,
				patientInformedOfWarrantyTerms: true,
				patientUnderstandsRecallRequirement: true,
				memoCopyReceived: true,
			},
		};
	}

	if (kind === "paid_medical_services_contract") {
		return {
			paidMedicalServicesContract: {
				contractNumber: "ДОГ-736/2026",
				contractDate: todayIsoDate,
				serviceStart: todayIsoDate,
				serviceEndOrCondition: "До полного исполнения обязательств по плану лечения",
				customerFullName: effectiveContext.patientName || "Пациент",
				representativeFullName: effectiveContext.guardianName || null,
				plannedCareReason: diagnosisOrIndication,
				serviceScopeSummary: template.subtitle,
				estimatedTotalRub: 0,
				paymentTerms: "Наличный расчет, банковская карта, СБП по факту оказания услуг",
				priceChangeRules: "Изменение стоимости и объема услуг только по согласованию с пациентом",
				freeCareAvailabilityNotice: "Пациент уведомлен о праве на получение бесплатной медпомощи по ОМС",
				medicalRecommendationWarning: "Несоблюдение предписаний врача может снизить эффективность лечения",
				refusalAndRefundTerms: "Возврат средств за неоказанные услуги по заявлению пациента",
				warrantyAndClaimsTerms: "Гарантийные обязательства по Положению о гарантиях клиники",
				doctorFullName,
				signedAt: todayIsoDate,
				patientReceivedClinicInfo: true,
				patientReceivedPriceAndServiceList: true,
				patientUnderstandsPaidBasis: true,
				changesRequireWrittenAgreement: true,
			},
		};
	}

	return null;
}
