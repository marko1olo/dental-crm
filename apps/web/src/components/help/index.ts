/**
 * DENTE CRM — Contextual Clinical Quick Guides Index & Knowledge Base Catalog
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 * Mandate 8l: Red Team Knowledge Base Hub & Component Wiki
 */

export interface ClinicalGuideProps {
	readonly onLaunchTour?: (trackId?: string) => void;
}

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
		hotkeys: ["Space / Enter", "Ctrl+K", "F5", "F9"],
		keywords: [
			"расписание",
			"запись",
			"пациент",
			"пациенты",
			"кресло",
			"кресла",
			"смена",
			"визит",
			"время",
			"прием",
			"приём",
			"окно",
			"бронирование",
			"очередь",
			"ассистент",
			"график",
			"кабинет",
			"талон",
		],
	},
	{
		id: "odontogram",
		category: "clinical",
		title: "Зубная формула и одонтограмма за 2 клика",
		shortTitle: "Одонтограмма",
		badge: "Зубная формула",
		description: "Быстрая маркировка кариеса, пульпита, коронок и 1-клик заполнение физиологической нормой (Shift+N).",
		hotkeys: ["Shift+N", "1..8", "C", "P", "K", "X", "F"],
		keywords: [
			"одонтограмма",
			"зубная формула",
			"зуб",
			"зубы",
			"зубов",
			"детский",
			"детские",
			"дети",
			"молочные",
			"молочный",
			"прикус",
			"сменный",
			"кариес",
			"пульпит",
			"периодонтит",
			"коронка",
			"норма",
			"FDI",
			"эмаль",
			"пломба",
			"пломбы",
			"реставрация",
			"адентия",
			"удаление",
			"пародонтограмма",
			"десна",
			"поверхность",
		],
	},
	{
		id: "medical_record",
		category: "clinical",
		title: "Медицинская карта и дневник приёма",
		shortTitle: "Дневник приёма",
		badge: "ЭМК и шаблоны",
		description: "Жалобы, анамнез, готовые клинические протоколы, голосовая диктовка у кресла и печать согласий (F12).",
		hotkeys: ["Ctrl+S", "F12", "F4", "F9"],
		keywords: [
			"дневник",
			"карта",
			"медкарта",
			"анамнез",
			"жалобы",
			"статус",
			"осмотр",
			"норма",
			"печать",
			"согласие",
			"ИДС",
			"диктовка",
			"голос",
			"микрофон",
			"протокол",
			"сохранение",
			"автосохранение",
			"рецепт",
			"справка",
		],
	},
	{
		id: "cashier",
		category: "finance",
		title: "Касса, оплата и чеки (Сплит в 3 клика)",
		shortTitle: "Касса и чеки",
		badge: "Финансы",
		description: "Комбинированная оплата (нал + карта + СБП QR + семейный депозит), печать чека без требования ИНН физлиц.",
		hotkeys: ["F9", "Enter", "Ctrl+Enter"],
		keywords: [
			"касса",
			"оплата",
			"оплаты",
			"оплатить",
			"чек",
			"чеки",
			"счёт",
			"счет",
			"счета",
			"сплит",
			"нал",
			"наличные",
			"карта",
			"терминал",
			"pos",
			"СБП",
			"QR",
			"депозит",
			"аванс",
			"скидка",
			"расчет",
			"расчёт",
			"деньги",
			"ккт",
			"фискальный",
			"финансы",
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
		keywords: [
			"снимки",
			"снимок",
			"кт",
			"клкт",
			"dicom",
			"визиограф",
			"mpr",
			"панорама",
			"оптг",
			"рентген",
			"линейка",
			"замер",
			"кость",
			"гребень",
			"имплант",
			"срез",
			"аксиальный",
			"томография",
			"томограмма",
			"челюсть",
			"калибровка",
		],
	},
	{
		id: "treatment_plans",
		category: "clinical",
		title: "Планы лечения и сравнительные сметы",
		shortTitle: "Планы лечения",
		badge: "Сметы и этапы",
		description: "Сравнение 3 вариантов спецификаций (Базовый, Оптимальный, Премиум), этапы, скидки врача и печать смет.",
		hotkeys: ["Ctrl+P", "Tab"],
		keywords: [
			"план лечения",
			"планы",
			"смета",
			"сметы",
			"счёт",
			"счет",
			"счета",
			"варианты",
			"этапы",
			"скидка",
			"стоимость",
			"расчет",
			"расчёт",
			"цена",
			"прайс",
			"прейскурант",
			"услуги",
			"лечение",
			"рассрочка",
			"протокол",
		],
	},
	{
		id: "dental_lab",
		category: "lab_warehouse",
		title: "Зуботехническая лаборатория (ЗТЛ)",
		shortTitle: "Лаборатория",
		badge: "Наряды ЗТЛ",
		description: "Электронные наряды технику, выбор расцветки по шкале VITA (A1–D4), сроки примерки и готовности коронок.",
		hotkeys: ["Ctrl+L", "V"],
		keywords: [
			"лаборатория",
			"зтл",
			"наряд",
			"наряды",
			"техник",
			"коронка",
			"коронки",
			"зуб",
			"зубы",
			"vita",
			"вита",
			"цвет",
			"оттенок",
			"примерка",
			"винир",
			"виниры",
			"протез",
			"мост",
			"слепок",
			"скан",
			"stl",
			"каркас",
			"цирконий",
		],
	},
	{
		id: "inventory",
		category: "lab_warehouse",
		title: "Склад и материалы (Мягкий овердрафт)",
		shortTitle: "Склад",
		badge: "Материалы",
		description: "Фоновое автосписание по техкартам оказанных услуг, партии FEFO и мягкий овердрафт без блокировки врача.",
		hotkeys: ["Ctrl+I", "F8"],
		keywords: [
			"склад",
			"материалы",
			"материал",
			"анестетик",
			"карпула",
			"карпулы",
			"бор",
			"перчатки",
			"списание",
			"автосписание",
			"овердрафт",
			"остатки",
			"накладная",
			"партия",
			"fefo",
			"срок годности",
			"инвентаризация",
			"техкарта",
		],
	},
	{
		id: "sanpin",
		category: "infrastructure",
		title: "Стерилизация, чистота и журнал автоклава",
		shortTitle: "Стерилизация",
		badge: "Чистота и автоклав",
		description: "Журнал автоклавирования, этикетки крафт-пакетов DataMatrix, пробы азопирам/фенолфталеин в 1 клик.",
		hotkeys: ["Ctrl+Alt+S", "Ctrl+P"],
		keywords: [
			"стерилизация",
			"автоклав",
			"автоклавирование",
			"крафт-пакет",
			"крафт",
			"пакет",
			"пакеты",
			"азопирам",
			"проба",
			"пробы",
			"псо",
			"этикетка",
			"datamatrix",
			"чистота",
			"дезинфекция",
			"санпин",
			"роспотребнадзор",
			"журнал",
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
		keywords: [
			"лиды",
			"лид",
			"звонки",
			"звонок",
			"телефония",
			"атс",
			"канбан",
			"воронка",
			"обращения",
			"заявка",
			"заявки",
			"телефон",
			"номер",
			"пациент",
			"консультация",
			"доходимость",
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
		keywords: [
			"lan",
			"mesh",
			"планшет",
			"планшеты",
			"офлайн",
			"вайфай",
			"wifi",
			"сопряжение",
			"pin",
			"пин",
			"qr",
			"сеть",
			"локальная",
			"синхронизация",
			"автономия",
			"роутер",
			"планшет врача",
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
		keywords: [
			"аналитика",
			"выручка",
			"доход",
			"зарплата",
			"зарплаты",
			"отчеты",
			"отчет",
			"отчёты",
			"отчёт",
			"загрузка",
			"чек",
			"средний чек",
			"дашборд",
			"статистика",
			"кпи",
			"kpi",
			"сделка",
			"т-51",
			"1с",
		],
	},
];

export function getGuideById(id: ClinicalGuideTab): ClinicalGuideMeta | undefined {
	return CLINICAL_GUIDES.find((g) => g.id === id);
}

export function getGuidesByCategory(category: ClinicalGuideCategory): ClinicalGuideMeta[] {
	return CLINICAL_GUIDES.filter((g) => g.category === category);
}

/**
 * Clinical Synonym & Morphological Keyword Map
 * Maps clinical search terms, inflections, and doctor jargon to target guide IDs.
 */
const CLINICAL_SYNONYM_MAP: Record<string, readonly ClinicalGuideTab[]> = {
	// Cashier, Bills & Payments
	"счет": ["cashier", "treatment_plans"],
	"счета": ["cashier", "treatment_plans"],
	"счетами": ["cashier", "treatment_plans"],
	"счету": ["cashier", "treatment_plans"],
	"оплата": ["cashier", "treatment_plans"],
	"оплаты": ["cashier", "treatment_plans"],
	"оплатить": ["cashier"],
	"оплате": ["cashier"],
	"чек": ["cashier"],
	"чеки": ["cashier"],
	"чеком": ["cashier"],
	"чеков": ["cashier"],
	"деньги": ["cashier", "analytics"],
	"касса": ["cashier"],
	"кассы": ["cashier"],
	"ккт": ["cashier"],
	"нал": ["cashier"],
	"наличные": ["cashier"],
	"безнал": ["cashier"],
	"терминал": ["cashier"],
	"сбп": ["cashier"],
	"qr": ["cashier", "lan_mesh"],

	// Odontogram, Teeth, Pediatric
	"зуб": ["odontogram", "dental_lab"],
	"зубы": ["odontogram", "dental_lab"],
	"зубов": ["odontogram", "dental_lab"],
	"зубам": ["odontogram", "dental_lab"],
	"зубами": ["odontogram", "dental_lab"],
	"детский": ["odontogram"],
	"детские": ["odontogram"],
	"детского": ["odontogram"],
	"дети": ["odontogram"],
	"молочные": ["odontogram"],
	"молочный": ["odontogram"],
	"прикус": ["odontogram"],
	"эмаль": ["odontogram"],
	"кариес": ["odontogram"],
	"пульпит": ["odontogram"],
	"пломба": ["odontogram"],
	"пломбы": ["odontogram"],
	"пародонт": ["odontogram"],

	// Imaging & 3D CT
	"снимок": ["imaging"],
	"снимки": ["imaging"],
	"снимка": ["imaging"],
	"снимков": ["imaging"],
	"рентген": ["imaging"],
	"рентгена": ["imaging"],
	"кт": ["imaging"],
	"клкт": ["imaging"],
	"томография": ["imaging"],
	"томограмма": ["imaging"],
	"визиограф": ["imaging"],
	"панорама": ["imaging"],
	"оптг": ["imaging"],
	"mpr": ["imaging"],
	"dicom": ["imaging"],

	// Treatment Plans & Cost Estimates
	"смета": ["treatment_plans"],
	"сметы": ["treatment_plans"],
	"план": ["treatment_plans"],
	"планы": ["treatment_plans"],
	"стоимость": ["treatment_plans", "cashier"],
	"расчет": ["treatment_plans", "cashier", "analytics"],
	"расчёт": ["treatment_plans", "cashier", "analytics"],
	"прайс": ["treatment_plans"],
	"прейскурант": ["treatment_plans"],
	"рассрочка": ["treatment_plans"],

	// Dental Lab
	"лаба": ["dental_lab"],
	"лаборатория": ["dental_lab"],
	"наряд": ["dental_lab"],
	"наряды": ["dental_lab"],
	"техник": ["dental_lab"],
	"технику": ["dental_lab"],
	"коронка": ["dental_lab", "odontogram"],
	"коронки": ["dental_lab", "odontogram"],
	"vita": ["dental_lab"],
	"вита": ["dental_lab"],
	"винир": ["dental_lab"],
	"виниры": ["dental_lab"],
	"слепок": ["dental_lab"],
	"слепки": ["dental_lab"],

	// Warehouse & Inventory
	"склад": ["inventory"],
	"материал": ["inventory"],
	"материалы": ["inventory"],
	"овердрафт": ["inventory"],
	"списание": ["inventory"],
	"автосписание": ["inventory"],
	"остатки": ["inventory"],
	"анестетик": ["inventory", "medical_record"],
	"карпула": ["inventory"],
	"карпулы": ["inventory"],
	"fefo": ["inventory"],

	// Sterilization & Hygiene
	"стерилизация": ["sanpin"],
	"автоклав": ["sanpin"],
	"автоклавирование": ["sanpin"],
	"крафт": ["sanpin"],
	"пакет": ["sanpin"],
	"пакеты": ["sanpin"],
	"азопирам": ["sanpin"],
	"проба": ["sanpin"],
	"пробы": ["sanpin"],
	"дезинфекция": ["sanpin"],
	"чистота": ["sanpin"],
	"санпин": ["sanpin"],

	// Telephony & Leads
	"звонок": ["leads"],
	"звонки": ["leads"],
	"звонка": ["leads"],
	"телефон": ["leads"],
	"атс": ["leads"],
	"лид": ["leads"],
	"лиды": ["leads"],
	"воронка": ["leads"],
	"канбан": ["leads"],
	"заявка": ["leads"],
	"заявки": ["leads"],

	// LAN Mesh
	"планшет": ["lan_mesh"],
	"планшеты": ["lan_mesh"],
	"вайфай": ["lan_mesh"],
	"wifi": ["lan_mesh"],
	"сеть": ["lan_mesh"],
	"mesh": ["lan_mesh"],
	"офлайн": ["lan_mesh"],
	"сопряжение": ["lan_mesh"],
	"пин": ["lan_mesh"],
	"pin": ["lan_mesh"],

	// Analytics
	"аналитика": ["analytics"],
	"отчет": ["analytics"],
	"отчеты": ["analytics"],
	"отчёт": ["analytics"],
	"отчёты": ["analytics"],
	"выручка": ["analytics"],
	"доход": ["analytics"],
	"зарплата": ["analytics"],
	"зарплаты": ["analytics"],
	"кпи": ["analytics"],
	"kpi": ["analytics"],

	// Schedule
	"расписание": ["schedule"],
	"запись": ["schedule", "leads"],
	"прием": ["schedule", "medical_record"],
	"приём": ["schedule", "medical_record"],
	"кресло": ["schedule"],
	"смена": ["schedule"],
	"визит": ["schedule", "medical_record"],
	"окно": ["schedule"],

	// Medical Record
	"карта": ["medical_record"],
	"медкарта": ["medical_record"],
	"дневник": ["medical_record"],
	"анамнез": ["medical_record"],
	"жалобы": ["medical_record"],
	"согласие": ["medical_record"],
	"идс": ["medical_record"],
	"диктовка": ["medical_record"],
};

function normalizeSearchTerm(term: string): string {
	return term
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Searches clinical guides using direct matching, synonym expansion, and morphological roots.
 */
export function searchClinicalGuides(query: string): ClinicalGuideMeta[] {
	const rawClean = query.trim();
	if (!rawClean) return [...CLINICAL_GUIDES];

	const normalizedQuery = normalizeSearchTerm(rawClean);
	if (!normalizedQuery) return [...CLINICAL_GUIDES];

	const queryWords = normalizedQuery.split(" ").filter((w) => w.length > 0);

	// Gather target guide IDs from synonym map
	const synonymMatchedIds = new Set<ClinicalGuideTab>();
	for (const word of queryWords) {
		const matched = CLINICAL_SYNONYM_MAP[word];
		if (matched) {
			for (const id of matched) {
				synonymMatchedIds.add(id);
			}
		}
	}

	return CLINICAL_GUIDES.filter((guide) => {
		// 1. Synonym direct hit
		if (synonymMatchedIds.has(guide.id)) {
			return true;
		}

		// 2. Full normalized string match
		const normTitle = normalizeSearchTerm(guide.title);
		const normShortTitle = normalizeSearchTerm(guide.shortTitle);
		const normDesc = normalizeSearchTerm(guide.description);
		const normBadge = normalizeSearchTerm(guide.badge);

		if (
			normTitle.includes(normalizedQuery) ||
			normShortTitle.includes(normalizedQuery) ||
			normDesc.includes(normalizedQuery) ||
			normBadge.includes(normalizedQuery)
		) {
			return true;
		}

		// 3. Keyword and hotkey match
		const normKeywords = guide.keywords.map(normalizeSearchTerm);
		if (normKeywords.some((k) => k.includes(normalizedQuery) || normalizedQuery.includes(k))) {
			return true;
		}

		if (
			guide.hotkeys &&
			guide.hotkeys.some((h) => normalizeSearchTerm(h).includes(normalizedQuery))
		) {
			return true;
		}

		// 4. Word-by-word prefix/stem matching (min 3 chars)
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

