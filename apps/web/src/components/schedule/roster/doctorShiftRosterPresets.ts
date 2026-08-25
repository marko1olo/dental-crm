/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster Presets
 * Compliance: TK RF Article 350 (33-hour medical workweek) & 2026 Production Calendar
 */

export type MedicalStaffRole =
	| "therapist"
	| "surgeon"
	| "orthopedist"
	| "orthodontist"
	| "pediatric"
	| "hygienist"
	| "assistant";

export type ShiftArchetypeId =
	| "morning_shift"
	| "evening_shift"
	| "saturday_shift"
	| "sunday_duty"
	| "night_duty"
	| "day_off"
	| "sick_leave"
	| "vacation";

export type T13TimeCode = "Я" | "Н" | "В" | "Б" | "ОТ" | "Р" | "ПР";

export interface ShiftArchetype {
	id: ShiftArchetypeId;
	name: string;
	shortName: string;
	startTime: string;
	endTime: string;
	durationHours: number;
	breakMinutes: number;
	isNight: boolean;
	nightHours: number;
	nightMultiplier: number;
	color: string;
	t13Code: T13TimeCode;
	description: string;
}

export interface StaffRoleDefinition {
	role: MedicalStaffRole;
	code: string;
	nameRu: string;
	isDoctor: boolean;
	isAssistant: boolean;
	standardWeeklyHours: number;
	requiresAssistant: boolean;
}

export interface CabinetDefinition {
	id: string;
	number: number;
	name: string;
	specialty: string;
	chairs: Array<{
		id: string;
		name: string;
		equipment: string;
	}>;
}

export interface StaffMember {
	id: string;
	fullName: string;
	shortName: string;
	role: MedicalStaffRole;
	tabNumber: string;
	isDoctor: boolean;
	isAssistant: boolean;
	preferredChairId?: string;
	defaultAssistantId?: string;
	weeklyHourLimit: number;
	avatarColor: string;
}

export interface MonthProductionCalendarNorm2026 {
	month: number;
	nameRu: string;
	workingDays: number;
	preHolidayDays: number;
	holidaysAndWeekends: number;
	normHours33: number;
	normHours39: number;
	normHours40: number;
}

/**
 * Standard shift archetypes compliant with Russian healthcare labor standards
 */
export const SHIFT_ARCHETYPES: Record<ShiftArchetypeId, ShiftArchetype> = {
	morning_shift: {
		id: "morning_shift",
		name: "Утренняя смена (6.0 ч)",
		shortName: "Утро",
		startTime: "08:30",
		endTime: "14:30",
		durationHours: 6.0,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#0284c7",
		t13Code: "Я",
		description: "08:30–14:30 — Базовая утренняя смена врача (норма 33 ч/нед)",
	},
	evening_shift: {
		id: "evening_shift",
		name: "Вечерняя смена (6.0 ч)",
		shortName: "Вечер",
		startTime: "14:30",
		endTime: "20:30",
		durationHours: 6.0,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#d97706",
		t13Code: "Я",
		description: "14:30–20:30 — Вторая смена приема пациентов",
	},
	saturday_shift: {
		id: "saturday_shift",
		name: "Субботняя смена (7.0 ч)",
		shortName: "Суббота",
		startTime: "09:00",
		endTime: "17:00",
		durationHours: 7.0,
		breakMinutes: 60,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#7c3aed",
		t13Code: "Я",
		description: "09:00–17:00 (8 ч с обедом 1 час / 7.0 раб. часов)",
	},
	sunday_duty: {
		id: "sunday_duty",
		name: "Воскресное дежурство (6.0 ч)",
		shortName: "Дежурство",
		startTime: "10:00",
		endTime: "16:00",
		durationHours: 6.0,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#0d9488",
		t13Code: "Я",
		description: "10:00–16:00 — Дежурный прием по острой боли и неотложной помощи",
	},
	night_duty: {
		id: "night_duty",
		name: "Ночное дежурство (12.0 ч / x1.2)",
		shortName: "Ночь",
		startTime: "20:00",
		endTime: "08:00",
		durationHours: 12.0,
		breakMinutes: 60,
		isNight: true,
		nightHours: 8.0, // 22:00 to 06:00 per TK RF art. 96
		nightMultiplier: 1.2,
		color: "#334155",
		t13Code: "Н",
		description: "20:00–08:00 — Круглосуточная неотложная служба (ночная надбавка 20%)",
	},
	day_off: {
		id: "day_off",
		name: "Выходной день",
		shortName: "Выходной",
		startTime: "",
		endTime: "",
		durationHours: 0,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#94a3b8",
		t13Code: "В",
		description: "Плановый выходной день по графику сменности",
	},
	sick_leave: {
		id: "sick_leave",
		name: "Листок нетрудоспособности",
		shortName: "Больничный",
		startTime: "",
		endTime: "",
		durationHours: 0,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#ef4444",
		t13Code: "Б",
		description: "Временная нетрудоспособность (ЭЛН ФСС)",
	},
	vacation: {
		id: "vacation",
		name: "Ежегодный отпуск",
		shortName: "Отпуск",
		startTime: "",
		endTime: "",
		durationHours: 0,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		nightMultiplier: 1.0,
		color: "#10b981",
		t13Code: "ОТ",
		description: "Ежегодный основной оплачиваемый отпуск",
	},
};

