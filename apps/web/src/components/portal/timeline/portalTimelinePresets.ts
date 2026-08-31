/**
 * Patient Mobile Portal Presets, Plain-Language Statuses & Anatomical Mappings
 * (DOMAIN: PORTAL TIMELINE)
 *
 * Понятные и дружелюбные клинические описания для пациента без сложной терминологии,
 * карта зубов FDI с анатомическими секторами и эталонный профиль пациента.
 */

export type PatientFriendlyToothStatus =
	| "healthy_observed"
	| "caries_cured"
	| "endo_microscope"
	| "crown_zirconia"
	| "veneer_emax"
	| "implant_integrated"
	| "implant_crown_loaded"
	| "scheduled_treatment"
	| "missing_to_restore";

export interface PlainLanguageStatusInfo {
	readonly status: PatientFriendlyToothStatus;
	readonly titleRu: string;
	readonly shortBadge: string;
	readonly descriptionRu: string;
	readonly badgeClass: string;
	readonly icon: string;
	readonly colorHex: string;
}

export interface PatientToothAnatomyInfo {
	readonly toothFdi: string; // "1.1", "1.6", etc.
	readonly toothNumber: number;
	readonly quadrant: 1 | 2 | 3 | 4;
	readonly quadrantNameRu: string;
	readonly archRu: "Верхняя челюсть" | "Нижняя челюсть";
	readonly toothTypeRu: "Резец" | "Клык" | "Премоляр" | "Моляр";
	readonly friendlyNameRu: string;
}

/**
 * Словарь понятных пациенту стоматологических статусов.
 */
export const PLAIN_LANGUAGE_TOOTH_STATUSES: Readonly<
	Record<PatientFriendlyToothStatus, PlainLanguageStatusInfo>
> = {
	healthy_observed: {
		status: "healthy_observed",
		titleRu: "Здоровый зуб под наблюдением",
		shortBadge: "Здоров",
		descriptionRu: "Эмаль крепкая, признаков кариеса нет. Регулярная гигиена раз в 6 месяцев.",
		badgeClass: "badge-healthy",
		icon: "sparkles",
		colorHex: "#10b981", // Emerald Green
	},
	caries_cured: {
		status: "caries_cured",
		titleRu: "Кариес вылечен (световая пломба)",
		shortBadge: "Пломба",
		descriptionRu:
			"Установлена высокоэстетичная световая реставрация с точным восстановлением анатомических бугров.",
		badgeClass: "badge-cured",
		icon: "diamond",
		colorHex: "#06b6d4", // Cyan
	},
	endo_microscope: {
		status: "endo_microscope",
		titleRu: "Каналы пролечены под микроскопом",
		shortBadge: "Каналы запломбированы",
		descriptionRu:
			"Корневые каналы бережно очищены с оптическим увеличением 25x и герметично запечатаны.",
		badgeClass: "badge-endo",
		icon: "microscope",
		colorHex: "#8b5cf6", // Purple
	},
	crown_zirconia: {
		status: "crown_zirconia",
		titleRu: "Эстетическая коронка из диоксида циркония",
		shortBadge: "Циркониевая коронка",
		descriptionRu:
			"Сверхпрочная и неотличимая от своего зуба коронка из японского циркония Katana.",
		badgeClass: "badge-crown",
		icon: "crown",
		colorHex: "#f59e0b", // Amber
	},
	veneer_emax: {
		status: "veneer_emax",
		titleRu: "Керамический винир E.max",
		shortBadge: "Винир E.max",
		descriptionRu: "Ультратонкая керамическая накладка для идеальной формы и цвета улыбки.",
		badgeClass: "badge-veneer",
		icon: "smile",
		colorHex: "#ec4899", // Pink
	},
	implant_integrated: {
		status: "implant_integrated",
		titleRu: "Имплант успешно прижился",
		shortBadge: "Имплант прижился",
		descriptionRu:
			"Швейцарский/корейский титановый корень надежно интегрировался в костную ткань.",
		badgeClass: "badge-implant",
		icon: "implant",
		colorHex: "#0d9488", // DENTE Teal
	},
	implant_crown_loaded: {
		status: "implant_crown_loaded",
		titleRu: "Коронка на импланте зафиксирована",
		shortBadge: "Готовый зуб на импланте",
		descriptionRu: "Финальная винтовая фиксация циркониевой коронки. Функция зуба восстановлена на 100%.",
		badgeClass: "badge-loaded",
		icon: "shield",
		colorHex: "#14b8a6", // Teal
	},
	scheduled_treatment: {
		status: "scheduled_treatment",
		titleRu: "Запланировано лечение на приеме",
		shortBadge: "В плане",
		descriptionRu: "Зуб включен в текущий план реабилитации, лечение будет выполнено в ближайшие визиты.",
		badgeClass: "badge-scheduled",
		icon: "clock",
		colorHex: "#f97316", // Orange
	},
	missing_to_restore: {
		status: "missing_to_restore",
		titleRu: "Отсутствует (требуется восстановление)",
		shortBadge: "Отсутствует",
		descriptionRu: "Зуб удален ранее, рекомендована дентальная имплантация для защиты соседних зубов.",
		badgeClass: "badge-missing",
		icon: "circle",
		colorHex: "#64748b", // Slate
	},
};

