import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 039/у-88 — СВОДНАЯ ВЕДОМОСТЬ УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА
 * Нормативы УЕТ по Приказу Минздрава РФ № 804н / Инструкции Минздрава СССР
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Нормативы УЕТ (Условных Единиц Трудоемкости) по номенклатуре Минздрава РФ */
export interface UetProcedureStandard {
	code: string;
	serviceName: string;
	category: "therapy" | "endodontics" | "surgery" | "hygiene_perio" | "prosthetics" | "orthodontics" | "anesthesia_diagnostics";
	uetValue: number;
}

export const OFFICIAL_UET_STANDARDS_804N: readonly UetProcedureStandard[] = [
	// Анестезиология и диагностика
	{ code: "A11.07.012", serviceName: "Местная анестезия (аппликационная)", category: "anesthesia_diagnostics", uetValue: 0.25 },
	{ code: "A11.07.010", serviceName: "Местная анестезия (инфильтрационная)", category: "anesthesia_diagnostics", uetValue: 0.50 },
	{ code: "A11.07.011", serviceName: "Местная анестезия (проводниковая)", category: "anesthesia_diagnostics", uetValue: 0.75 },
	{ code: "B01.065.001", serviceName: "Прием (осмотр, консультация) врача-стоматолога первичный", category: "anesthesia_diagnostics", uetValue: 0.50 },
	{ code: "B01.065.002", serviceName: "Прием (осмотр, консультация) врача-стоматолога повторный", category: "anesthesia_diagnostics", uetValue: 0.25 },
	{ code: "A06.07.001", serviceName: "Прицельная внутриротовая радиовизиография", category: "anesthesia_diagnostics", uetValue: 0.40 },

	// Терапия (кариес, пломбы)
	{ code: "A16.07.002.001", serviceName: "Наложение пломбы из композита (I, V класс по Блэку, 1 поверхность)", category: "therapy", uetValue: 1.00 },
	{ code: "A16.07.002.002", serviceName: "Наложение пломбы из композита (II, III класс по Блэку, 2 поверхности)", category: "therapy", uetValue: 1.50 },
	{ code: "A16.07.002.003", serviceName: "Наложение пломбы / реставрация (IV класс, 3+ поверхности)", category: "therapy", uetValue: 2.25 },
	{ code: "A16.07.002.004", serviceName: "Эстетическое восстановление анатомической формы зуба (виниринг/наращивание)", category: "therapy", uetValue: 3.00 },
	{ code: "A16.07.002.005", serviceName: "Пломбирование из стеклоиономерного цемента (СИЦ)", category: "therapy", uetValue: 0.75 },
	{ code: "A16.07.057", serviceName: "Запечатывание фиссуры одного зуба герметиком", category: "therapy", uetValue: 0.50 },

	// Эндодонтия (пульпит, периодонтит)
	{ code: "A16.07.030.001", serviceName: "Эндодонтическое лечение 1-канального зуба (экстирпация + пломбирование)", category: "endodontics", uetValue: 2.50 },
	{ code: "A16.07.030.002", serviceName: "Эндодонтическое лечение 2-канального зуба", category: "endodontics", uetValue: 3.50 },
	{ code: "A16.07.030.003", serviceName: "Эндодонтическое лечение 3-канального зуба", category: "endodontics", uetValue: 4.50 },
	{ code: "A16.07.030.004", serviceName: "Эндодонтическое лечение 4-канального зуба", category: "endodontics", uetValue: 5.50 },
	{ code: "A16.07.082", serviceName: "Распломбирование одного корневого канала (паста/гуттаперча)", category: "endodontics", uetValue: 1.25 },
	{ code: "A16.07.082.001", serviceName: "Распломбирование одного корневого канала (цемент/резорцин)", category: "endodontics", uetValue: 2.00 },
	{ code: "A16.07.091", serviceName: "Временное пломбирование канала лечебной пастой на основе Ca(OH)2", category: "endodontics", uetValue: 0.75 },

	// Профессиональная гигиена и пародонтология
	{ code: "A16.07.051", serviceName: "Профессиональная гигиена полости рта (ультразвук + Air-Flow + полировка, все зубы)", category: "hygiene_perio", uetValue: 3.00 },
	{ code: "A16.07.020", serviceName: "Удаление над- и поддесневых зубных отложений (в области 1 зуба ультразвуком)", category: "hygiene_perio", uetValue: 0.15 },
	{ code: "A16.07.039", serviceName: "Закрытый кюретаж пародонтального кармана (в области 1 зуба)", category: "hygiene_perio", uetValue: 0.50 },
	{ code: "A16.07.019", serviceName: "Вскрытие пародонтального абсцесса", category: "hygiene_perio", uetValue: 1.00 },

	// Хирургия
	{ code: "A16.07.001.001", serviceName: "Простое удаление постоянного зуба (элеватором/щипцами)", category: "surgery", uetValue: 1.00 },
	{ code: "A16.07.001.002", serviceName: "Сложное удаление зуба с разъединением корней и альвеолотомией", category: "surgery", uetValue: 2.00 },
	{ code: "A16.07.001.003", serviceName: "Удаление ретинированного / дистопированного зуба (в т.ч. 8-го)", category: "surgery", uetValue: 3.50 },
	{ code: "A16.07.007", serviceName: "Резекция верхушки корня (с цистэктомией)", category: "surgery", uetValue: 3.00 },
	{ code: "A16.07.011", serviceName: "Вскрытие поднадкостничного абсцесса (периостотомия)", category: "surgery", uetValue: 1.25 },
	{ code: "A16.07.042", serviceName: "Пластика уздечки губы / языка (френулопластика)", category: "surgery", uetValue: 2.00 },
	{ code: "A16.07.054", serviceName: "Установка дентального имплантата (хирургический этап)", category: "surgery", uetValue: 4.00 },

	// Ортопедия и ортодонтия
	{ code: "A16.07.004", serviceName: "Препарирование и снятие оттиска под искусственную коронку", category: "prosthetics", uetValue: 2.00 },
	{ code: "A16.07.005", serviceName: "Припасовка и фиксация искусственной коронки / винира", category: "prosthetics", uetValue: 0.75 },
	{ code: "A16.07.023", serviceName: "Изготовление культевой штифтовой вкладки (этап)", category: "prosthetics", uetValue: 1.50 },
	{ code: "A16.07.048", serviceName: "Активация и коррекция ортодонтического аппарата / смена дуги", category: "orthodontics", uetValue: 1.50 },
	{ code: "A16.07.047", serviceName: "Фиксация брекет-системы на один зубной ряд", category: "orthodontics", uetValue: 4.50 },
];

