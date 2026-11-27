/**
 * DENTE CRM — Consolidated Clinical Help Catalog, Categories, Hotkeys & Search Engine
 * Authority: Mandate 8b (<= 400 lines), Mandate 8x (Clean Human Language), Mandate 8bf (SSOT)
 */

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

export interface ClinicalGuideMeta {
	readonly id: ClinicalGuideTab;
	readonly category: ClinicalGuideCategory;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly description: string;
	readonly hotkeys?: readonly string[];
	readonly keywords: readonly string[];
	readonly targetView?: string;
	readonly tourTrack?: string;
}

export interface ClinicalGuideProps {
	readonly onLaunchTour?: ((trackId?: string) => void) | undefined;
	readonly onNavigate?: ((targetView: string) => void) | undefined;
}

export interface ClinicalHotkeyMeta {
	readonly id: string;
	readonly keyCombination: string;
	readonly title: string;
	readonly description: string;
	readonly category: "global" | "chairside" | "billing" | "imaging" | "records";
	readonly targetView?: string;
}

export const GUIDE_CATEGORIES: readonly ClinicalGuideCategoryMeta[] = [
	{ id: "clinical", label: "Приём врача", description: "Расписание, одонтограмма, дневник приёма и планы лечения" },
	{ id: "finance", label: "Касса и чеки", description: "Приём оплаты, сплит, кассовые чеки и эквайринг, расчёт зарплат" },
	{ id: "diagnostics", label: "Диагностика и снимки", description: "Снимки визиографа, 3D томография КЛКТ и замеры кости" },
	{ id: "lab_warehouse", label: "Склад и стерилизация", description: "Зуботехнические наряды, шкала VITA и неблокируемый склад" },
	{ id: "infrastructure", label: "Сеть и безопасность", description: "Журнал автоклавирования, этикетки крафт-пакетов и автономный LAN Mesh" },
];

export function getCategoryById(id: ClinicalGuideCategory): ClinicalGuideCategoryMeta | undefined {
	return GUIDE_CATEGORIES.find((cat) => cat.id === id);
}

export const CLINICAL_SECTION_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "schedule",
		category: "clinical",
		title: "Расписание и приём пациентов (Запись за 5 секунд)",
		shortTitle: "Расписание",
		badge: "Сетка приёма",
		description: "Бронирование кресел без лишних полей, смены врачей, поиск свободного окна и управление очередью визитов.",
		hotkeys: ["Space / Enter", "Ctrl+K", "F5", "F9"],
		targetView: "schedule",
		tourTrack: "reception_admin",
		keywords: [
			"расписание", "запись", "пациент", "пациенты", "кресло", "кресла",
			"смена", "визит", "время", "прием", "приём", "окно", "бронирование",
			"очередь", "ассистент", "график", "кабинет", "талон",
		],
	},
	{
		id: "odontogram",
		category: "clinical",
		title: "Зубная формула и одонтограмма (FDI / КПУ)",
		shortTitle: "Одонтограмма",
		badge: "Зубная формула",
		description: "Быстрая маркировка кариеса, пульпита, коронок и быстрое заполнение физиологической нормой (Shift+N).",
		hotkeys: ["Shift+N", "1..8", "C", "P", "K", "X", "F"],
		targetView: "visit",
		tourTrack: "solo_doctor",
		keywords: [
			"одонтограмма", "зубная формула", "зуб", "зубы", "зубов", "детский",
			"детские", "дети", "молочные", "молочный", "прикус", "сменный",
			"кариес", "пульпит", "периодонтит", "коронка", "норма", "FDI",
			"эмаль", "пломба", "пломбы", "реставрация", "адентия", "удаление",
			"пародонтограмма", "десна", "поверхность",
		],
	},
	{
		id: "medical_record",
		category: "clinical",
		title: "Медицинская карта приёма и дневник визита",
		shortTitle: "Дневник приёма",
		badge: "ЭМК и шаблоны",
		description: "Жалобы, анамнез, готовые клинические протоколы, голосовая диктовка у кресла и печать согласий (F12).",
		hotkeys: ["Ctrl+S", "F12", "F4", "F9"],
		targetView: "visit",
		tourTrack: "solo_doctor",
		keywords: [
			"дневник", "карта", "медкарта", "анамнез", "жалобы", "статус",
			"осмотр", "норма", "печать", "согласие", "ИДС", "диктовка",
			"голос", "микрофон", "протокол", "сохранение", "автосохранение",
			"рецепт", "справка",
		],
	},
	{
		id: "treatment_plans",
		category: "clinical",
		title: "Планы лечения и сравнительные сметы",
		shortTitle: "Планы лечения",
		badge: "Сметы и этапы",
		description: "Сравнение вариантов спецификаций (Базовый, Оптимальный, Премиум), этапы, скидки врача и каталог услуг.",
		hotkeys: ["Ctrl+P", "Tab"],
		targetView: "visit",
		tourTrack: "solo_doctor",
		keywords: [
			"план лечения", "планы", "смета", "сметы", "счёт", "счет", "счета",
			"варианты", "этапы", "скидка", "стоимость", "расчет", "расчёт",
			"цена", "прайс", "прейскурант", "услуги", "лечение", "рассрочка", "протокол",
		],
	},
];