/**
 * Получение анатомической информации по зубу FDI.
 */
export function getToothAnatomyInfo(toothFdiOrNumber: string | number): PatientToothAnatomyInfo {
	const num =
		typeof toothFdiOrNumber === "number"
			? toothFdiOrNumber
			: Number.parseInt(toothFdiOrNumber.replace(/\D/g, ""), 10) || 11;

	const quad = Math.floor(num / 10) as 1 | 2 | 3 | 4;
	const position = num % 10;

	let archRu: "Верхняя челюсть" | "Нижняя челюсть" = "Верхняя челюсть";
	let quadrantNameRu = "Верхний правый сектор";

	if (quad === 1) {
		archRu = "Верхняя челюсть";
		quadrantNameRu = "Верхний правый сектор";
	} else if (quad === 2) {
		archRu = "Верхняя челюсть";
		quadrantNameRu = "Верхний левый сектор";
	} else if (quad === 3) {
		archRu = "Нижняя челюсть";
		quadrantNameRu = "Нижний левый сектор";
	} else if (quad === 4) {
		archRu = "Нижняя челюсть";
		quadrantNameRu = "Нижний правый сектор";
	}

	let toothTypeRu: "Резец" | "Клык" | "Премоляр" | "Моляр" = "Моляр";
	let typeDesc = "Моляр";

	if (position === 1) {
		toothTypeRu = "Резец";
		typeDesc = "Центральный резец";
	} else if (position === 2) {
		toothTypeRu = "Резец";
		typeDesc = "Боковой резец";
	} else if (position === 3) {
		toothTypeRu = "Клык";
		typeDesc = "Клык";
	} else if (position === 4) {
		toothTypeRu = "Премоляр";
		typeDesc = "Первый премоляр";
	} else if (position === 5) {
		toothTypeRu = "Премоляр";
		typeDesc = "Второй премоляр";
	} else if (position === 6) {
		toothTypeRu = "Моляр";
		typeDesc = "Первый моляр (шестерка)";
	} else if (position === 7) {
		toothTypeRu = "Моляр";
		typeDesc = "Второй моляр (семерка)";
	} else if (position === 8) {
		toothTypeRu = "Моляр";
		typeDesc = "Третий моляр (зуб мудрости)";
	}

	const formattedFdi = `${quad}.${position}`;
	const friendlyNameRu = `${archRu}, ${typeDesc} (#${formattedFdi})`;

	return {
		toothFdi: formattedFdi,
		toothNumber: num,
		quadrant: quad >= 1 && quad <= 4 ? quad : 1,
		quadrantNameRu,
		archRu,
		toothTypeRu,
		friendlyNameRu,
	};
}

export interface PatientPortalMediaAttachment {
	readonly id: string;
	readonly type: "photo_before" | "photo_after" | "xray" | "ct_3d";
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly url: string;
	readonly dateIso: string;
	readonly doctorNote?: string | undefined;
}