/**
 * Medical staff roles and labor requirements
 */
export const MEDICAL_STAFF_ROLES: Record<MedicalStaffRole, StaffRoleDefinition> = {
	therapist: {
		role: "therapist",
		code: "ВСТ",
		nameRu: "Врач стоматолог-терапевт",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: false,
	},
	surgeon: {
		role: "surgeon",
		code: "ВСХ",
		nameRu: "Врач стоматолог-хирург / имплантолог",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: true, // Surgery strictly requires dedicated assistant
	},
	orthopedist: {
		role: "orthopedist",
		code: "ВСО",
		nameRu: "Врач стоматолог-ортопед",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: true,
	},
	orthodontist: {
		role: "orthodontist",
		code: "ВОР",
		nameRu: "Врач-ортодонт",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: false,
	},
	pediatric: {
		role: "pediatric",
		code: "ДВС",
		nameRu: "Детский врач-стоматолог",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: true,
	},
	hygienist: {
		role: "hygienist",
		code: "ГС",
		nameRu: "Гигиенист стоматологический",
		isDoctor: false,
		isAssistant: false,
		standardWeeklyHours: 39,
		requiresAssistant: false,
	},
	assistant: {
		role: "assistant",
		code: "МСА",
		nameRu: "Ассистент врача / Медсестра",
		isDoctor: false,
		isAssistant: true,
		standardWeeklyHours: 39,
		requiresAssistant: false,
	},
};

/**
 * Cabinets catalog in a multi-specialty dental clinic
 */
export const CLINIC_CABINETS_CATALOG: CabinetDefinition[] = [
	{
		id: "cab-1",
		number: 1,
		name: "Кабинет 1 (Терапия и эндодонтия)",
		specialty: "Терапия",
		chairs: [
			{ id: "chair-1a", name: "Кресло 1А (A-dec 500)", equipment: "Микроскоп Leica M320, Эндомотор" },
			{ id: "chair-1b", name: "Кресло 1Б (Stern Weber)", equipment: "УЗ-скейлер, Бинокуляры" },
		],
	},
	{
		id: "cab-2",
		number: 2,
		name: "Кабинет 2 (Хирургия и имплантация)",
		specialty: "Хирургия",
		chairs: [
			{ id: "chair-2", name: "Кресло 2 (KaVo ESTETICA E80)", equipment: "Физиодиспенсер NSK, Пьезотом" },
		],
	},
	{
		id: "cab-3",
		number: 3,
		name: "Кабинет 3 (Ортопедия и гнатология)",
		specialty: "Ортопедия",
		chairs: [
			{ id: "chair-3", name: "Кресло 3 (Planmeca Compact i5)", equipment: "Интраоральный сканер 3Shape TRIOS" },
		],
	},
	{
		id: "cab-4",
		number: 4,
		name: "Кабинет 4 (Детский и ортодонтия)",
		specialty: "Детство и ортодонтия",
		chairs: [
			{ id: "chair-4", name: "Кресло 4 (Dentsply Sirona Intego)", equipment: "Закись азота седация, Экран" },
		],
	},
];