export const FINANCE_DIAGNOSTICS_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "cashier",
		category: "finance",
		title: "Касса, оплата и кассовые чеки (Комбинированный сплит)",
		shortTitle: "Касса и чеки",
		badge: "Финансы",
		description: "Комбинированная оплата (нал + карта + СБП QR + семейный депозит), печать чека без требования ИНН физлиц.",
		hotkeys: ["F9", "Enter", "Ctrl+Enter"],
		targetView: "finance",
		tourTrack: "reception_admin",
		keywords: [
			"касса", "оплата", "оплаты", "оплатить", "чек", "чеки", "счёт", "счет",
			"счета", "сплит", "нал", "наличные", "карта", "терминал", "pos", "СБП",
			"QR", "депозит", "аванс", "скидка", "расчет", "расчёт", "деньги",
			"ккт", "фискальный", "финансы",
		],
	},
	{
		id: "imaging",
		category: "diagnostics",
		title: "Снимки и 3D томография (КЛКТ)",
		shortTitle: "Снимки и КТ",
		badge: "Рентген и 3D",
		description: "Просмотр срезов MPR (аксиальный, корональный, сагиттальный), панорама ОПТГ, калибровка линейки и замер кости.",
		hotkeys: ["F7", "Tab", "Shift+Tab", "R", "W"],
		targetView: "imaging",
		tourTrack: "imaging_diagnostics",
		keywords: [
			"снимки", "снимок", "кт", "клкт", "dicom", "визиограф", "mpr",
			"панорама", "оптг", "рентген", "линейка", "замер", "кость",
			"гребень", "имплант", "срез", "аксиальный", "томография", "томограмма",
			"челюсть", "калибровка",
		],
	},
	{
		id: "leads",
		category: "finance",
		title: "Лиды, входящие звонки и телефония",
		shortTitle: "Звонки и лиды",
		badge: "Телефония",
		description: "Всплытие карточки звонящего пациента, быстрое создание лида и 4-колоночный канбан воронки обращений.",
		hotkeys: ["Alt+P", "Ctrl+Alt+L"],
		targetView: "communications",
		tourTrack: "reception_admin",
		keywords: [
			"лиды", "лид", "звонки", "звонок", "телефония", "атс", "канбан",
			"воронка", "обращения", "заявка", "заявки", "телефон", "номер",
			"пациент", "консультация", "доходимость",
		],
	},
	{
		id: "analytics",
		category: "finance",
		title: "Аналитика, отчёты и зарплатная ведомость",
		shortTitle: "Аналитика",
		badge: "Дашборд и KPI",
		description: "Выручка клиники в реальном времени, средний чек, загрузка кресел и автоматический расчёт сдельной зарплаты врачей.",
		hotkeys: ["Ctrl+Alt+A", "Ctrl+P"],
		targetView: "analytics",
		tourTrack: "reception_admin",
		keywords: [
			"аналитика", "выручка", "доход", "зарплата", "зарплаты", "отчеты",
			"отчет", "отчёты", "отчёт", "загрузка", "чек", "средний чек",
			"дашборд", "статистика", "кпи", "kpi", "сделка", "т-51", "1с",
		],
	},
];

