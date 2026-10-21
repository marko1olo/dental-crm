import type { A4DocumentTreatmentPlanData } from "@dental/shared";
import type {
	buildA4ClinicRequisites,
	buildA4PatientRequisites,
} from "./a4ClinicPatientDefaults";

type ClinicReq = ReturnType<typeof buildA4ClinicRequisites>;
type PatientReq = ReturnType<typeof buildA4PatientRequisites>;

export function buildA4TreatmentPlanData(
	cl: ClinicReq,
	pt: PatientReq,
	doctor: string,
	todayRu: string,
	customTreatmentPlanData?: Partial<A4DocumentTreatmentPlanData>,
	// biome-ignore lint/suspicious/noExplicitAny: existing document record
	latestPlanDoc?: any,
): A4DocumentTreatmentPlanData {
	const livePlanSummary = latestPlanDoc?.summary || latestPlanDoc?.notes;
	return {
		clinic: cl,
		patient: pt,
		planDate: todayRu,
		doctorFullName: doctor,
		diagnosisSummary:
			livePlanSummary ||
			"K02.1 Кариес дентина 16 зуба, K05.1 Хронический гингивит, дефект коронки 24 зуба",
		stages: customTreatmentPlanData?.stages || [
			{
				stageNumber: 1,
				stageName: "Этап I. Неотложная терапия и санация очагов инфекции",
				stageTiming: "1–3 дня",
				plannedServices: [
					{
						name: "Консультация стоматолога-терапевта, фотопротокол и рентген-диагностика",
						toothOrArea: "Полость рта",
						timing: "1-й визит",
						priceRub: 2500,
					},
					{
						name: "Лечение кариеса дентина зуба 16 со световой реставрацией",
						toothOrArea: "16",
						timing: "1-й визит",
						priceRub: 9000,
					},
				],
				stageTotalRub: 11500,
			},
			{
				stageNumber: 2,
				stageName:
					"Этап II. Профессиональная гигиена и пародонтологическая подготовка",
				stageTiming: "через 5–7 дней",
				plannedServices: [
					{
						name: "Снятие наддесневых и поддесневых зубных отложений ультразвуком + Air-Flow",
						toothOrArea: "11-48",
						timing: "2-й визит",
						priceRub: 6500,
					},
				],
				stageTotalRub: 6500,
			},
			{
				stageNumber: 3,
				stageName: "Этап III. Ортопедическая реабилитация",
				stageTiming: "2–3 недели",
				plannedServices: [
					{
						name: "Препарирование и установка цельнокерамической коронки E.max",
						toothOrArea: "24",
						timing: "3-й и 4-й визит",
						priceRub: 28000,
					},
				],
				stageTotalRub: 28000,
			},
		],
		totalCostWithoutDiscountRub: 46000,
		discountRub: 2000,
		totalCostWithDiscountRub: 44000,
		approvedVariantName:
			"Вариант «Оптимальный» (Биологическая санация + E.max керамика)",
		...customTreatmentPlanData,
	};
}