/**
 * Russian Production Calendar for 2026 (Производственный календарь РФ на 2026 год)
 * Statutory standard for 33-hour medical workweek (ст. 350 ТК РФ: 6.6 ч/день, -1ч в предпраздничные дни)
 */
export const RUSSIAN_PRODUCTION_CALENDAR_2026: Record<number, MonthProductionCalendarNorm2026> = {
	1: {
		month: 1,
		nameRu: "Январь",
		workingDays: 15,
		preHolidayDays: 0,
		holidaysAndWeekends: 16,
		normHours33: 99.0, // 15 * 6.6
		normHours39: 117.0, // 15 * 7.8
		normHours40: 120.0, // 15 * 8.0
	},
	2: {
		month: 2,
		nameRu: "Февраль",
		workingDays: 19,
		preHolidayDays: 1, // 20 фев
		holidaysAndWeekends: 9,
		normHours33: 124.4, // 19 * 6.6 - 1
		normHours39: 147.2, // 19 * 7.8 - 1
		normHours40: 151.0, // 19 * 8.0 - 1
	},
	3: {
		month: 3,
		nameRu: "Март",
		workingDays: 21,
		preHolidayDays: 0,
		holidaysAndWeekends: 10,
		normHours33: 138.6, // 21 * 6.6
		normHours39: 163.8, // 21 * 7.8
		normHours40: 168.0, // 21 * 8.0
	},
	4: {
		month: 4,
		nameRu: "Апрель",
		workingDays: 22,
		preHolidayDays: 1, // 30 апр
		holidaysAndWeekends: 8,
		normHours33: 144.2, // 22 * 6.6 - 1
		normHours39: 170.6, // 22 * 7.8 - 1
		normHours40: 175.0, // 22 * 8.0 - 1
	},
	5: {
		month: 5,
		nameRu: "Май",
		workingDays: 19,
		preHolidayDays: 1, // 8 мая
		holidaysAndWeekends: 12,
		normHours33: 124.4, // 19 * 6.6 - 1
		normHours39: 147.2, // 19 * 7.8 - 1
		normHours40: 151.0, // 19 * 8.0 - 1
	},
	6: {
		month: 6,
		nameRu: "Июнь",
		workingDays: 21,
		preHolidayDays: 1, // 11 июня
		holidaysAndWeekends: 9,
		normHours33: 137.6, // 21 * 6.6 - 1
		normHours39: 162.8, // 21 * 7.8 - 1
		normHours40: 167.0, // 21 * 8.0 - 1
	},
	7: {
		month: 7,
		nameRu: "Июль",
		workingDays: 23,
		preHolidayDays: 0,
		holidaysAndWeekends: 8,
		normHours33: 151.8, // 23 * 6.6
		normHours39: 179.4, // 23 * 7.8
		normHours40: 184.0, // 23 * 8.0
	},
	8: {
		month: 8,
		nameRu: "Август",
		workingDays: 21,
		preHolidayDays: 0,
		holidaysAndWeekends: 10,
		normHours33: 138.6, // 21 * 6.6
		normHours39: 163.8, // 21 * 7.8
		normHours40: 168.0, // 21 * 8.0
	},
	9: {
		month: 9,
		nameRu: "Сентябрь",
		workingDays: 22,
		preHolidayDays: 0,
		holidaysAndWeekends: 8,
		normHours33: 145.2, // 22 * 6.6
		normHours39: 171.6, // 22 * 7.8
		normHours40: 176.0, // 22 * 8.0
	},
	10: {
		month: 10,
		nameRu: "Октябрь",
		workingDays: 22,
		preHolidayDays: 0,
		holidaysAndWeekends: 9,
		normHours33: 145.2, // 22 * 6.6
		normHours39: 171.6, // 22 * 7.8
		normHours40: 176.0, // 22 * 8.0
	},
	11: {
		month: 11,
		nameRu: "Ноябрь",
		workingDays: 20,
		preHolidayDays: 1, // 3 ноя
		holidaysAndWeekends: 10,
		normHours33: 131.0, // 20 * 6.6 - 1
		normHours39: 155.0, // 20 * 7.8 - 1
		normHours40: 159.0, // 20 * 8.0 - 1
	},
	12: {
		month: 12,
		nameRu: "Декабрь",
		workingDays: 22,
		preHolidayDays: 1, // 31 дек
		holidaysAndWeekends: 9,
		normHours33: 144.2, // 22 * 6.6 - 1
		normHours39: 170.6, // 22 * 7.8 - 1
		normHours40: 175.0, // 22 * 8.0 - 1
	},
};

