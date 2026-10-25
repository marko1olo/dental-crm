import type { PortalTreatmentPlan } from "../patientPortalTypes";

export const SAMPLE_PORTAL_TREATMENT_PLAN: PortalTreatmentPlan = {
	id: "plan-2026-0891",
	planNumber: "ПЛАН-2026/891",
	titleRu: "Комплексный план лечения и восстановления улыбки",
	createdDateIso: "2026-08-14",
	curatingDoctorName: "Д-р Смирнов Алексей Петрович",
	totalAmountRub: 84500,
	completedAmountRub: 21300,
	remainingAmountRub: 63200,
	progressPercent: 25,
	teethFdiSummary: ["1.6", "2.4", "4.6", "11-48"],
	stages: [
		{
			id: "stage-1-therapy",
			stageNumber: 1,
			titleRu: "Этап 1: Неотложная терапия и эндодонтия",
			descriptionRu: "Купирование пульпита зуба 1.6, эндодонтическое пломбирование каналов и лечение среднего кариеса 2.4",
			status: "completed",
			teethFdi: ["1.6", "2.4"],
			totalAmountRub: 21300,
			completedAmountRub: 21300,
			remainingAmountRub: 0,
			targetDateRu: "Август 2026",
			procedures: [
				{
					id: "proc-1-1", code804n: "A16.07.030.002", toothFdi: "1.6",
					nameRu: "Инструментальная и медикаментозная обработка 3 каналов (Reciproc Blue)",
					priceRub: 8500, status: "completed", doctorName: "Д-р Смирнов А. П.",
				},
				{
					id: "proc-1-2", code804n: "A16.07.008", toothFdi: "1.6",
					nameRu: "Трехмерная обтурация каналов термопластичной гуттаперчей GuttaCore",
					priceRub: 4800, status: "completed", doctorName: "Д-р Смирнов А. П.",
				},
				{
					id: "proc-1-3", code804n: "A16.07.002.002", toothFdi: "2.4",
					nameRu: "Эстетическая реставрация зуба 2.4 нанокомпозитом Estelite Asteria",
					priceRub: 6800, status: "completed", doctorName: "Д-р Смирнов А. П.",
				},
				{
					id: "proc-1-4", code804n: "A16.07.002.001", toothFdi: "1.6, 2.4",
					nameRu: "Анестезия инфильтрационная Sol. Ultracaini DS Forte (2 карпулы)",
					priceRub: 1200, status: "completed", doctorName: "Д-р Смирнов А. П.",
				},
			],
		},
		{
			id: "stage-2-ortho",
			stageNumber: 2,
			titleRu: "Этап 2: Ортопедическое восстановление",
			descriptionRu: "Цифровой интраоральный 3D скан челюстей и фиксация анатомической коронки из диоксида циркония Katana ML",
			status: "in_progress",
			teethFdi: ["1.6"],
			totalAmountRub: 28000,
			completedAmountRub: 0,
			remainingAmountRub: 28000,
			targetDateRu: "Сентябрь 2026",
			procedures: [
				{
					id: "proc-2-1", code804n: "A16.07.004.002", toothFdi: "1.6",
					nameRu: "Оптический 3D-скан челюстей iTero Element",
					priceRub: 3000, status: "in_progress", doctorName: "Д-р Миронова Е. С.",
				},
				{
					id: "proc-2-2", code804n: "A16.07.004.001", toothFdi: "1.6",
					nameRu: "Коронка из диоксида циркония Katana Multi-Layer (CAD/CAM)",
					priceRub: 25000, status: "planned", doctorName: "Д-р Миронова Е. С.",
				},
			],
		},
		{
			id: "stage-3-hygiene-implant",
			stageNumber: 3,
			titleRu: "Этап 3: Профгигиена и имплантация",
			descriptionRu: "Комплекс гигиены AirFlow и дентальная имплантация в области отсутствующего зуба 4.6 (Osstem TS III)",
			status: "planned",
			teethFdi: ["4.6", "11-48"],
			totalAmountRub: 35200,
			completedAmountRub: 0,
			remainingAmountRub: 35200,
			targetDateRu: "Октябрь 2026",
			procedures: [
				{
					id: "proc-3-1", code804n: "A16.07.051", toothFdi: "11-48",
					nameRu: "Комплексная гигиена полости рта AirFlow + ультразвук EMS",
					priceRub: 6500, status: "planned", doctorName: "Д-р Васильева О. И.",
				},
				{
					id: "proc-3-2", code804n: "A16.07.054.001", toothFdi: "4.6",
					nameRu: "Установка дентального имплантата Osstem TS III (Южная Корея)",
					priceRub: 28700, status: "planned", doctorName: "Врач-хирург-имплантолог",
				},
			],
		},
	],
};
