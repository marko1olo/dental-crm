import type { A4DocumentContractData } from "@dental/shared";
import type {
	buildA4ClinicRequisites,
	buildA4PatientRequisites,
} from "./a4ClinicPatientDefaults";

type ClinicReq = ReturnType<typeof buildA4ClinicRequisites>;
type PatientReq = ReturnType<typeof buildA4PatientRequisites>;

export function buildA4ContractData(
	cl: ClinicReq,
	pt: PatientReq,
	doctor: string,
	todayRu: string,
	customContractData?: Partial<A4DocumentContractData>,
	// biome-ignore lint/suspicious/noExplicitAny: existing document record
	latestContractDoc?: any,
): A4DocumentContractData {
	const liveDocNum = latestContractDoc?.documentNumber as string | undefined;
	const rawAmount =
		latestContractDoc?.amountRub ?? latestContractDoc?.totalAmountRub;
	const liveAmount =
		typeof rawAmount === "number" && rawAmount > 0 ? rawAmount : undefined;
	return {
		clinic: cl,
		patient: pt,
		contractNumber:
			liveDocNum ||
			`Д-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
		contractDate: todayRu,
		estimatedTotalRub:
			customContractData?.estimatedTotalRub || liveAmount || 18500,
		services: customContractData?.services || [
			{
				code804n: "B01.065.001",
				name: "Прием врача-стоматолога первичный",
				toothOrArea: "Полость рта",
				quantity: 1,
				unitPriceRub: 2500,
				totalRub: 2500,
			},
			{
				code804n: "A16.07.002",
				name: "Восстановление зуба пломбой (кариес дентина)",
				toothOrArea: "16",
				quantity: 1,
				unitPriceRub: 9500,
				totalRub: 9500,
			},
			{
				code804n: "A11.07.012",
				name: "Глубокое фторирование эмали и профгигиена",
				toothOrArea: "11-48",
				quantity: 1,
				unitPriceRub: 6500,
				totalRub: 6500,
			},
		],
		clinicalReason:
			customContractData?.clinicalReason ||
			latestContractDoc?.summary ||
			latestContractDoc?.notes ||
			"Первичная консультация, санация кариеса 16 и профгигиена",
		doctorFullName: doctor,
		...customContractData,
	};
}
