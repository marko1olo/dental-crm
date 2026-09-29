/**
 * Clinic Onboarding & Rapid Launch Wizard Constants
 * DENTE Dental CRM — Mandates 8e (Doctor Autonomy), 8k (Friction Killer), 8n (Solo Doctor Sovereignty)
 */

import type {
	ClinicOperationalMode,
	DentalChairDraft,
	ClinicScheduleDraft,
	OnboardingWizardStep,
	StarterDentalService,
} from "./types.js";

export interface OnboardingStepMeta {
	readonly id: OnboardingWizardStep;
	readonly stepNumber: number;
	readonly title: string;
	readonly subtitle: string;
	readonly description: string;
}

export const ONBOARDING_WIZARD_STEPS: readonly OnboardingStepMeta[] = [
	{
		id: "clinic_profile",
		stepNumber: 1,
		title: "Профиль и Режим",
		subtitle: "Тип клиники и часовой пояс",
		description: "Настройка профиля, операционного режима и временной зоны без бюрократии",
	},
	{
		id: "chairs_schedule",
		stepNumber: 2,
		title: "Кресла и График",
		subtitle: "Установки и часы приёма",
		description: "Стоматологические кресла и стандартные рабочие часы по умолчанию 09:00–20:00",
	},
	{
		id: "starter_pricelist",
		stepNumber: 3,
		title: "Стартовый Прайс",
		subtitle: "15 ключевых услуг 804н",
		description: "1-клик сидирование прейскуранта с честными ценами в рублях и копейках",
	},
] as const;

export interface ClinicModeMeta {
	readonly id: ClinicOperationalMode;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly detail: string;
	readonly recommendedChairs: number;
	readonly defaultChairs: readonly string[];
}

export const CLINIC_OPERATIONAL_MODES: readonly ClinicModeMeta[] = [
	{
		id: "solo_doctor",
		title: "Соло-врач (Аренда / Частный кабинет)",
		shortTitle: "Соло-врач",
		badge: "Главный фокус",
		detail: "Врач ведёт приём один или с ассистентом. 0-клик касса 54-ФЗ, без обязательного ассистента в сетке, тихая телефония, максимальная скорость.",
		recommendedChairs: 1,
		defaultChairs: ["Кресло 1 (Терапия)"],
	},
	{
		id: "one_chair",
		title: "Кабинет на 1 кресло",
		shortTitle: "1 кресло",
		badge: "Компакт",
		detail: "Одна установка, посменный приём терапевта и ортопеда, базовая касса и расписание без сетевого шума.",
		recommendedChairs: 1,
		defaultChairs: ["Кабинет 1 (Универсальный)"],
	},
	{
		id: "small_clinic",
		title: "Небольшая клиника (2–3 кресла)",
		shortTitle: "2–3 кресла",
		badge: "Оптимально",
		detail: "Терапевтический и хирургический приёмы, ресепшен, стерилизация по СанПиН 3.3686-21, семейный баланс.",
		recommendedChairs: 2,
		defaultChairs: ["Кресло 1 (Терапия)", "Кресло 2 (Хирургия)"],
	},
	{
		id: "network_clinic",
		title: "Клиника / Сеть (от 4 кресел)",
		shortTitle: "Сеть клиник",
		badge: "На вырост",
		detail: "Многокресельное расписание, складской учёт, интеграции с лабораторией (ЗТЛ), расширенная аналитика.",
		recommendedChairs: 4,
		defaultChairs: ["Кресло 1 (Терапия)", "Кресло 2 (Хирургия)", "Кресло 3 (Ортопедия)", "Кресло 4 (Ортодонтия)"],
	},
] as const;

export const DEFAULT_CHAIRS: readonly DentalChairDraft[] = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		specialty: "therapist",
		isDefault: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		specialty: "surgeon",
		isDefault: false,
	},
];

export const DEFAULT_SCHEDULE_DRAFT: ClinicScheduleDraft = {
	workdayStart: "09:00",
	workdayEnd: "20:00",
	workingDays: [1, 2, 3, 4, 5, 6], // Пн–Сб (1=Пн ... 6=Сб, 0=Вс)
	defaultVisitMinutes: 30,
	appointmentBufferMinutes: 5,
};

