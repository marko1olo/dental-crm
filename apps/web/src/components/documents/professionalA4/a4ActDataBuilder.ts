import type { A4DocumentActData } from "@dental/shared";
import type {
	buildA4ClinicRequisites,
	buildA4PatientRequisites,
} from "./a4ClinicPatientDefaults";

type ClinicReq = ReturnType<typeof buildA4ClinicRequisites>;
type PatientReq = ReturnType<typeof buildA4PatientRequisites>;

export function buildA4ActData(
	cl: ClinicReq,
	pt: PatientReq,
	doctor: string,
	todayRu: string,
	contractNumber: string,
	contractDate: string,
	customActData?: Partial<A4DocumentActData>,
	// biome-ignore lint/suspicious/noExplicitAny: existing document record
	latestActDoc?: any,
): A4DocumentActData {
	const liveActNum = latestActDoc?.documentNumber as string | undefined;
	const rawActAmount = latestActDoc?.amountRub ?? latestActDoc?.totalAmountRub;
	const liveActAmount =
		typeof rawActAmount === "number" && rawActAmount > 0
			? rawActAmount
			: undefined;
	return {
		clinic: cl,
		patient: pt,
		actNumber:
			liveActNum ||
			`А-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
		actDate: todayRu,
		contractNumber,
		contractDate,
		doctorFullName: doctor,
		doctorSpecialty: "Врач-стоматолог-терапевт",
		services: customActData?.services || [
			{
				code804n: "B01.065.001",
				name: "Прием врача-стоматолога первичный",
				toothOrArea: "Полость рта",
				quantity: 1,
				unitPriceRub: 2500,
				discountRub: 0,
				totalRub: 2500,
			},
			{
				code804n: "A16.07.002",
				name: "Восстановление зуба нанокомпозитом Harmonize",
				toothOrArea: "16",
				quantity: 1,
				unitPriceRub: 9500,
				discountRub: 500,
				totalRub: 9000,
			},
			{
				code804n: "A11.07.012",
				name: "Комплексная Air-Flow профгигиена",
				toothOrArea: "11-48",
				quantity: 1,
				unitPriceRub: 6500,
				discountRub: 0,
				totalRub: 6500,
			},
		],
		totalAmountRub: customActData?.totalAmountRub || liveActAmount || 18000,
		warrantyTermsText:
			customActData?.warrantyTermsText ||
			"12 месяцев на композитные реставрации при осмотре каждые 6 месяцев.",
		fiscalReceiptNumber:
			customActData?.fiscalReceiptNumber || "ФД-78412 / ФП-98214301",
		...customActData,
	};
}