export const INFRASTRUCTURE_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "dental_lab",
		category: "lab_warehouse",
		title: "Зуботехническая лаборатория (ЗТЛ)",
		shortTitle: "Лаборатория",
		badge: "Наряды ЗТЛ",
		description: "Электронные наряды технику, выбор расцветки по шкале VITA (A1–D4), сроки примерки и готовности коронок.",
		hotkeys: ["Ctrl+L", "V"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"лаборатория", "зтл", "наряд", "наряды", "техник", "коронка", "коронки",
			"зуб", "зубы", "vita", "вита", "цвет", "оттенок", "примерка", "винир",
			"виниры", "протез", "мост", "слепок", "скан", "stl", "каркас", "цирконий",
		],
	},
	{
		id: "inventory",
		category: "lab_warehouse",
		title: "Склад и материалы (Неблокируемый учёт)",
		shortTitle: "Склад",
		badge: "Материалы",
		description: "Фоновое автосписание по техкартам оказанных услуг, партии FEFO и мягкий расход без блокировки врача.",
		hotkeys: ["Ctrl+I", "F8"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"склад", "материалы", "материал", "анестетик", "карпула", "карпулы",
			"бор", "перчатки", "списание", "автосписание", "овердрафт", "остатки",
			"накладная", "партия", "fefo", "срок годности", "инвентаризация", "техкарта",
		],
	},
	{
		id: "sanpin",
		category: "infrastructure",
		title: "Стерилизация, чистота и журнал автоклава",
		shortTitle: "Стерилизация",
		badge: "Чистота и автоклав",
		description: "Журнал автоклавирования, этикетки крафт-пакетов DataMatrix, оперативная фиксация проб азопирам/фенолфталеин.",
		hotkeys: ["Ctrl+Alt+S", "Ctrl+P"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"стерилизация", "автоклав", "автоклавирование", "крафт-пакет", "крафт",
			"пакет", "пакеты", "азопирам", "проба", "пробы", "этикетка",
			"datamatrix", "чистота", "дезинфекция", "санпин", "роспотребнадзор", "журнал",
		],
	},
	{
		id: "lan_mesh",
		category: "infrastructure",
		title: "LAN Zero-Conf Mesh (Планшеты у кресла)",
		shortTitle: "LAN Mesh",
		badge: "Планшеты & Офлайн",
		description: "Сопряжение планшетов у кресла по 6-значному PIN / QR за 5 секунд и автономная работа без интернета.",
		hotkeys: ["Ctrl+Alt+N", "F5"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"lan", "mesh", "планшет", "планшеты", "офлайн", "вайфай", "wifi",
			"сопряжение", "pin", "пин", "qr", "сеть", "локальная", "синхронизация",
			"автономия", "роутер", "планшет врача",
		],
	},
];

export const CLINICAL_GUIDES: readonly ClinicalGuideMeta[] = [
	...CLINICAL_SECTION_GUIDES,
	...FINANCE_DIAGNOSTICS_GUIDES,
	...INFRASTRUCTURE_GUIDES,
];

export function getGuideById(id: ClinicalGuideTab): ClinicalGuideMeta | undefined {
	return CLINICAL_GUIDES.find((g) => g.id === id);
}

export function getGuidesByCategory(category: ClinicalGuideCategory): ClinicalGuideMeta[] {
	return CLINICAL_GUIDES.filter((g) => g.category === category);
}

