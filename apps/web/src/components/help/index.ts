/**
 * DENTE CRM — Contextual Clinical Quick Guides Index & Knowledge Base Catalog
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 * Mandate 8l: Red Team Knowledge Base Hub & Component Wiki
 */

export * from "./ScheduleGuide";
export * from "./OdontogramGuide";
export * from "./MedicalRecordGuide";
export * from "./CashierGuide";
export * from "./Imaging3DGuide";
export * from "./TreatmentPlansGuide";
export * from "./DentalLabGuide";
export * from "./InventoryWarehouseGuide";
export * from "./SanPiNAutoclaveGuide";
export * from "./LeadsTelephonyGuide";
export * from "./LanMeshGuide";
export * from "./AnalyticsReportsGuide";

export type ClinicalGuideTab =
	| "schedule"
	| "odontogram"
	| "medical_record"
	| "cashier"
	| "imaging"
	| "treatment_plans"
	| "dental_lab"
	| "inventory"
	| "sanpin"
	| "leads"
	| "lan_mesh"
	| "analytics";

export type ClinicalGuideCategory =
	| "clinical"
	| "finance"
	| "diagnostics"
	| "lab_warehouse"
	| "infrastructure";

export interface ClinicalGuideCategoryMeta {
	readonly id: ClinicalGuideCategory;
	readonly label: string;
	readonly description: string;
}

export const GUIDE_CATEGORIES: readonly ClinicalGuideCategoryMeta[] = [
	{
		id: "clinical",
		label: "Приём врача",
		description: "Расписание, одонтограмма, дневник приёма и планы лечения",
	},
	{
		id: "finance",
		label: "Касса и финансы",
		description: "Приём оплаты, сплит, чеки 54-ФЗ и зарплаты",
	},
	{
		id: "diagnostics",
		label: "Диагностика",
		description: "Снимки визиографа, 3D томография КЛКТ и замеры кости",
	},
	{
		id: "lab_warehouse",
		label: "Лаборатория и склад",
		description: "Зуботехнические наряды, шкала VITA и мягкий овердрафт",
	},
	{
		id: "infrastructure",
		label: "Чистота и сеть",
		description: "Журнал автоклавирования, этикетки и автономный LAN Mesh",
	},
];

export interface ClinicalGuideMeta {
	readonly id: ClinicalGuideTab;
	readonly category: ClinicalGuideCategory;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly description: string;
	readonly hotkeys?: readonly string[];
	readonly keywords: readonly string[];
}

