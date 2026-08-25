/**
 * stagePaymentPresets.ts — Пресеты и нормативные параметры поэтапной оплаты планов лечения.
 * 
 * НОРМАТИВНО-ПРАВОВАЯ БАЗА:
 * • ГК РФ Статья 709 («Смета работы») — согласование твердой/приблизительной сметы этапов.
 * • ГК РФ Статья 711 («Порядок оплаты работы») — уплата аванса и окончательный расчет после сдачи работ.
 * • Закон РФ № 2300-1 Статья 37 («Порядок и формы оплаты выполненной работы (оказанной услуги)»).
 * • Федеральный закон № 54-ФЗ («О применении ККТ») — фискализация авансов и окончательных расчетов.
 */

export type StagePaymentKind =
	| "stage_1_sanitation_therapy"
	| "stage_2_surgery_implant"
	| "stage_3_orthopedic_prosthetics"
	| "stage_4_orthodontics_braces"
	| "stage_5_periodontics_maintenance";

export type StagePaymentStatus =
	| "draft"          // Черновик сметы этапа (не оплачен)
	| "advance_paid"   // Внесен аванс / предоплата по этапу
	| "in_progress"    // Этап в работе, средства заблокированы в эскроу клиники
	| "act_completed"  // Подписан Акт сдачи-приемки выполненных работ (ст. 720 ГК РФ)
	| "fully_paid"     // Произведен полный окончательный расчет
	| "refunded";      // Договор расторгнут, оформлен возврат по ст. 32 Закона № 2300-1

export type FiscalAdvanceTag = "PREPAYMENT_100" | "PREPAYMENT_PARTIAL" | "FULL_SETTLEMENT";

export interface StagePaymentPreset {
	readonly kind: StagePaymentKind;
	readonly stageNumber: number;
	readonly title: string;
	readonly shortTitle: string;
	readonly clinicalGoalRu: string;
	readonly legalBasisRu: string;
	readonly defaultAdvancePercent: number; // 0-100%
	readonly defaultCompletionPercent: number; // 0-100%
	readonly installmentsAllowed: boolean;
	readonly defaultInstallmentMonths?: number;
	readonly cadCamLabSharePercent?: number; // Доля затрат зуботехнической лаборатории
	readonly implantHardwareSharePercent?: number; // Доля титановых имплантатов/компонентов
	readonly fiscalAdvanceTag: FiscalAdvanceTag;
	readonly statutoryRequirements: readonly string[];
	readonly clinicalMilestones: readonly string[];
	readonly defaultItemsSummary: string;
}

