import type { ConsentTemplate } from "../../types";

export function buildInterventionConsentPayload(
	kind: string,
	template: ConsentTemplate,
	todayIsoDate: string,
	doctorFullName: string,
	toothOrArea: string,
	diagnosisOrIndication: string,
): Record<string, unknown> | null {
	if (kind === "informed_consent") {
		return {
			informedConsent: {
				intervention: template.title,
				toothOrArea,
				diagnosisOrIndication,
				expectedBenefit: "Восстановление анатомической формы и функции зубочелюстной системы",
				plannedAnesthesia: "Местная инфильтрационная / проводниковая анестезия",
				materialOrMedicationNotes: null,
				trustedContactForMedicalInfo: null,
				explainedRisks: [
					"Возможная болезненность в зоне вмешательства",
					"Индивидуальная реакция на анестетик",
					"Отек мягких тканей в послеоперационном периоде",
				],
				alternatives: [
					"Динамическое наблюдение",
					"Альтернативные методы ортопедического / терапевтического лечения",
				],
				aftercareRequirements: [
					"Соблюдение гигиены полости рта",
					"Воздержание от приема пищи в течение 2 часов",
					"Явка на контрольный осмотр в назначенный срок",
				],
				doctorFullName,
				consentConfirmedAt: todayIsoDate,
				patientQuestionsAnswered: true,
				patientUnderstandsRisks: true,
				patientMayWithdrawBeforeIntervention: true,
			},
		};
	}

	if (kind === "procedure_specific_consent_packet") {
		return {
			procedureSpecificConsent: {
				procedureType: "therapy_endo_restoration",
				procedureName: template.title,
				toothOrArea,
				diagnosisOrIndication,
				clinicalToothRows: "permanent",
				plannedAnesthesia: "Местная инфильтрационная анестезия",
				materialsAndSystems: null,
				patientSpecificRiskFactors: ["Индивидуальная анатомия корневых каналов"],
				procedureSpecificRisks: [
					"Повышенная чувствительность после препарирования",
					"Вероятность скола пломбировочного материала при сверхнагрузке",
				],
				alternatives: [
					"Временное пломбирование",
					"Ортопедическое восстановление вкладкой/коронкой",
				],
				aftercareAndLimits: [
					"Щадящая диета в первые сутки",
					"Контрольная рентгенография через 6 месяцев",
				],
				doctorFullName,
				consentConfirmedAt: todayIsoDate,
				localClinicFormAttached: false,
				patientQuestionsAnswered: true,
				exactProcedureConfirmed: true,
				patientUnderstandsSpecificRisks: true,
			},
		};
	}

	return null;
}
