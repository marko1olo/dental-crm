/**
 * apps/web/src/components/catalog/pricelistCatalogData.ts
 *
 * Канонический SSOT данных прейскуранта услуг стоматологической клиники.
 * Разработан по стандартам доказательной частной стоматологии РФ (1–5 кресел).
 *
 * Инварианты:
 * 1. Мандат 8b/8zi: Sweet Spot ~300-380 строк без микро-шредера.
 * 2. Мандат 8x: Человеческий клинический язык без советского канцелярита и 804н в UI.
 * 3. Мандат 8e & 8n: Автономия врача, 0 float-ошибок, строгие целочисленные копейки.
 * 4. 6 канонических клинических категорий: Терапия, Хирургия, Ортопедия, Ортодонтия, Гигиена, Диагностика.
 */

export type PricelistCategoryKey =
	| "diagnostics"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "hygiene"
	| "orthodontics";

export interface PricelistCategoryMeta {
	readonly key: PricelistCategoryKey;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly badgeClass: string;
}

export const CANONICAL_CLINICAL_CATEGORIES: readonly PricelistCategoryMeta[] = [
	{
		key: "diagnostics",
		title: "Диагностика и снимки",
		shortTitle: "Диагностика",
		description: "Консультации, прицельные снимки, КЛКТ и планы лечения",
		badgeClass: "badge-diagnostics",
	},
	{
		key: "therapy",
		title: "Терапия и лечение",
		shortTitle: "Терапия",
		description: "Лечение кариеса, пульпита, каналов и реставрации",
		badgeClass: "badge-therapy",
	},
	{
		key: "surgery",
		title: "Хирургия и имплантация",
		shortTitle: "Хирургия",
		description: "Удаление зубов, синус-лифтинг и установка имплантатов",
		badgeClass: "badge-surgery",
	},
	{
		key: "orthopedics",
		title: "Ортопедия и коронки",
		shortTitle: "Ортопедия",
		description: "Коронки, виниры, протезы и восстановление окклюзии",
		badgeClass: "badge-orthopedics",
	},
	{
		key: "hygiene",
		title: "Профгигиена и пародонтология",
		shortTitle: "Гигиена",
		description: "Air-Flow, ультразвук, фторирование и лечение десен",
		badgeClass: "badge-hygiene",
	},
	{
		key: "orthodontics",
		title: "Ортодонтия и прикус",
		shortTitle: "Ортодонтия",
		description: "Брекет-системы, элайнеры и ретенционные аппараты",
		badgeClass: "badge-orthodontics",
	},
];

export interface PricelistStudioItem {
	readonly id: string;
	readonly code: string;
	readonly serviceCode?: string | undefined;
	readonly regulatoryCode?: string | undefined;
	readonly title: string;
	readonly category: PricelistCategoryKey;
	readonly priceKopecks: number;
	readonly costKopecks: number;
	readonly durationMin: number;
	readonly isActive: boolean;
	readonly tags?: readonly string[] | undefined;
	readonly isBundle?: boolean | undefined;
}

export interface PricelistClinicalBundle {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: PricelistCategoryKey;
	readonly priceKopecks: number;
	readonly itemsCount: number;
	readonly items: readonly string[];
}