export interface PatientPortalVisitItem {
	readonly id: string;
	readonly dateIso: string;
	readonly timeRu: string;
	readonly doctorName: string;
	readonly doctorSpecialityRu: string;
	readonly doctorAvatarUrl?: string | undefined;
	readonly clinicName: string;
	readonly titleRu: string;
	readonly status: "completed" | "scheduled" | "in_progress";
	readonly proceduresSummary: readonly string[];
	readonly teethTreatedFdi: readonly string[];
	readonly amountRub: number;
	readonly paidRub: number;
	readonly careInstructionsRu: readonly string[];
	readonly mediaAttachments: readonly PatientPortalMediaAttachment[];
}

export interface PatientPortalTimelineData {
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly curatingDoctor: string;
	readonly activePlanTitle: string;
	readonly totalPlanCostRub: number;
	readonly totalPaidRub: number;
	readonly dmsSavedRub: number;
	readonly loyaltyBonusBalance: number;
	readonly overallProgressPercent: number;
	readonly totalVisitsPlanned: number;
	readonly completedVisitsCount: number;
	readonly nextScheduledVisit?: PatientPortalVisitItem | undefined;
	readonly toothStatuses: Readonly<Record<string, PatientFriendlyToothStatus>>;
	readonly visitsHistory: readonly PatientPortalVisitItem[];
}

/**
 * Эталонные данные для демонстрации мобильного портала пациента.
 */