export const CLINICAL_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "schedule",
		category: "clinical",
		title: "Расписание и приём пациентов (Запись за 5 секунд)",
		shortTitle: "Расписание",
		badge: "Сетка приёма",
		description: "Бронирование кресел без лишних полей, смены врачей, поиск свободного окна и управление очередью визитов.",
		hotkeys: ["Space / Enter", "Ctrl+K", "F5"],
		keywords: ["расписание", "запись", "пациент", "кресло", "смена", "визит", "время", "прием"],
	},
	{
		id: "odontogram",
		category: "clinical",
		title: "Зубная формула и одонтограмма за 2 клика",
		shortTitle: "Одонтограмма",
		badge: "Зубная формула",
		description: "Быстрая маркировка кариеса, пульпита, коронок и 1-клик заполнение физиологической нормой (Shift+N).",
		hotkeys: ["Shift+N", "1..8", "C", "P", "K", "X", "F"],
		keywords: ["одонтограмма", "зубная формула", "кариес", "пульпит", "коронка", "норма", "FDI", "зуб", "эмаль"],
	},
	{
		id: "medical_record",
		category: "clinical",
		title: "Медицинская карта и дневник приёма",
		shortTitle: "Дневник приёма",
		badge: "ЭМК и шаблоны",
		description: "Жалобы, анамнез, готовые клинические протоколы, голосовая диктовка у кресла и печать согласий (F12).",
		hotkeys: ["Ctrl+S", "F12", "F4", "F9"],
		keywords: ["дневник", "карта", "анамнез", "жалобы", "статус", "печать", "согласие", "ИДС", "диктовка"],
	},
	{
		id: "cashier",
		category: "finance",
		title: "Касса, оплата и чеки (Сплит в 3 клика)",
		shortTitle: "Касса и чеки",
		badge: "Финансы",
		description: "Комбинированная оплата (нал + карта + СБП QR + семейный депозит), печать чека без требования ИНН физлиц.",
		hotkeys: ["F9", "Enter"],
		keywords: ["касса", "оплата", "чек", "сплит", "нал", "карта", "СБП", "QR", "депозит", "скидка"],
	},
	{
		id: "imaging",
		category: "diagnostics",
		title: "Снимки и 3D томография (КЛКТ)",
		shortTitle: "Снимки и КТ",
		badge: "Рентген и 3D",
		description: "Просмотр срезов MPR (аксиальный, корональный, сагиттальный), панорама ОПТГ, калибровка линейки и замер кости.",
		hotkeys: ["F7", "Tab", "Shift+Tab", "R", "W"],
		keywords: ["снимки", "кт", "клкт", "dicom", "визиограф", "mpr", "панорама", "рентген", "линейка", "имплант"],
	},
	{
		id: "treatment_plans",
		category: "clinical",
		title: "Планы лечения и сравнительные сметы",
		shortTitle: "Планы лечения",
		badge: "Сметы и этапы",
		description: "Сравнение 3 вариантов спецификаций (Базовый, Оптимальный, Премиум), этапы, скидки врача и печать смет.",
		hotkeys: ["Ctrl+P", "Tab"],
		keywords: ["план лечения", "смета", "варианты", "этапы", "скидка", "стоимость", "расчет"],
	},
	{
		id: "dental_lab",
		category: "lab_warehouse",
		title: "Зуботехническая лаборатория (ЗТЛ)",
		shortTitle: "Лаборатория",
		badge: "Наряды ЗТЛ",
		description: "Электронные наряды технику, выбор расцветки по шкале VITA (A1–D4), сроки примерки и готовности коронок.",
		hotkeys: ["Ctrl+L", "V"],
		keywords: ["лаборатория", "зтл", "наряд", "техник", "коронка", "vita", "цвет", "примерка", "винир"],
	},
	{
		id: "inventory",
		category: "lab_warehouse",
		title: "Склад и материалы (Мягкий овердрафт)",
		shortTitle: "Склад",
		badge: "Материалы",
		description: "Фоновое автосписание по техкартам оказанных услуг, партии FEFO и мягкий овердрафт без блокировки врача.",
		hotkeys: ["Ctrl+I", "F8"],
		keywords: ["склад", "материалы", "анестетик", "списание", "овердрафт", "остатки", "накладная", "партия"],
	},
	{
		id: "sanpin",
		category: "infrastructure",
		title: "Стерилизация, чистота и журнал автоклава",
		shortTitle: "Стерилизация",
		badge: "Чистота и автоклав",
		description: "Журнал автоклавирования, этикетки крафт-пакетов DataMatrix, пробы азопирам/фенолфталеин в 1 клик.",
		hotkeys: ["Ctrl+Alt+S", "Ctrl+P"],
		keywords: ["стерилизация", "автоклав", "крафт-пакет", "азопирам", "псо", "этикетка", "чистота"],
	},
	{
		id: "leads",
		category: "finance",
		title: "Лиды, входящие звонки и телефония",
		shortTitle: "Звонки и лиды",
		badge: "Телефония",
		description: "Всплытие карточки звонящего пациента, быстрое создание лида и 4-колоночный канбан воронки обращений.",
		hotkeys: ["Alt+P", "Ctrl+Alt+L"],
		keywords: ["лиды", "звонки", "телефония", "канбан", "обращения", "заявка", "воронка"],
	},
	{
		id: "lan_mesh",
		category: "infrastructure",
		title: "LAN Zero-Conf Mesh (Планшеты у кресла)",
		shortTitle: "LAN Mesh",
		badge: "Планшеты & Офлайн",
		description: "Сопряжение планшетов у кресла по 6-значному PIN / QR за 5 секунд и автономная работа без интернета.",
		hotkeys: ["Ctrl+Alt+N", "F5"],
		keywords: ["lan", "mesh", "планшет", "офлайн", "сопряжение", "pin", "qr", "wi-fi", "сеть"],
	},
	{
		id: "analytics",
		category: "finance",
		title: "Аналитика, отчёты и зарплатная ведомость",
		shortTitle: "Аналитика",
		badge: "Дашборд и KPI",
		description: "Выручка клиники в реальном времени, средний чек, загрузка кресел и автоматический расчёт сдельной зарплаты врачей.",
		hotkeys: ["Ctrl+Alt+A", "Ctrl+P"],
		keywords: ["аналитика", "выручка", "зарплата", "отчеты", "загрузка", "чек", "дашборд", "статистика"],
	},
];

export function getGuideById(id: ClinicalGuideTab): ClinicalGuideMeta | undefined {
	return CLINICAL_GUIDES.find((g) => g.id === id);
}

export function getGuidesByCategory(category: ClinicalGuideCategory): ClinicalGuideMeta[] {
	return CLINICAL_GUIDES.filter((g) => g.category === category);
}

export function searchClinicalGuides(query: string): ClinicalGuideMeta[] {
	const clean = query.trim().toLowerCase();
	if (!clean) return [...CLINICAL_GUIDES];

	return CLINICAL_GUIDES.filter(
		(g) =>
			g.title.toLowerCase().includes(clean) ||
			g.shortTitle.toLowerCase().includes(clean) ||
			g.description.toLowerCase().includes(clean) ||
			g.badge.toLowerCase().includes(clean) ||
			g.keywords.some((k) => k.toLowerCase().includes(clean)) ||
			(g.hotkeys && g.hotkeys.some((h) => h.toLowerCase().includes(clean))),
	);
}
