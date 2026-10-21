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
		doctorFullName: doctor,
		doctorSpecialty: "Врач-стоматолог-терапевт",
		allergyStatus:
			"Отягощен: аллергическая реакция на амидопирин (крапивница). Непереносимость лидокаина отрицает.",
		somaticStatus:
			"Соматически здоров. Артериальное давление 120/80 мм рт. ст., пульс 72 уд/мин.",
		complaints:
			"Жалобы на кратковременные боли от сладкого и термических раздражителей в зубе 16 верхней челюсти справа.",
		anamnesisMorbi:
			"Боли появились около 2 недель назад. Ранее зуб не лечен. За медицинской помощью обратился впервые.",
		statusLocalis:
			"Слизистая оболочка полости рта бледно-розового цвета, умеренно увлажнена. Прикус ортогнатический. На окклюзионно-медиальной поверхности зуба 16 обнаружена глубокая кариозная полость со светлым размягченным дентином. Зондирование эмалево-дентинной границы чувствительно. Перкуссия зуба 16 безболезненна. Реакция на холод кратковременная (исчезает через 3 сек). ЭОД = 4 мкА.",
		teethFormulaSummary:
			"16 — C (кариес), 24 — K (коронка/дефект), 36 — Pt (периодонтит/пломбирован), 46 — П (пломба).",
		teethFormulaMap: buildDefaultTeethMap(),
		diagnosisIcd10: "K02.1",
		diagnosisDescription: "Кариес дентина (глубокий кариес)",
		diagnosisTooth: "16",
		treatmentProtocol:
			"Инфильтрационная анестезия Sol. Ultracaini D-S 1:200000 1.7 мл. Препарирование кариозной полости зуба 16 с водно-воздушным охлаждением. Изоляция операционного поля коффердам. Медикаментозная обработка 2% хлоргексидином. Лайнер Life точечно на дно. SDR+ и OptiBond FL. Реставрация Harmonize A3/A2. Полимеризация. Финишная полировка Sof-Lex/Enhance.",
		materialsUsed:
			"Ультракаин Д-С 1.7 мл, коффердам Nic Tone, Life (Kerr), SDR+ (Dentsply), OptiBond FL (Kerr), Harmonize A3/A2, диски Sof-Lex.",
		recommendations:
			"1. Воздержаться от красящей пищи 2 ч. 2. Тщательная гигиена полости рта. 3. Контрольный осмотр через 3-5 дней при чувстве завышения. 4. Плановый осмотр через 6 мес.",
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
		consentNumber: `ИДС-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
		consentDate: todayRu,
		clinic: cl,
		patient: pt,
		doctorFullName: doctor,
		doctorSpecialty: "Врач-стоматолог-терапевт",
		interventionName:
			"Комплексное терапевтическое лечение, местная инфильтрационная анестезия и реставрация зубов",
		toothOrArea: "16",
		diagnosisSummary: "K02.1 Кариес дентина (глубокий кариес 16 зуба)",
		contractNumber,
		contractDate,
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
		consentNumber: `ПД-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
		consentDate: todayRu,
		clinic: cl,
		patient: pt,
		thirdPartyTransfersAllowed: true,
		egiszTransferAllowed: true,
		...customPersonalDataConsent,
	};
}