/**
 * Standard annual totals for 2026
 */
export const ANNUAL_NORM_TOTALS_2026 = {
	totalWorkDays: 247,
	totalPreHolidayDays: 6,
	totalWeekendsAndHolidays: 118,
	totalNormHours33: 1624.2, // 247 * 6.6 - 6
	totalNormHours39: 1920.6, // 247 * 7.8 - 6
	totalNormHours40: 1970.0, // 247 * 8.0 - 6
	averageMonthlyNormHours33: 135.35,
};

/**
 * Default sample staff roster for initial state
 */
export const DEFAULT_CLINIC_STAFF: StaffMember[] = [
	{
		id: "doc-smirnov",
		fullName: "Смирнов Алексей Павлович",
		shortName: "Д-р Смирнов А.П.",
		role: "therapist",
		tabNumber: "00101",
		isDoctor: true,
		isAssistant: false,
		preferredChairId: "chair-1a",
		defaultAssistantId: "asst-ivanova",
		weeklyHourLimit: 33,
		avatarColor: "#0284c7",
	},
	{
		id: "doc-volkov",
		fullName: "Волков Сергей Владимирович",
		shortName: "Д-р Волков С.В.",
		role: "surgeon",
		tabNumber: "00102",
		isDoctor: true,
		isAssistant: false,
		preferredChairId: "chair-2",
		defaultAssistantId: "asst-kovaleva",
		weeklyHourLimit: 33,
		avatarColor: "#dc2626",
	},
	{
		id: "doc-kuznetsova",
		fullName: "Кузнецова Екатерина Михайловна",
		shortName: "Д-р Кузнецова Е.М.",
		role: "orthopedist",
		tabNumber: "00103",
		isDoctor: true,
		isAssistant: false,
		preferredChairId: "chair-3",
		defaultAssistantId: "asst-sokolova",
		weeklyHourLimit: 33,
		avatarColor: "#7c3aed",
	},
	{
		id: "doc-lebedeva",
		fullName: "Лебедева Ольга Игоревна",
		shortName: "Д-р Лебедева О.И.",
		role: "orthodontist",
		tabNumber: "00104",
		isDoctor: true,
		isAssistant: false,
		preferredChairId: "chair-4",
		defaultAssistantId: "asst-ivanova",
		weeklyHourLimit: 33,
		avatarColor: "#0d9488",
	},
	{
		id: "doc-mikhailova",
		fullName: "Михайлова Анна Викторовна",
		shortName: "Д-р Михайлова А.В.",
		role: "pediatric",
		tabNumber: "00105",
		isDoctor: true,
		isAssistant: false,
		preferredChairId: "chair-4",
		defaultAssistantId: "asst-kovaleva",
		weeklyHourLimit: 33,
		avatarColor: "#ea580c",
	},
	{
		id: "asst-ivanova",
		fullName: "Иванова Мария Александровна",
		shortName: "Медсестра Иванова М.А.",
		role: "assistant",
		tabNumber: "00201",
		isDoctor: false,
		isAssistant: true,
		weeklyHourLimit: 39,
		avatarColor: "#059669",
	},
	{
		id: "asst-kovaleva",
		fullName: "Ковалева Татьяна Николаевна",
		shortName: "Медсестра Ковалева Т.Н.",
		role: "assistant",
		tabNumber: "00202",
		isDoctor: false,
		isAssistant: true,
		weeklyHourLimit: 39,
		avatarColor: "#4f46e5",
	},
	{
		id: "asst-sokolova",
		fullName: "Соколова Дарья Сергеевна",
		shortName: "Медсестра Соколова Д.С.",
		role: "assistant",
		tabNumber: "00203",
		isDoctor: false,
		isAssistant: true,
		weeklyHourLimit: 39,
		avatarColor: "#d97706",
	},
];