/** Агрегированный раздел манипуляций за отчетный период */
export const consolidatedSection039uSchema = z.object({
	// Посещения
	visitsTotal: z.number().int().min(0).default(0),
	visitsAdults: z.number().int().min(0).default(0),
	visitsChildrenUnder14: z.number().int().min(0).default(0),
	visitsAdolescents15_17: z.number().int().min(0).default(0),
	visitsPrimary: z.number().int().min(0).default(0),
	visitsRepeat: z.number().int().min(0).default(0),
	visitsPreventativeExam: z.number().int().min(0).default(0),
	// Санация
	sanatedTotal: z.number().int().min(0).default(0),
	sanatedAdults: z.number().int().min(0).default(0),
	sanatedChildren: z.number().int().min(0).default(0),
	// Терапия
	fillingsCariesTotal: z.number().int().min(0).default(0),
	fillingsCompositePhotopolymer: z.number().int().min(0).default(0),
	fillingsGlassIonomer: z.number().int().min(0).default(0),
	pulpitisTreatedTotal: z.number().int().min(0).default(0),
	periodontitisTreatedTotal: z.number().int().min(0).default(0),
	canalsFilledTotal: z.number().int().min(0).default(0),
	hygieneProceduresTotal: z.number().int().min(0).default(0),
	// Хирургия
	extractionsSimple: z.number().int().min(0).default(0),
	extractionsComplex: z.number().int().min(0).default(0),
	extractionsImpactedWisdom: z.number().int().min(0).default(0),
	outpatientOperationsCount: z.number().int().min(0).default(0),
	implantsInstalledCount: z.number().int().min(0).default(0),
	// Ортопедия и ортодонтия
	crownsDeliveredCount: z.number().int().min(0).default(0),
	bridgesDeliveredCount: z.number().int().min(0).default(0),
	removableDenturesCount: z.number().int().min(0).default(0),
	orthodonticAdjustmentsCount: z.number().int().min(0).default(0),
	// Анестезия и рентген
	anesthesiaInfiltrationCount: z.number().int().min(0).default(0),
	anesthesiaConductionCount: z.number().int().min(0).default(0),
	radiographsCount: z.number().int().min(0).default(0),
});
export type ConsolidatedSection039u = z.infer<typeof consolidatedSection039uSchema>;