export const STAGE_PAYMENT_PRESETS: Record<StagePaymentKind, StagePaymentPreset> = {
	stage_1_sanitation_therapy: {
		kind: "stage_1_sanitation_therapy",
		stageNumber: 1,
		title: "Этап 1: Терапевтическая санация и профессиональная гигиена",
		shortTitle: "Терапия и гигиена",
		clinicalGoalRu: "Ликвидация очагов острой и хронической инфекции, снятие воспаления пародонта, подготовка зубочелюстной системы к хирургии и протезированию.",
		legalBasisRu: "ГК РФ ст. 709, ст. 711 п. 2 (Аванс 100% или оплата по факту каждого лечебного приема).",
		defaultAdvancePercent: 100,
		defaultCompletionPercent: 0,
		installmentsAllowed: false,
		fiscalAdvanceTag: "PREPAYMENT_100",
		statutoryRequirements: [
			"Оформление Информированного добровольного согласия (ИДС) по приказу МЗ РФ № 1051н",
			"Фиксация результатов фотопротокола до и после профгигиены",
			"Выдача фискального чека 54-ФЗ с признаком 'ПОЛНЫЙ РАСЧЕТ' или 'ПРЕДОПЛАТА 100%'",
		],
		clinicalMilestones: [
			"Комплексная диагностика и чтение КЛКТ",
			"Ультразвуковой скейлинг и Air-Flow",
			"Эндодонтическое перелечивание корневых каналов под микроскопом",
			"Анатомическая реставрация коронковой части зубов фотополимером",
		],
		defaultItemsSummary: "Профгигиена полости рта, лечение кариеса и пульпита, эндодонтия.",
	},
	stage_2_surgery_implant: {
		kind: "stage_2_surgery_implant",
		stageNumber: 2,
		title: "Этап 2: Хирургический этап дентальной имплантации и костной пластики",
		shortTitle: "Хирургия и имплантация",
		clinicalGoalRu: "Установка дентальных имплантатов в биологически и ортопедически корректную позицию, реконструкция костного объема (синус-лифтинг, НКР).",
		legalBasisRu: "ГК РФ ст. 711 п. 1 (50% аванс на закупку титановых имплантатов + 50% окончательный расчет в день операции).",
		defaultAdvancePercent: 50,
		defaultCompletionPercent: 50,
		installmentsAllowed: true,
		defaultInstallmentMonths: 3,
		implantHardwareSharePercent: 50,
		fiscalAdvanceTag: "PREPAYMENT_PARTIAL",
		statutoryRequirements: [
			"ИДС на дентальную имплантацию и костную пластику",
			"Внесение паспортных стикеров и серийных номеров имплантатов в медицинскую карту (форма 043/у)",
			"Акт сдачи-приемки хирургического этапа по факту успешной установки имплантатов",
			"54-ФЗ: Чек на аванс при бронировании операции + чек на окончательный расчет после операции",
		],
		clinicalMilestones: [
			"3D-планирование и изготовление навигационного хирургического шаблона",
			"Атравматичное удаление несостоятельных зубов",
			"Установка дентальных имплантатов (Osstem / Straumann / Nobel)",
			"Направленная костная регенерация (НКР) / Открытый синус-лифтинг",
			"Установка формирователей десны (через 3-6 месяцев интеграции)",
		],
		defaultItemsSummary: "Установка дентальных имплантатов, аугментация кости, формирователи десны.",
	},
	stage_3_orthopedic_prosthetics: {
		kind: "stage_3_orthopedic_prosthetics",
		stageNumber: 3,
		title: "Этап 3: Ортопедический этап протезирования (CAD/CAM коронки и мостовидные протезы)",
		shortTitle: "Ортопедия и протезирование",
		clinicalGoalRu: "Восстановление жевательной эффективности, окклюзионных взаимоотношений и высокой эстетики улыбки с помощью постоянных керамических и циркониевых конструкций.",
		legalBasisRu: "ГК РФ ст. 711 п. 1 (50% аванс на оплату работ зуботехнической лаборатории + 50% при постоянной фиксации конструкции).",
		defaultAdvancePercent: 50,
		defaultCompletionPercent: 50,
		installmentsAllowed: true,
		defaultInstallmentMonths: 6,
		cadCamLabSharePercent: 40,
		fiscalAdvanceTag: "PREPAYMENT_PARTIAL",
		statutoryRequirements: [
			"ИДС на ортопедическое лечение и постоянное протезирование",
			"Наряд-заказ в зуботехническую лабораторию с указанием цвета по шкале VITA",
			"Гарантийный паспорт ортопедической конструкции (ст. 5 Закона РФ № 2300-1)",
			"Акт сдачи-приемки выполненных ортопедических работ с подписью пациента",
		],
		clinicalMilestones: [
			"Препарирование и цифровое интраоральное 3D-сканирование / снятие А-силиконовых слепков",
			"Изготовление и фиксация временных провизорных PMMA-коронок",
			"Лабораторное фрезерование CAD/CAM циркониевых каркасов и нанесение E.max керамики",
			"Клиническая примерка, проверка окклюзионных контактов",
			"Постоянная адгезивная фиксация на композитный цемент двойного отверждения",
		],
		defaultItemsSummary: "Коронки из диоксида циркония / E.max, индивидуальные абатменты, виниры.",
	},
	stage_4_orthodontics_braces: {
		kind: "stage_4_orthodontics_braces",
		stageNumber: 4,
		title: "Этап 4: Ортодонтическое лечение (брекет-системы / элайнеры)",
		shortTitle: "Ортодонтия",
		clinicalGoalRu: "Коррекция аномалий прикуса, выравнивание зубных рядов, создание оптимальных окклюзионных контактов перед имплантацией и протезированием.",
		legalBasisRu: "ГК РФ ст. 709 (Первоначальный взнос 30% за аппаратуру + ежемесячные равные платежи за контрольные активации).",
		defaultAdvancePercent: 30,
		defaultCompletionPercent: 70,
		installmentsAllowed: true,
		defaultInstallmentMonths: 18,
		fiscalAdvanceTag: "PREPAYMENT_PARTIAL",
		statutoryRequirements: [
			"ИДС на ортодонтическое лечение и ношение брекет-системы",
			"График контрольных посещений и расчет ежемесячных платежей",
			"Акт сдачи-приемки при снятии брекетов и установке несъемных ретейнеров",
		],
		clinicalMilestones: [
			"ТРГ-диагностика и расчет телерентгенограммы",
			"Фиксация самолигирующей брекет-системы (Damon Q2 / Ormco)",
			"Регулярная смена ортодонтических дуг и коррекция эластиками (1 раз в 4-6 недель)",
			"Снятие брекет-системы, полировка эмали и установка ретенционных капп",
		],
		defaultItemsSummary: "Установка брекет-системы, ортодонтические дуги, активации, ретейнеры.",
	},
	stage_5_periodontics_maintenance: {
		kind: "stage_5_periodontics_maintenance",
		stageNumber: 5,
		title: "Этап 5: Пародонтологическое лечение и диспансерная поддержка",
		shortTitle: "Пародонтология",
		clinicalGoalRu: "Устранение пародонтальных карманов, купирование рецессий десны, стабилизация костной ткани вокруг естественных зубов и имплантатов.",
		legalBasisRu: "Закон РФ № 2300-1 ст. 37 (Посеансовая оплата по факту оказания каждой манипуляции).",
		defaultAdvancePercent: 0,
		defaultCompletionPercent: 100,
		installmentsAllowed: false,
		fiscalAdvanceTag: "FULL_SETTLEMENT",
		statutoryRequirements: [
			"Периодонтальная карта (Periodontal Chart) с замером глубины карманов и кровоточивости BOP",
			"ИДС на пародонтологическое лечение и кюретаж",
			"Фискальный чек на каждую проведенную процедуру в день посещения",
		],
		clinicalMilestones: [
			"Комплексное пародонтологическое зондирование в 6 точках каждого зуба",
			"Закрытый/открытый кюретаж пародонтальных карманов с аппаратом Vector",
			"Шинирование подвижных зубов стекловолоконной лентой",
			"Плазмолифтинг (PRP/PRF) десневых сосочков",
		],
		defaultItemsSummary: "Vector-терапия, кюретаж карманов, шинирование зубов, плазмолифтинг.",
	},
};

