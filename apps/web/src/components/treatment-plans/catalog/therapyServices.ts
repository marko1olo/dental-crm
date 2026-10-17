import type { Order804nProcedureDefinition } from "../types";

export const THERAPY_SERVICES: Record<string, Order804nProcedureDefinition> = {
	DiagnosticsCT: {
		code: "A06.07.004", title: "Компьютерная томография челюстно-лицевой области (КЛКТ 3D)", category: "Диагностика",
		defaultPriceRub: 3500, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["кт", "томограф", "сним", "клкт"],
		materialsDefault: "Цифровой 3D-томограф высокой резолюции", uetDoctor: 1.5, uetNurse: 1.5,
	},
	DiagnosticsOPG: {
		code: "A06.07.003", title: "Ортопантомография (ОПТГ / панорамный снимок зубных рядов)", category: "Диагностика",
		defaultPriceRub: 1400, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["оптг", "панорамный", "снимок"],
		materialsDefault: "Цифровой ортопантомограф Planmeca ProMax", uetDoctor: 0.8, uetNurse: 0.8,
	},
	DiagnosticsRVG: {
		code: "A06.07.007", title: "Прицельная радиовизиография зуба (контрольный снимок)", category: "Диагностика",
		defaultPriceRub: 550, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["прицельный", "визиограф", "снимок зуба"],
		materialsDefault: "Дентальный радиовизиографический датчик Carestream RVG", uetDoctor: 0.4, uetNurse: 0.4,
	},
	InitialConsultation: {
		code: "B01.065.001", title: "Прием (осмотр, консультация) врача-стоматолога первичный", category: "Консультация",
		defaultPriceRub: 1500, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["осмотр", "консультация"],
		materialsDefault: "Одноразовый стерильный смотровой набор", uetDoctor: 1.0, uetNurse: 1.0,
	},
	ProfHygieneAirFlow: {
		code: "A16.07.051", title: "Профессиональная гигиена полости рта (УЗ-скейлинг + Air-Flow + полировка)", category: "Гигиена",
		defaultPriceRub: 5500, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["гигиена", "air flow", "чистка"],
		materialsDefault: "Порошок EMS Air-Flow Plus, полировочные пасты Cleanic", uetDoctor: 2.5, uetNurse: 2.5,
	},
	CariesSuperficialis: {
		code: "A16.07.002.001", title: "Лечение поверхностного / среднего кариеса с пломбированием светоотверждаемым композитом", category: "Терапия",
		defaultPriceRub: 4800, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["кариес", "пломба", "композит"],
		materialsDefault: "Наногибридный композит Estelite Asteria / 3M Filtek Ultimate", uetDoctor: 2.0, uetNurse: 1.5,
	},
	CariesProfunda: {
		code: "A16.07.002.002", title: "Лечение глубокого кариеса с лечебной / изолирующей прокладкой и биореставрацией", category: "Терапия",
		defaultPriceRub: 6200, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["глубокий кариес", "прокладка"],
		materialsDefault: "Биоактивный силикатный цемент Biodentine / TheraCal LC + Filtek", uetDoctor: 2.5, uetNurse: 2.0,
	},
	Pulpitis1Canal: {
		code: "A16.07.030", title: "Эндодонтическое лечение пульпита/периодонтита (1-канальный зуб: медобработка + обтурация)", category: "Эндодонтия",
		defaultPriceRub: 6500, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["пульпит 1", "канал 1"],
		materialsDefault: "Эндофайлы ProTaper Gold, гуттаперча, биокерамика TotalFill", uetDoctor: 3.0, uetNurse: 2.0,
	},
	PulpitisMultiCanal: {
		code: "A16.07.030.003", title: "Эндодонтическое лечение пульпита/периодонтита (3-4 канальный зуб: медобработка + 3D обтурация)", category: "Эндодонтия",
		defaultPriceRub: 12500, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["пульпит 3", "пульпит 4", "многоканальный"],
		materialsDefault: "Машинные файлы WaveOne Gold / ProTaper Next, NaOCl 3%, силер AH Plus", uetDoctor: 4.5, uetNurse: 3.0,
	},
	PediatricCaries: {
		code: "A16.07.002.099", title: "Лечение кариеса временного зуба с пломбированием стеклоиономерным цементом Fuji IX / Twinky Star", category: "Детская терапия",
		defaultPriceRub: 3200, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["детский кариес", "молочный зуб"],
		materialsDefault: "Стеклоиономерный цемент GC Fuji IX Extra / цветной компомер Twinky Star", uetDoctor: 1.5, uetNurse: 1.5,
	},
	PediatricPulpotomy: {
		code: "A16.07.030.099", title: "Пульпотомия (витальная ампутация) временного зуба с покрытием минералтриоксидагрегатом (МТА)", category: "Детская терапия",
		defaultPriceRub: 4200, stageKind: "stage_1_therapy", stageNumber: 1, keywords: ["пульпотомия", "ампутация пульпы"],
		materialsDefault: "Биоактивный силикатный цемент ProRoot MTA / Biodentine", uetDoctor: 2.0, uetNurse: 1.5,
	},
};