export const CLINICAL_HOTKEYS_REGISTRY: readonly ClinicalHotkeyMeta[] = [
	{ id: "help-hub", keyCombination: "F1 / ?", title: "База знаний и справка", description: "Открыть справочник у кресла врача и гид по функциям", category: "global" },
	{ id: "global-search", keyCombination: "Ctrl+K / Cmd+K", title: "Поиск пациента", description: "Мгновенный переход к карте любого пациента клиники", category: "global" },
	{ id: "toggle-visit", keyCombination: "Space / Enter", title: "Старт / завершение визита", description: "Начать или закончить активный приём пациента", category: "chairside", targetView: "schedule" },
	{ id: "autonorm-odontogram", keyCombination: "Shift+N", title: "Физиологическая норма формулы", description: "Заполнить всю зубную формулу физиологической нормой", category: "chairside", targetView: "visit" },
	{ id: "fdi-teeth-keys", keyCombination: "1..8", title: "Выбор зуба по FDI", description: "Быстрый выбор зуба активного сегмента зубной дуги", category: "chairside", targetView: "visit" },
	{ id: "save-diary", keyCombination: "Ctrl+S", title: "Автосохранение дневника", description: "Мгновенное сохранение протокола визита в защищенный локальный черновик", category: "records", targetView: "visit" },
	{ id: "print-consent", keyCombination: "F12", title: "Печать карты и согласий", description: "Быстрая печать медицинской карты приёма и бланков согласий", category: "records", targetView: "visit" },
	{ id: "fast-cashier", keyCombination: "F9", title: "Касса и оплата", description: "Перейти к расчёту стоимости приёма и кассовым чекам", category: "billing", targetView: "finance" },
	{ id: "imaging-viewer", keyCombination: "F7", title: "Снимки и КЛКТ", description: "Открыть снимки визиографа и 3D срезы томографии", category: "imaging", targetView: "imaging" },
	{ id: "warehouse-inventory", keyCombination: "F8", title: "Склад и материалы", description: "Просмотр остатков анестетиков и расходных материалов", category: "chairside", targetView: "settings" },
	{ id: "dismiss-overlay", keyCombination: "Esc", title: "Закрыть шторку / окно", description: "Безопасное закрытие текущей шторки или модального окна", category: "global" },
];

export function getHotkeysByCategory(category: ClinicalHotkeyMeta["category"]): readonly ClinicalHotkeyMeta[] {
	return CLINICAL_HOTKEYS_REGISTRY.filter((h) => h.category === category);
}

const SYNONYM_CLUSTERS: readonly { readonly words: readonly string[]; readonly targets: readonly ClinicalGuideTab[] }[] = [
	{ words: ["счет", "счета", "счетами", "счету", "оплата", "оплаты"], targets: ["cashier", "treatment_plans"] },
	{ words: ["оплатить", "оплате", "чек", "чеки", "чеком", "чеков", "касса", "кассы", "ккт", "нал", "наличные", "безнал", "терминал", "сбп"], targets: ["cashier"] },
	{ words: ["деньги"], targets: ["cashier", "analytics"] },
	{ words: ["qr"], targets: ["cashier", "lan_mesh"] },
	{ words: ["зуб", "зубы", "зубов", "зубам", "зубами"], targets: ["odontogram", "dental_lab"] },
	{ words: ["детский", "детские", "детского", "дети", "молочные", "молочный", "прикус", "эмаль", "кариес", "пульпит", "пломба", "пломбы", "пародонт"], targets: ["odontogram"] },
	{ words: ["снимок", "снимки", "снимка", "снимков", "рентген", "рентгена", "кт", "клкт", "томография", "томограмма", "визиограф", "панорама", "оптг", "mpr", "dicom"], targets: ["imaging"] },
	{ words: ["смета", "сметы", "план", "планы", "прайс", "прейскурант", "рассрочка"], targets: ["treatment_plans"] },
	{ words: ["стоимость"], targets: ["treatment_plans", "cashier"] },
	{ words: ["расчет", "расчёт"], targets: ["treatment_plans", "cashier", "analytics"] },
	{ words: ["лаба", "лаборатория", "наряд", "наряды", "техник", "технику", "vita", "вита", "винир", "виниры", "слепок", "слепки"], targets: ["dental_lab"] },
	{ words: ["коронка", "коронки"], targets: ["dental_lab", "odontogram"] },
	{ words: ["склад", "материал", "материалы", "овердрафт", "списание", "автосписание", "остатки", "карпула", "карпулы", "fefo"], targets: ["inventory"] },
	{ words: ["анестетик"], targets: ["inventory", "medical_record"] },
	{ words: ["стерилизация", "автоклав", "автоклавирование", "крафт", "пакет", "пакеты", "азопирам", "проба", "пробы", "дезинфекция", "чистота", "санпин"], targets: ["sanpin"] },
	{ words: ["звонок", "звонки", "звонка", "телефон", "атс", "лид", "лиды", "воронка", "канбан", "заявка", "заявки"], targets: ["leads"] },
	{ words: ["планшет", "планшеты", "вайфай", "wifi", "сеть", "mesh", "офлайн", "сопряжение", "пин", "pin"], targets: ["lan_mesh"] },
	{ words: ["аналитика", "отчет", "отчеты", "отчёт", "отчёты", "выручка", "доход", "зарплата", "зарплаты", "кпи", "kpi"], targets: ["analytics"] },
	{ words: ["расписание", "кресло", "смена", "окно"], targets: ["schedule"] },
	{ words: ["запись"], targets: ["schedule", "leads"] },
	{ words: ["прием", "приём", "визит"], targets: ["schedule", "medical_record"] },
	{ words: ["карта", "медкарта", "дневник", "анамнез", "жалобы", "согласие", "идс", "диктовка"], targets: ["medical_record"] },
];