export const DEFAULT_CLINIC_TIMEZONE = "Europe/Moscow";

export interface TimezoneOption {
	readonly value: string;
	readonly label: string;
	readonly offsetLabel: string;
}

export const RUSSIAN_TIMEZONES: readonly TimezoneOption[] = [
	{ value: "Europe/Kaliningrad", label: "Калининград (MSK-1)", offsetLabel: "UTC+2" },
	{ value: "Europe/Moscow", label: "Москва, Санкт-Петербург (MSK)", offsetLabel: "UTC+3" },
	{ value: "Europe/Samara", label: "Самара, Ижевск (MSK+1)", offsetLabel: "UTC+4" },
	{ value: "Asia/Yekaterinburg", label: "Екатеринбург, Тюмень (MSK+2)", offsetLabel: "UTC+5" },
	{ value: "Asia/Omsk", label: "Омск (MSK+3)", offsetLabel: "UTC+6" },
	{ value: "Asia/Krasnoyarsk", label: "Красноярск, Новосибирск (MSK+4)", offsetLabel: "UTC+7" },
	{ value: "Asia/Irkutsk", label: "Иркутск (MSK+5)", offsetLabel: "UTC+8" },
	{ value: "Asia/Yakutsk", label: "Якутск (MSK+6)", offsetLabel: "UTC+9" },
	{ value: "Asia/Vladivostok", label: "Владивосток, Хабаровск (MSK+7)", offsetLabel: "UTC+10" },
	{ value: "Asia/Magadan", label: "Магадан, Сахалин (MSK+8)", offsetLabel: "UTC+11" },
	{ value: "Asia/Kamchatka", label: "Петропавловск-Камчатский (MSK+9)", offsetLabel: "UTC+12" },
] as const;

export const WEEKDAY_LABELS: readonly { value: number; label: string; shortLabel: string }[] = [
	{ value: 1, label: "Понедельник", shortLabel: "Пн" },
	{ value: 2, label: "Вторник", shortLabel: "Вт" },
	{ value: 3, label: "Среда", shortLabel: "Ср" },
	{ value: 4, label: "Четверг", shortLabel: "Чт" },
	{ value: 5, label: "Пятница", shortLabel: "Пт" },
	{ value: 6, label: "Суббота", shortLabel: "Сб" },
	{ value: 0, label: "Воскресенье", shortLabel: "Вс" },
] as const;

/**
 * 15 ESSENTIAL DENTAL SERVICES (Номенклатура 804н)
 * С честными ценами в рублях и точных целочисленных копейках (Мандат 8b: копеечная точность).
 */