export const CANONICAL_CLINICAL_BUNDLES: readonly PricelistClinicalBundle[] = [
	{
		id: "bundle-caries",
		title: "Лечение глубокого кариеса под ключ",
		shortTitle: "Кариес под ключ",
		description: "Анестезия + коффердам + некрэктомия + световая пломба Estelite + полировка",
		category: "therapy",
		priceKopecks: 750000,
		itemsCount: 5,
		items: ["Анестезия инфильтрационная", "Коффердам", "Препарирование полости", "Световая пломба", "Шлифовка и полировка"],
	},
	{
		id: "bundle-hygiene",
		title: "Комплексная профгигиена Air-Flow + ультразвук",
		shortTitle: "Профгигиена под ключ",
		description: "Ультразвуковой скейлинг + Air-Flow + полировка пастой + глубокое фторирование",
		category: "hygiene",
		priceKopecks: 650000,
		itemsCount: 4,
		items: ["Ультразвуковое удаление камня", "Air-Flow чистка", "Полировка пастами", "Глубокое фторирование"],
	},
	{
		id: "bundle-ext-simple",
		title: "Удаление зуба простое с анестезией под ключ",
		shortTitle: "Удаление простое под ключ",
		description: "Анестезия + атравматичное удаление + кюретаж + гемостаз + Альвожиль",
		category: "surgery",
		priceKopecks: 680000,
		itemsCount: 5,
		items: ["Анестезия Ультракаин", "Атравматичное удаление", "Кюретаж лунки", "Первичный гемостаз", "Паста Альвожиль"],
	},
	{
		id: "bundle-ext-complex",
		title: "Удаление зуба сложное с анестезией под ключ",
		shortTitle: "Сложное удаление под ключ",
		description: "Проводниковая анестезия + сепарация корней + глубокий кюретаж + швы Vicryl",
		category: "surgery",
		priceKopecks: 850000,
		itemsCount: 4,
		items: ["Проводниковая анестезия", "Сепарация корней", "Кюретаж лунки", "Швы Vicryl"],
	},
	{
		id: "bundle-endo",
		title: "Эндодонтия моляра под ключ (3 канала)",
		shortTitle: "Эндодонтия 3 канала под ключ",
		description: "Анестезия + коффердам + машинная обработка 3 каналов + 3D обтурация + снимок",
		category: "therapy",
		priceKopecks: 1620000,
		itemsCount: 5,
		items: ["Анестезия проводниковая", "Коффердам на моляр", "NiTi обработка 3 каналов", "Пломбирование гуттаперчей", "Контрольная визиография"],
	},
	{
		id: "bundle-implant",
		title: "Дентальная имплантация под ключ",
		shortTitle: "Имплантация под ключ",
		description: "Анестезия + ложе + имплантат титановый + формирователь десны + снимок",
		category: "surgery",
		priceKopecks: 4150000,
		itemsCount: 4,
		items: ["Анестезия", "Установка имплантата Osstem", "Формирователь десны", "Рентген-контроль"],
	},
];

/**
 * 0 float-ошибок: конвертация копеек в рубли и обратно
 */
export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.round(Number.isFinite(kopecks) ? kopecks : 0);
	const rubles = Math.floor(safeKopecks / 100);
	return `${rubles.toLocaleString("ru-RU")}\u00A0₽`;
}