/**
 * Метаданные статусов этапа для отображения в UI
 */
export interface StageStatusUiMeta {
	readonly labelRu: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly iconName: string;
	readonly descriptionRu: string;
}

export const STAGE_STATUS_UI_MAP: Record<StagePaymentStatus, StageStatusUiMeta> = {
	draft: {
		labelRu: "Черновик",
		badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
		borderClass: "border-slate-300 dark:border-slate-700",
		iconName: "FileEdit",
		descriptionRu: "Смета этапа сформирована, ожидает внесения аванса или начала работ.",
	},
	advance_paid: {
		labelRu: "Аванс внесен",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
		borderClass: "border-amber-400 dark:border-amber-600",
		iconName: "Coins",
		descriptionRu: "Пациент внес предоплату по этапу; средства готовы к заморозке в эскроу.",
	},
	in_progress: {
		labelRu: "В работе (Эскроу)",
		badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		borderClass: "border-[var(--teal,var(--brand-primary))]",
		iconName: "Lock",
		descriptionRu: "Этап выполняется клиникой. Средства заблокированы на эскроу-депозите до подписания акта.",
	},
	act_completed: {
		labelRu: "Акт подписан",
		badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		borderClass: "border-[var(--teal,var(--brand-primary))]",
		iconName: "FileCheck",
		descriptionRu: "Услуги оказаны, Акт сдачи-приемки подписан пациентом (ст. 720 ГК РФ).",
	},
	fully_paid: {
		labelRu: "Полностью оплачен",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
		borderClass: "border-emerald-500 dark:border-emerald-600",
		iconName: "CheckCircle2",
		descriptionRu: "Этап завершен, все финансовые обязательства сторон выполнены в полном объеме.",
	},
	refunded: {
		labelRu: "Расторгнут (Возврат)",
		badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700",
		borderClass: "border-rose-400 dark:border-rose-600",
		iconName: "RotateCcw",
		descriptionRu: "Договор по данному этапу расторгнут по ст. 32 Закона № 2300-1 с расчетом фактических затрат клиники.",
	},
};

/**
 * Получить список всех поддерживаемых видов этапов
 */
export function getAllStagePaymentKinds(): readonly StagePaymentKind[] {
	return [
		"stage_1_sanitation_therapy",
		"stage_2_surgery_implant",
		"stage_3_orthopedic_prosthetics",
		"stage_4_orthodontics_braces",
		"stage_5_periodontics_maintenance",
	];
}

/**
 * Получить пресет по виду этапа
 */
export function getStagePresetByKind(kind: StagePaymentKind): StagePaymentPreset {
	return STAGE_PAYMENT_PRESETS[kind] ?? STAGE_PAYMENT_PRESETS.stage_1_sanitation_therapy;
}