export const CLINICAL_SYNONYM_MAP: Record<string, readonly ClinicalGuideTab[]> = (() => {
	const map: Record<string, ClinicalGuideTab[]> = {};
	for (const cluster of SYNONYM_CLUSTERS) {
		for (const word of cluster.words) {
			const existing = map[word] ?? [];
			for (const target of cluster.targets) {
				if (!existing.includes(target)) existing.push(target);
			}
			map[word] = existing;
		}
	}
	return map;
})();

export function normalizeSearchTerm(term: string): string {
	return term
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function searchClinicalGuides(query: string): ClinicalGuideMeta[] {
	const rawClean = query.trim();
	if (!rawClean) return [...CLINICAL_GUIDES];

	const normalizedQuery = normalizeSearchTerm(rawClean);
	if (!normalizedQuery) return [...CLINICAL_GUIDES];

	const queryWords = normalizedQuery.split(" ").filter((w) => w.length > 0);
	const synonymMatchedIds = new Set<ClinicalGuideTab>();
	for (const word of queryWords) {
		const matched = CLINICAL_SYNONYM_MAP[word];
		if (matched) for (const id of matched) synonymMatchedIds.add(id);
	}

	return CLINICAL_GUIDES.filter((guide) => {
		if (synonymMatchedIds.has(guide.id)) return true;
		const normTitle = normalizeSearchTerm(guide.title);
		const normShortTitle = normalizeSearchTerm(guide.shortTitle);
		const normDesc = normalizeSearchTerm(guide.description);
		const normBadge = normalizeSearchTerm(guide.badge);
		if (normTitle.includes(normalizedQuery) || normShortTitle.includes(normalizedQuery) || normDesc.includes(normalizedQuery) || normBadge.includes(normalizedQuery)) return true;

		const normKeywords = guide.keywords.map(normalizeSearchTerm);
		if (normKeywords.some((k) => k.includes(normalizedQuery) || normalizedQuery.includes(k))) return true;
		if (guide.hotkeys?.some((h) => normalizeSearchTerm(h).includes(normalizedQuery))) return true;

		return queryWords.some((qWord) => {
			if (qWord.length < 3) return false;
			const qStem = qWord.slice(0, Math.min(qWord.length, 5));
			return normKeywords.some((k) => {
				const kStem = k.slice(0, Math.min(k.length, 5));
				return k.startsWith(qStem) || qWord.startsWith(kStem) || k.includes(qWord);
			});
		});
	});
}