export function parseRublesToKopecks(rublesInput: string | number): number {
	if (typeof rublesInput === "number") {
		return Math.round(rublesInput * 100);
	}
	const cleaned = rublesInput
		.replace(/[^\d.,]/g, "")
		.replace(",", ".");
	const num = parseFloat(cleaned);
	return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

export function kopecksToRublesNumber(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

export function calculateMarginKopecks(
	priceKopecks: number,
	costKopecks: number,
): number {
	return Math.max(0, priceKopecks - costKopecks);
}

export function calculateMarginPercent(
	priceKopecks: number,
	costKopecks: number,
): number {
	if (priceKopecks <= 0) return 0;
	const margin = calculateMarginKopecks(priceKopecks, costKopecks);
	return Math.round((margin / priceKopecks) * 100);
}

/**
 * Базовый золотой пресет прейскуранта РФ для частной клиники 1–5 кресел
 */
export const CANONICAL_PRICELIST_PRESETS: readonly PricelistStudioItem[] = [
	// 1. Диагностика
	{
		id: "srv-diag-01",
		code: "ДИАГ-01",
		title: "Консультация стоматолога (первичная)",
		category: "diagnostics",
		priceKopecks: 150000,
		costKopecks: 20000,
		durationMin: 30,
		isActive: true,
		tags: ["осмотр", "консультация", "первичный"],
	},
	{
		id: "srv-diag-02",
		code: "ДИАГ-02",
		title: "Прицельный снимок / Визиография",
		category: "diagnostics",
		priceKopecks: 50000,
		costKopecks: 5000,
		durationMin: 15,
		isActive: true,
		tags: ["снимок", "рентген", "визиограф"],
	},
	{
		id: "srv-diag-03",
		code: "ДИАГ-03",
		title: "Компьютерная томография (КЛКТ обеих челюстей)",
		category: "diagnostics",
		priceKopecks: 350000,
		costKopecks: 40000,
		durationMin: 20,
		isActive: true,
		tags: ["кт", "клкт", "томография", "3d"],
	},

	// 2. Терапия
	{
		id: "srv-ther-01",
		code: "ТЕР-01",
		title: "Лечение кариеса (световая пломба)",
		category: "therapy",
		priceKopecks: 450000,
		costKopecks: 70000,
		durationMin: 45,
		isActive: true,
		tags: ["кариес", "пломба", "эстелайт", "световая"],
	},
	{
		id: "srv-ther-02",
		code: "ТЕР-02",
		title: "Эндодонтическое лечение (1 канал)",
		category: "therapy",
		priceKopecks: 600000,
		costKopecks: 120000,
		durationMin: 60,
		isActive: true,
		tags: ["пульпит", "эндодонтия", "канал", "депульпация"],
	},
	{
		id: "srv-ther-03",
		code: "ТЕР-03",
		title: "Художественная реставрация зуба",
		category: "therapy",
		priceKopecks: 750000,
		costKopecks: 150000,
		durationMin: 60,
		isActive: true,
		tags: ["реставрация", "эстетика", "композит"],
	},

	// 3. Хирургия
	{
		id: "srv-surg-01",
		code: "ХИР-01",
		title: "Удаление зуба (простое)",
		category: "surgery",
		priceKopecks: 250000,
		costKopecks: 35000,
		durationMin: 30,
		isActive: true,
		tags: ["удаление", "экстракция", "хирургия"],
	},
	{
		id: "srv-surg-02",
		code: "ХИР-02",
		title: "Удаление зуба мудрости (сложное)",
		category: "surgery",
		priceKopecks: 700000,
		costKopecks: 90000,
		durationMin: 60,
		isActive: true,
		tags: ["восьмерка", "ретинированный", "мудрость"],
	},
	{
		id: "srv-surg-03",
		code: "ХИР-03",
		title: "Имплантат под ключ",
		category: "surgery",
		priceKopecks: 3500000,
		costKopecks: 1100000,
		durationMin: 60,
		isActive: true,
		tags: ["имплантация", "титан", "osstem", "имплант"],
	},

	// 4. Ортопедия
	{
		id: "srv-ortho-01",
		code: "ОРТ-01",
		title: "Металлокерамическая коронка",
		category: "orthopedics",
		priceKopecks: 1200000,
		costKopecks: 420000,
		durationMin: 45,
		isActive: true,
		tags: ["коронка", "металлокерамика", "протезирование"],
	},
	{
		id: "srv-ortho-02",
		code: "ОРТ-02",
		title: "Коронка из диоксида циркония",
		category: "orthopedics",
		priceKopecks: 2400000,
		costKopecks: 750000,
		durationMin: 45,
		isActive: true,
		tags: ["цирконий", "безметалловая", "коронка", "ztl"],
	},
	{
		id: "srv-ortho-03",
		code: "ОРТ-03",
		title: "Винир керамический E.max",
		category: "orthopedics",
		priceKopecks: 2600000,
		costKopecks: 820000,
		durationMin: 60,
		isActive: true,
		tags: ["винир", "emax", "голливудская улыбка"],
	},

	// 5. Профгигиена
	{
		id: "srv-hyg-01",
		code: "ГИГ-01",
		title: "Профессиональная гигиена полости рта (Air-Flow + УЗ)",
		category: "hygiene",
		priceKopecks: 420000,
		costKopecks: 65000,
		durationMin: 45,
		isActive: true,
		tags: ["чистка", "air-flow", "ультразвук", "камни", "налет"],
	},
	{
		id: "srv-hyg-02",
		code: "ГИГ-02",
		title: "Глубокое фторирование эмали и ремотерапия",
		category: "hygiene",
		priceKopecks: 180000,
		costKopecks: 30000,
		durationMin: 20,
		isActive: true,
		tags: ["фторирование", "эмаль", "чувствительность"],
	},

	// 6. Ортодонтия
	{
		id: "srv-orthodont-01",
		code: "БРЕК-01",
		title: "Установка металлической брекет-системы (1 челюсть)",
		category: "orthodontics",
		priceKopecks: 4500000,
		costKopecks: 1400000,
		durationMin: 90,
		isActive: true,
		tags: ["брекеты", "ортодонтия", "прикус", "выравнивание"],
	},
	{
		id: "srv-orthodont-02",
		code: "БРЕК-02",
		title: "Элайнеры / Ортодонтическая ретенционная каппа",
		category: "orthodontics",
		priceKopecks: 1500000,
		costKopecks: 450000,
		durationMin: 30,
		isActive: true,
		tags: ["элайнеры", "каппа", "ретейнер"],
	},
];

const LOCAL_STORAGE_KEY = "dente_canonical_pricelist_v2";

/**
 * Загрузка сохраненного прейскуранта или возврат базового пресета
 */
export function loadCanonicalPricelist(): readonly PricelistStudioItem[] {
	if (typeof window === "undefined") return CANONICAL_PRICELIST_PRESETS;
	try {
		const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
		if (!raw) return CANONICAL_PRICELIST_PRESETS;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.length > 0) {
			return parsed as readonly PricelistStudioItem[];
		}
	} catch (e) {
		console.warn("Failed to read pricelist from storage, using preset fallback", e);
	}
	return CANONICAL_PRICELIST_PRESETS;
}

/**
 * Сохранение прейскуранта в постоянную память браузера
 */
export function saveCanonicalPricelist(
	items: readonly PricelistStudioItem[],
): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
	} catch (e) {
		console.warn("Failed to persist pricelist to storage", e);
	}
}