export const DEMO_PATIENT_PORTAL_TIMELINE: PatientPortalTimelineData = {
	patientId: "pat-8842",
	patientName: "Алексей Владимирович",
	phone: "+7 (999) 123-45-67",
	curatingDoctor: "Д-р Смирнов А. В. (Ведущий ортопед-имплантолог)",
	activePlanTitle: "Комплексная реабилитация: Имплантация + Циркониевые коронки + Эстетика",
	totalPlanCostRub: 340000,
	totalPaidRub: 235000,
	dmsSavedRub: 28000,
	loyaltyBonusBalance: 12500,
	overallProgressPercent: 70,
	totalVisitsPlanned: 6,
	completedVisitsCount: 4,
	toothStatuses: {
		"1.1": "veneer_emax",
		"1.2": "veneer_emax",
		"2.1": "veneer_emax",
		"2.2": "veneer_emax",
		"1.6": "implant_crown_loaded",
		"2.6": "implant_integrated",
		"4.6": "crown_zirconia",
		"3.6": "endo_microscope",
		"1.4": "caries_cured",
		"2.5": "scheduled_treatment",
	},
	nextScheduledVisit: {
		id: "vis-5",
		dateIso: "2026-08-28",
		timeRu: "14:30",
		doctorName: "Д-р Смирнов А. В.",
		doctorSpecialityRu: "Стоматолог-ортопед",
		clinicName: "DENTE Премиум на Невском",
		titleRu: "Фиксация постоянной циркониевой коронки на зуб #2.6",
		status: "scheduled",
		proceduresSummary: [
			"Примерка и винтовая фиксация циркониевой коронки Katana ML",
			"Контрольный прицельный снимок посадки",
			"Окклюзионная проверка контактов",
		],
		teethTreatedFdi: ["2.6"],
		amountRub: 55000,
		paidRub: 0,
		careInstructionsRu: [
			"За 1 час до приема рекомендуется легкий прием пищи",
			"После фиксации воздержаться от приема твердой пищи в течение 2 часов",
		],
		mediaAttachments: [],
	},
	visitsHistory: [
		{
			id: "vis-1",
			dateIso: "2026-06-15",
			timeRu: "11:00",
			doctorName: "Д-р Лебедева Е. М.",
			doctorSpecialityRu: "Гигиенист-пародонтолог",
			clinicName: "DENTE Премиум на Невском",
			titleRu: "Комплексная профессиональная гигиена полости рта",
			status: "completed",
			proceduresSummary: [
				"Удаление над- и поддесневого зубного камня ультразвуком",
				"Бережная полировка Air-Flow порошком на основе глицина",
				"Глубокое фторирование эмали Clinpro",
			],
			teethTreatedFdi: ["1.1-4.8"],
			amountRub: 8000,
			paidRub: 8000,
			careInstructionsRu: [
				"В течение 48 часов соблюдать «белую диету» (исключить кофе, чай, свеклу)",
				"Заменить зубную щетку на новую с мягкой щетиной (Curaprox 5460)",
			],
			mediaAttachments: [
				{
					id: "med-1",
					type: "photo_after",
					titleRu: "Фото зубов после профессиональной гигиены",
					descriptionRu: "Полное удаление пигментированного налета и минерализованных отложений.",
					url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
					dateIso: "2026-06-15",
					doctorNote: "Десна здоровая, плотная, кровоточивость 0%.",
				},
			],
		},
		{
			id: "vis-2",
			dateIso: "2026-06-25",
			timeRu: "15:00",
			doctorName: "Д-р Смирнов А. В.",
			doctorSpecialityRu: "Хирург-имплантолог",
			clinicName: "DENTE Премиум на Невском",
			titleRu: "Установка дентальных имплантатов Osstem TS III (#1.6, #2.6)",
			status: "completed",
			proceduresSummary: [
				"Навигационная установка 2 имплантатов Osstem по хирургическому шаблону",
				"Установка формирователей десневой манжеты",
				"Антисептическая обработка",
			],
			teethTreatedFdi: ["1.6", "2.6"],
			amountRub: 110000,
			paidRub: 110000,
			careInstructionsRu: [
				"Прикладывать холод к щеке в первые сутки по 15 минут с перерывами",
				"Принимать назначенный антибиотик строго по схеме 5 дней",
				"Не посещать баню, сауну и спортзал в течение 7 дней",
			],
			mediaAttachments: [
				{
					id: "med-2",
					type: "xray",
					titleRu: "Контрольный снимок остеоинтеграции",
					descriptionRu: "Идеальная ось введения имплантатов в бикортикальном слое кости.",
					url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
					dateIso: "2026-06-25",
					doctorNote: "Первичная стабильность ISQ = 78 (отличный результат).",
				},
			],
		},
		{
			id: "vis-3",
			dateIso: "2026-07-20",
			timeRu: "16:00",
			doctorName: "Д-р Кузнецова О. И.",
			doctorSpecialityRu: "Терапевт-эндодонтист",
			clinicName: "DENTE Премиум на Невском",
			titleRu: "Лечение корневых каналов зуба #3.6 под микроскопом",
			status: "completed",
			proceduresSummary: [
				"Изоляция коффердамом и механическая обработка каналов VDW Reciproc",
				"Ультразвуковая ирригация гипохлоритом натрия 3%",
				"Трехмерная обтурация горячей гуттаперчей BeeFill",
			],
			teethTreatedFdi: ["3.6"],
			amountRub: 28000,
			paidRub: 28000,
			careInstructionsRu: [
				"Возможна легкая чувствительность при накусывании 1–3 дня (нормальная реакция)",
				"Зуб подготовлен под покрытие циркониевой коронкой",
			],
			mediaAttachments: [],
		},
		{
			id: "vis-4",
			dateIso: "2026-08-10",
			timeRu: "12:00",
			doctorName: "Д-р Смирнов А. В.",
			doctorSpecialityRu: "Стоматолог-ортопед",
			clinicName: "DENTE Премиум на Невском",
			titleRu: "Фиксация постоянной коронки #1.6 и виниров #1.1-2.2",
			status: "completed",
			proceduresSummary: [
				"Адгезивная фиксация 4 керамических виниров E.max",
				"Винтовая фиксация циркониевой коронки на имплант #1.6",
			],
			teethTreatedFdi: ["1.1", "1.2", "2.1", "2.2", "1.6"],
			amountRub: 89000,
			paidRub: 89000,
			careInstructionsRu: [
				"Использовать мягкую зубную нить SuperFloss вокруг имплантата",
				"Контрольный осмотр и фотопротокол через 1 месяц",
			],
			mediaAttachments: [
				{
					id: "med-3",
					type: "photo_after",
					titleRu: "Эстетический результат: Виниры E.max",
					descriptionRu: "Идеальная интеграция в линию улыбки, натуральный микрорельеф эмали.",
					url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
					dateIso: "2026-08-10",
					doctorNote: "Цвет VITA A1, краевое прилегание 100%.",
				},
			],
		},
	],
};