export const STARTER_15_ESSENTIAL_DENTAL_SERVICES: readonly StarterDentalService[] = [
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "consultation",
		specialty: "therapist",
		priceRub: 1000,
		priceKopecks: 100000,
		durationMinutes: 30,
		taxDeductible: true,
		description: "Клинический осмотр, заполнение зубной формулы по Форме 043/у, составление плана лечения",
	},
	{
		code: "A11.07.012",
		title: "Анестезия местная карпульная инфильтрационная",
		category: "therapy",
		specialty: "therapist",
		priceRub: 950,
		priceKopecks: 95000,
		durationMinutes: 15,
		taxDeductible: true,
		description: "Введение карпульного анестетика (артикаин 1:100 000 / 1:200 000) с одноразовой иглой",
	},
	{
		code: "A11.07.010",
		title: "Анестезия местная карпульная проводниковая (мандибулярная / торусальная)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 1100,
		priceKopecks: 110000,
		durationMinutes: 15,
		taxDeductible: true,
		description: "Блокада нижнеальвеолярного нерва для обезболивания нижних моляров и премоляров",
	},
	{
		code: "A16.07.002.009",
		title: "Наложение коффердама (изоляция операционного поля раббердамом)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 650,
		priceKopecks: 65000,
		durationMinutes: 15,
		taxDeductible: true,
		description: "Абсолютная изоляция зуба от ротовой жидкости для адгезивного протокола",
	},
	{
		code: "A16.07.002.010",
		title: "Восстановление зуба пломбой: лечение поверхностного кариеса",
		category: "therapy",
		specialty: "therapist",
		priceRub: 3500,
		priceKopecks: 350000,
		durationMinutes: 30,
		taxDeductible: true,
		description: "Препарирование эмали, адгезивная подготовка, светоотверждаемый композит",
	},
	{
		code: "A16.07.002.011",
		title: "Восстановление зуба пломбой: лечение среднего кариеса",
		category: "therapy",
		specialty: "therapist",
		priceRub: 4200,
		priceKopecks: 420000,
		durationMinutes: 45,
		taxDeductible: true,
		description: "Некрэктомия дентина, спиртовой адгезивный протокол, послойная полимеризация",
	},
	{
		code: "A16.07.002.012",
		title: "Лечение глубокого кариеса с наложением изолирующей лечебной прокладки",
		category: "therapy",
		specialty: "therapist",
		priceRub: 4800,
		priceKopecks: 480000,
		durationMinutes: 45,
		taxDeductible: true,
		description: "Сохранение витальности пульпы, прокладка на основе МТА/гидроксида кальция + композит",
	},
	{
		code: "A16.07.002.001",
		title: "Пломбирование зуба светоотверждаемым композитом (эстетическая реставрация)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 3800,
		priceKopecks: 380000,
		durationMinutes: 45,
		taxDeductible: true,
		description: "Восстановление анатомической формы, фиссур и окклюзионных контактов I, V, VI класс",
	},
	{
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала (1 канал)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 2100,
		priceKopecks: 210000,
		durationMinutes: 30,
		taxDeductible: true,
		description: "Механическая очистка Ni-Ti ротационными файлами, промывание гипохлоритом натрия",
	},
	{
		code: "A16.07.008.001",
		title: "Пломбирование корневого канала гуттаперчей (латеральная конденсация)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 1900,
		priceKopecks: 190000,
		durationMinutes: 30,
		taxDeductible: true,
		description: "Герметичная 3D-обтурация корневого канала эпоксидным силером и гуттаперчевыми штифтами",
	},
	{
		code: "A16.07.001.001",
		title: "Удаление постоянного зуба простое (щипцами / элеватором)",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 2500,
		priceKopecks: 250000,
		durationMinutes: 30,
		taxDeductible: true,
		description: "Атравматичная люксация и экстракция подвижного или однокорневого зуба, ревизия лунки",
	},
	{
		code: "A16.07.001.002",
		title: "Удаление зуба сложное с разъединением корней (альвеолотомия)",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 4500,
		priceKopecks: 450000,
		durationMinutes: 45,
		taxDeductible: true,
		description: "Фрагментация корней бором, кюретаж лунки, наложение гемостатической губки и шва",
	},
	{
		code: "A16.07.001.003",
		title: "Удаление ретинированного / дистопированного зуба мудрости",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 7500,
		priceKopecks: 750000,
		durationMinutes: 60,
		taxDeductible: true,
		description: "Хирургический доступ, остеотомия, удаление зуба 18/28/38/48, ушивание раны",
	},
	{
		code: "A16.07.051",
		title: "Профессиональная комплексная гигиена полости рта (Air-Flow + ультразвук)",
		category: "hygiene",
		specialty: "hygienist",
		priceRub: 4500,
		priceKopecks: 450000,
		durationMinutes: 60,
		taxDeductible: true,
		description: "Снятие над- и поддесневого камня ультразвуком, снятие пигментного налета Air-Flow, фторирование",
	},
	{
		code: "A06.07.007",
		title: "Внутриротовая контактная радиовизиография (диагностический прицельный снимок)",
		category: "imaging",
		specialty: "universal",
		priceRub: 600,
		priceKopecks: 60000,
		durationMinutes: 10,
		taxDeductible: true,
		description: "Цифровой радиовизиографический снимок с минимальной лучевой нагрузкой",
	},
] as const;