/**
 * Поиск и фильтрация услуг за 1 клик
 */
export function filterPricelist(
	items: readonly PricelistStudioItem[],
	selectedCategory: PricelistCategoryKey | "all",
	searchQuery: string,
): readonly PricelistStudioItem[] {
	const query = searchQuery.trim().toLowerCase();
	return items.filter((item) => {
		if (selectedCategory !== "all" && item.category !== selectedCategory) {
			return false;
		}
		if (!query) return true;
		const matchTitle = item.title.toLowerCase().includes(query);
		const matchCode = item.code.toLowerCase().includes(query);
		const matchTags =
			item.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false;
		return matchTitle || matchCode || matchTags;
	});
}

/**
 * Сводная статистика прейскуранта
 */
export function calculatePricelistStats(items: readonly PricelistStudioItem[]) {
	const totalItems = items.length;
	const activeItems = items.filter((i) => i.isActive).length;
	const totalRevenuePotentialKopecks = items.reduce(
		(sum, item) => sum + (item.isActive ? item.priceKopecks : 0),
		0,
	);
	const avgMarginPercent =
		totalItems > 0
			? Math.round(
					items.reduce(
						(sum, item) =>
							sum + calculateMarginPercent(item.priceKopecks, item.costKopecks),
						0,
					) / totalItems,
				)
			: 0;

	return {
		totalItems,
		activeItems,
		totalRevenuePotentialKopecks,
		avgMarginPercent,
	};
}
