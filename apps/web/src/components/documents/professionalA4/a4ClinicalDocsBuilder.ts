import type {
	A4DocumentInformedConsentData,
	A4DocumentMedicalCardData,
	A4DocumentPersonalDataConsentData,
} from "@dental/shared";
import type {
	buildA4ClinicRequisites,
	buildA4PatientRequisites,
} from "./a4ClinicPatientDefaults";

type ClinicReq = ReturnType<typeof buildA4ClinicRequisites>;
type PatientReq = ReturnType<typeof buildA4PatientRequisites>;

function buildDefaultTeethMap(): Record<number, { state: string }> {
	const special: Record<number, string> = {
		16: "C",
		24: "K",
		28: "0",
		36: "Pt",
		46: "П",
		48: "0",
	};
	const teeth = [
		18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
		45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
	];
	const map: Record<number, { state: string }> = {};
	for (const t of teeth) map[t] = { state: special[t] ?? "—" };
	return map;
}

export function buildA4MedicalCardData(
	cl: ClinicReq,
	pt: PatientReq,
	doctor: string,
	todayRu: string,
	customMedicalCardData?: Partial<A4DocumentMedicalCardData>,
): A4DocumentMedicalCardData {
	return {
		clinic: cl,
		patient: pt,
		cardNumber: pt.cardNumber,
		visitDate: todayRu,
		doctorFullName: doctor || "____________________________________",
		doctorSpecialty: "Врач-стоматолог",
		allergyStatus:
			"Не отягощен (со слов пациента аллергические реакции отрицает)",
		somaticStatus:
			"Соматически здоров.",
		complaints:
			"Жалоб на момент осмотра не предъявляет / Плановый осмотр.",
		anamnesisMorbi:
			"Ранее за стоматологической помощью обращался в плановом порядке.",
		statusLocalis:
			"Слизистая оболочка полости рта без видимых патологических изменений.",
		teethFormulaSummary:
			"Зубные ряды интактные / Требуется плановая санация.",
		teethFormulaMap: {},
		diagnosisIcd10: "Z01.2",
		diagnosisDescription: "Стоматологическое обследование / Первичный осмотр",
		diagnosisTooth: "—",
		treatmentProtocol:
			"Клинический осмотр полости рта, оценка гигиенического статуса, составление плана лечения.",
		materialsUsed:
			"Стерильный индивидуальный смотровой набор, одноразовые расходные материалы.",
		recommendations:
			"1. Индивидуальная гигиена полости рта 2 раза в день. 2. Контрольный осмотр и профессиональная гигиена через 6 месяцев.",
		...customMedicalCardData,
	};
}

export function buildA4ConsentData(
	cl: ClinicReq,
	pt: PatientReq,
	doctor: string,
	todayRu: string,
	contractNumber: string,
	contractDate: string,
	customConsentData?: Partial<A4DocumentInformedConsentData>,
): A4DocumentInformedConsentData {
	return {
		consentNumber: `ИДС-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "____"}`,
		consentDate: todayRu,
		clinic: cl,
		patient: pt,
		doctorFullName: doctor || "____________________________________",
		doctorSpecialty: "Врач-стоматолог",
		interventionName:
			"Медицинское вмешательство в соответствии с утвержденным планом лечения",
		toothOrArea: "—",
		diagnosisSummary: "Стоматологическое обследование / Санация",
		contractNumber: contractNumber || "____________________",
		contractDate: contractDate || todayRu,
		patientQuestionsAnswered: true,
		...customConsentData,
	};
}

export function buildA4PersonalDataConsent(
	cl: ClinicReq,
	pt: PatientReq,
	todayRu: string,
	customPersonalDataConsent?: Partial<A4DocumentPersonalDataConsentData>,
): A4DocumentPersonalDataConsentData {
	return {
		consentNumber: `ПД-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "____"}`,
		consentDate: todayRu,
		clinic: cl,
		patient: pt,
		thirdPartyTransfersAllowed: true,
		egiszTransferAllowed: true,
		...customPersonalDataConsent,
	};
}