/** Сводный расчет УЕТ по направлениям */
export const uetSummaryBreakdownSchema = z.object({
	uetTherapy: z.number().min(0).default(0),
	uetEndodontics: z.number().min(0).default(0),
	uetSurgery: z.number().min(0).default(0),
	uetHygieneAndPerio: z.number().min(0).default(0),
	uetProsthetics: z.number().min(0).default(0),
	uetOrthodontics: z.number().min(0).default(0),
	uetAnesthesiaAndDiagnostics: z.number().min(0).default(0),
	totalUetAccumulated: z.number().min(0).default(0),
	periodStandardQuotaUet: z.number().min(0).default(441.0), // 21 смена * 21.0 УЕТ = 441.0 УЕТ
	planExecutionPercentage: z.number().min(0).default(100.0),
});
export type UetSummaryBreakdown = z.infer<typeof uetSummaryBreakdownSchema>;

/** Полный структурированный Payload формы № 039/у-88 */
export const summaryDentistStatement039uPayloadSchema = z.object({
	formNumber: z.literal("039/у-88"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicDepartment: z.string().trim().max(120).default("Стоматологическое отделение"),
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог-терапевт"),
	reportingPeriodMonthYear: z.string().trim().min(4).max(32), // например "Май 2026 г." или "2026-05"
	workingDaysCount: z.number().int().min(1).max(31).default(21),
	workingHoursCount: z.number().min(1).max(250).default(138.6), // 21 день * 6.6 ч
	consolidatedMetrics: consolidatedSection039uSchema.default({
		visitsTotal: 0,
		visitsAdults: 0,
		visitsChildrenUnder14: 0,
		visitsAdolescents15_17: 0,
		visitsPrimary: 0,
		visitsRepeat: 0,
		visitsPreventativeExam: 0,
		sanatedTotal: 0,
		sanatedAdults: 0,
		sanatedChildren: 0,
		fillingsCariesTotal: 0,
		fillingsCompositePhotopolymer: 0,
		fillingsGlassIonomer: 0,
		pulpitisTreatedTotal: 0,
		periodontitisTreatedTotal: 0,
		canalsFilledTotal: 0,
		hygieneProceduresTotal: 0,
		extractionsSimple: 0,
		extractionsComplex: 0,
		extractionsImpactedWisdom: 0,
		outpatientOperationsCount: 0,
		implantsInstalledCount: 0,
		crownsDeliveredCount: 0,
		bridgesDeliveredCount: 0,
		removableDenturesCount: 0,
		orthodonticAdjustmentsCount: 0,
		anesthesiaInfiltrationCount: 0,
		anesthesiaConductionCount: 0,
		radiographsCount: 0,
	}),
	uetBreakdown: uetSummaryBreakdownSchema.default({
		uetTherapy: 0,
		uetEndodontics: 0,
		uetSurgery: 0,
		uetHygieneAndPerio: 0,
		uetProsthetics: 0,
		uetOrthodontics: 0,
		uetAnesthesiaAndDiagnostics: 0,
		totalUetAccumulated: 0,
		periodStandardQuotaUet: 441.0,
		planExecutionPercentage: 0,
	}),
	chiefDoctorNotes: z.string().trim().max(1000).nullable().optional(),
});
export type SummaryDentistStatement039uPayload = z.infer<typeof summaryDentistStatement039uPayloadSchema>;
