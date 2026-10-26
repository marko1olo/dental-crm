import type { ThreeTierOption } from "../../patientCabinet/patientCabinetEngine.js";

export const BASIC_TIER_OPTION: ThreeTierOption = {
	tierId: "basic",
	tierNameRu: "Базовый",
	subtitleRu: "Стандартная терапия и светоотверждаемый композит Filtek",
	totalCostRub: 58000,
	warrantyMonths: 12,
	durationWeeks: 2,
	benefits: [
		"Светоотверждаемый наногибридный композит Filtek Z250 (3M ESPE)",
		"Официальная гарантия клиники 1 год (12 месяцев)",
		"Стандартная анестезия Septanest без боли",
		"Эффективное устранение кариозных очагов и оздоровление полости рта",
	],
	stages: [
		{
			id: "tier-basic-st1",
			orderIndex: 1,
			titleRu: "Этап 1: Комплексная профгигиена и снятие налета",
			categoryRu: "Гигиена",
			teethFdi: ["11-48"],
			costRub: 8000,
			status: "completed",
			procedures: ["Ультразвуковой скейлинг и полировка пастой"],
			targetDateRu: "Выполнен",
		},
		{
			id: "tier-basic-st2",
			orderIndex: 2,
			titleRu: "Этап 2: Терапевтическое лечение кариеса композитом Filtek",
			categoryRu: "Терапия",
			teethFdi: ["1.6", "2.5", "4.6"],
			costRub: 50000,
			status: "in_progress",
			procedures: ["Лечение кариеса и нанокомпозитная реставрация Filtek Z250"],
			targetDateRu: "В процессе",
		},
	],
};
