import type { ConsentTemplate, ConsentSubstitutionContext } from "../../types";
import { buildInterventionConsentPayload } from "./interventionPayloads";

export function buildStatutoryConsentPayload(
	kind: string,
	template: ConsentTemplate,
	effectiveContext: ConsentSubstitutionContext,
	todayIsoDate: string,
	doctorFullName: string,
	toothOrArea: string,
	diagnosisOrIndication: string,
): Record<string, unknown> | null {
	const intervention = buildInterventionConsentPayload(
		kind,
		template,
		todayIsoDate,
		doctorFullName,
		toothOrArea,
		diagnosisOrIndication,
	);
	if (intervention) return intervention;

	if (kind === "personal_data_processing_consent") {
		return {
			personalDataProcessingConsent: {
				operatorLegalName:
					effectiveContext.clinicLegalName || effectiveContext.clinicName || "",
				operatorInn: (effectiveContext as { clinicInn?: string }).clinicInn || "",
				operatorAddress: effectiveContext.clinicAddress || "",
				processingPurposes: [
					"Оказание специализированной медицинской стоматологической помощи",
					"Ведение медицинской карты стоматологического пациента по форме № 043/у",
				],
				personalDataCategories: [
					"Фамилия, имя, отчество",
					"Дата рождения, паспортные данные",
					"Контактный номер телефона",
					"Сведения о состоянии здоровья и стоматологическом статусе",
				],
				processingActions: [
					"Сбор, запись, систематизация, накопление, хранение",
					"Уточнение, использование, обезличивание, уничтожение",
				],
				thirdPartyTransferRules:
					"Передача третьим лицам допускается исключительно по основаниям, предусмотренным 152-ФЗ и 323-ФЗ",
				crossBorderTransferAllowed: false,
				automatedDecisionMakingAllowed: false,
				retentionPeriod: "25 лет (срок хранения медицинской документации)",
				revocationChannel: "Письменное заявление на имя главного врача клиники",
				consentGivenAt: todayIsoDate,
				patientConfirmedVoluntaryConsent: true,
				medicalDataProcessingAcknowledged: true,
			},
		};
	}

	if (kind === "medical_intervention_refusal") {
		return {
			medicalInterventionRefusal: {
				refusedIntervention: template.title,
				clinicalIndication: diagnosisOrIndication,
				patientReason: "Личное решение пациента",
				explainedRisks: [
					"Прогрессирование воспалительного процесса",
					"Утрата зуба",
				],
				alternativesOffered: ["Консервативная терапия", "Вскрытие абсцесса"],
				urgentWarningSigns: ["Нарастание отека", "Повышение температуры выше 38°C"],
				doctorFullName,
				refusalConfirmedAt: todayIsoDate,
				patientUnderstandsConsequences: true,
				secondOpinionOffered: true,
				emergencyCareExplained: true,
			},
		};
	}

	return null;
}
