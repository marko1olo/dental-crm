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

import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export type PricelistCategoryKey =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "implantology"
	| "pediatric"
	| "hygiene"
	| "diagnostics";

/**
 * Двусторонний маппинг категорий фронтенда со схемой serviceCategorySchema бэкенда (DEF-PRICE-01).
 * Предотвращает 400 Bad Request при отправке данных в Fastify API /api/pricelist.
 */
export function normalizeCategoryToBackend(category: string): ServiceCategory {
	switch (category) {
		case "orthopedics":
			return "prosthetics";
		case "diagnostics":
			return "imaging";
		case "implantology":
			return "surgery";
		case "pediatric":
			return "therapy";
		case "consultation":
		case "therapy":
		case "surgery":
		case "prosthetics":
		case "orthodontics":
		case "periodontology":
		case "hygiene":
		case "imaging":
		case "documents":
		case "other":
			return category;
		default:
			return "other";
	}
}

/**
 * Нормализация категории бэкенда в категорию студии прейскуранта фронтенда (DEF-PRICE-01).
 */
export function normalizeCategoryFromBackend(category: string | null | undefined): PricelistCategoryKey {
	switch (category) {
		case "prosthetics":
			return "orthopedics";
		case "imaging":
		case "consultation":
		case "documents":
			return "diagnostics";
		case "surgery":
			return "surgery";
		case "orthodontics":
			return "orthodontics";
		case "hygiene":
		case "periodontology":
			return "hygiene";
		case "pediatric":
			return "pediatric";
		case "implantology":
			return "implantology";
		case "therapy":
		default:
			return "therapy";
	}
}

/**
 * Динамическое определение специальности врача по категории услуги (DEF-PRICE-04).
 * Исключает хардкод therapist для 100% услуг прейскуранта.
 */
export function getSpecialtyForCategory(category: string): DentalSpecialty {
	switch (category) {
		case "surgery":
		case "implantology":
			return "surgeon";
		case "orthopedics":
		case "prosthetics":
			return "orthopedist";
		case "orthodontics":
			return "orthodontist";
		case "hygiene":
			return "hygienist";
		case "pediatric":
			return "pediatric";
		case "diagnostics":
		case "imaging":
			return "radiologist";
		case "periodontology":
			return "periodontist";
		case "therapy":
		case "consultation":
		default:
			return "therapist";
	}
}

/**
 * Получение человекочитаемого названия категории для UI без утечки английских энумов (DEF-PRICE-03).
 */
export function getCategoryDisplayLabel(category: string): string {
	const found = CANONICAL_CLINICAL_CATEGORIES.find((c) => c.key === category);
	if (found) return found.shortTitle;
	switch (category) {
		case "prosthetics":
			return "Ортопедия";
		case "imaging":
			return "Диагностика";
		case "consultation":
			return "Консультация";
		case "periodontology":
			return "Пародонтология";
		case "documents":
			return "Документы";
		case "other":
			return "Прочее";
		default:
			return category;
	}
}

export interface PricelistCategoryMeta {
	readonly key: PricelistCategoryKey;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly badgeClass: string;
}

export const CANONICAL_CLINICAL_CATEGORIES: readonly PricelistCategoryMeta[] = [
	{
		key: "therapy",
		title: "Терапия и лечение",
		shortTitle: "Терапия",
		description: "Лечение кариеса, пульпита, каналов и эстетические реставрации",
		badgeClass: "badge-therapy",
	},
	{
		key: "surgery",
		title: "Хирургия и удаление",
		shortTitle: "Хирургия",
		description: "Удаление зубов любой сложности, резекции верхушек, пластика уздечек",
		badgeClass: "badge-surgery",
	},
	{
		key: "orthopedics",
		title: "Ортопедия и коронки",
		shortTitle: "Ортопедия",
		description: "Коронки, мостовидные протезы, виниры, съемное протезирование",
		badgeClass: "badge-orthopedics",
	},
	{
		key: "orthodontics",
		title: "Ортодонтия и прикус",
		shortTitle: "Ортодонтия",
		description: "Брекет-системы, ортодонтические дуги, элайнеры, ретейнеры",
		badgeClass: "badge-orthodontics",
	},
	{
		key: "implantology",
		title: "Имплантология",
		shortTitle: "Имплантация",
		description: "Дентальная имплантация, остеопластика, синус-лифтинг и формирователи десны",
		badgeClass: "badge-implantology",
	},
	{
		key: "pediatric",
		title: "Детская стоматология",
		shortTitle: "Детство",
		description: "Адаптационный приём, лечение молочных зубов, цветные пломбы, герметизация",
		badgeClass: "badge-pediatric",
	},
	{
		key: "hygiene",
		title: "Профилактика и гигиена",
		shortTitle: "Гигиена",
		description: "Air-Flow, ультразвуковой скейлинг, полировка, фторирование и пародонтология",
		badgeClass: "badge-hygiene",
	},
	{
		key: "diagnostics",
		title: "Диагностика и снимки",
		shortTitle: "Диагностика",
		description: "Консультации, прицельные снимки, радиовизиография, КЛКТ 3D",
		badgeClass: "badge-diagnostics",
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
		id: "caries_turnkey",
		title: "Кариес под ключ (анестезия + коффердам + пломба Estelite)",
		shortTitle: "Кариес под ключ",
		description: "Анестезия + коффердам + препарирование + бондинг + пломба световая Estelite",
		category: "therapy",
		priceKopecks: 750000,
		itemsCount: 5,
		items: ["Анестезия инфильтрационная", "Коффердам", "Препарирование полости", "Бондинг эмали и дентина", "Пломба световая Estelite", "Шлифовка и полировка"],
	},
	{
		id: "endo_1canal_turnkey",
		title: "Пульпит 3 канала под ключ",
		shortTitle: "Пульпит 3 канала под ключ",
		description: "Анестезия + мехобработка + медикаментозная обработка + пломбирование гуттаперчей",
		category: "therapy",
		priceKopecks: 1620000,
		itemsCount: 5,
		items: ["Анестезия проводниковая", "Коффердам", "Мехобработка 3 каналов", "Медикаментозная обработка", "Пломбирование гуттаперчей", "Световая пломба"],
	},
	{
		id: "hygiene_turnkey",
		title: "Комплексная гигиена AirFlow + ультразвук",
		shortTitle: "Профгигиена под ключ",
		description: "Ультразвуковой скейлинг + AirFlow + полировка + глубокое фторирование",
		category: "hygiene",
		priceKopecks: 650000,
		itemsCount: 4,
		items: ["Ультразвуковой скейлинг", "AirFlow полировка налета", "Полировка пастами", "Глубокое фторирование эмали"],
	},
	{
		id: "complex_extraction",
		title: "Удаление зуба сложное с анестезией и швами",
		shortTitle: "Сложное удаление под ключ",
		description: "Проводниковая анестезия + сепарация корней + удаление + швы Vicryl",
		category: "surgery",
		priceKopecks: 850000,
		itemsCount: 5,
		items: ["Проводниковая анестезия", "Сепарация корней", "Кюретаж лунки", "Местный гемостаз", "Наложение швов Vicryl"],
	},
	{
		id: "extraction_turnkey",
		title: "Удаление зуба простое с анестезией под ключ",
		shortTitle: "Удаление простое под ключ",
		description: "Анестезия + атравматичное удаление + кюретаж + гемостаз + Альвожиль",
		category: "surgery",
		priceKopecks: 680000,
		itemsCount: 5,
		items: ["Анестезия Ультракаин", "Атравматичное удаление", "Кюретаж лунки", "Первичный гемостаз", "Паста Альвожиль"],
	},
	{
		id: "implant_turnkey",
		title: "Дентальная имплантация под ключ",
		shortTitle: "Имплантация под ключ",
		description: "Анестезия + ложе + имплантат титановый + формирователь десны + снимок",
		category: "implantology",
		priceKopecks: 4150000,
		itemsCount: 4,
		items: ["Анестезия", "Установка имплантата Osstem", "Формирователь десны", "Рентген-контроль"],
	},
	{
		id: "bundle-kids",
		title: "Детский приём без страха (адаптация + цветная пломба + подарок)",
		shortTitle: "Детство под ключ",
		description: "Адаптационный приём + чистка + цветная пломба Twinky Star + фторирование",
		category: "pediatric",
		priceKopecks: 420000,
		itemsCount: 4,
		items: ["Адаптация ребенка", "Обезболивание гелем", "Пломба Twinky Star", "Подарок за смелость"],
	},
];

/**
 * 0 float-ошибок: конвертация копеек в рубли и обратно (DEF-PRICE-02)
 */
export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.round(Number.isFinite(kopecks) ? kopecks : 0);
	const rubles = safeKopecks / 100;
	return (
		new Intl.NumberFormat("ru-RU", {
			minimumFractionDigits: safeKopecks % 100 === 0 ? 0 : 2,
			maximumFractionDigits: 2,
		}).format(rubles) + "\u00A0₽"
	);
}

export function kopecksToRublesExact(kopecks: number): string {
	const safeKopecks = Math.round(Number.isFinite(kopecks) ? kopecks : 0);
	if (safeKopecks % 100 === 0) {
		return String(safeKopecks / 100);
	}
	return (safeKopecks / 100).toFixed(2);
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
		tags: ["удаление", "экстракция", "хирургия", "вырвать"],
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
		tags: ["восьмерка", "ретинированный", "мудрость", "дистопированный"],
	},
	{
		id: "srv-surg-03",
		code: "ХИР-03",
		title: "Резекция верхушки корня зуба",
		category: "surgery",
		priceKopecks: 450000,
		costKopecks: 60000,
		durationMin: 45,
		isActive: true,
		tags: ["резекция", "корень", "хирургия", "верхушка"],
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
		tags: ["коронка", "металлокерамика", "протезирование", "мост"],
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
		tags: ["цирконий", "безметалловая", "коронка", "ztl", "протезирование"],
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
		tags: ["винир", "emax", "голливудская улыбка", "эстетика"],
	},

	// 5. Ортодонтия
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
		tags: ["элайнеры", "каппа", "ретейнер", "ортодонтия"],
	},

	// 6. Имплантология
	{
		id: "srv-impl-01",
		code: "ИМПЛ-01",
		title: "Имплантат под ключ",
		category: "implantology",
		priceKopecks: 3500000,
		costKopecks: 1100000,
		durationMin: 60,
		isActive: true,
		tags: ["имплантация", "титан", "osstem", "имплант", "вживление", "штифт"],
	},
	{
		id: "srv-impl-02",
		code: "ИМПЛ-02",
		title: "Установка формирователя десны",
		category: "implantology",
		priceKopecks: 450000,
		costKopecks: 80000,
		durationMin: 20,
		isActive: true,
		tags: ["имплантация", "формирователь", "десна"],
	},
	{
		id: "srv-impl-03",
		code: "ИМПЛ-03",
		title: "Синус-лифтинг (закрытый)",
		category: "implantology",
		priceKopecks: 1800000,
		costKopecks: 450000,
		durationMin: 45,
		isActive: true,
		tags: ["синус", "синуслифтинг", "кость", "имплантация"],
	},

	// 7. Детская стоматология
	{
		id: "srv-ped-01",
		code: "ДЕТ-01",
		title: "Адаптационный осмотр ребенка и консультация",
		category: "pediatric",
		priceKopecks: 150000,
		costKopecks: 20000,
		durationMin: 30,
		isActive: true,
		tags: ["детство", "дети", "адаптация", "консультация", "ребенок", "детский"],
	},
	{
		id: "srv-ped-02",
		code: "ДЕТ-02",
		title: "Лечение кариеса молочного зуба с цветной пломбой Twinky Star",
		category: "pediatric",
		priceKopecks: 320000,
		costKopecks: 50000,
		durationMin: 30,
		isActive: true,
		tags: ["детство", "дети", "молочный", "кариес", "твинки", "цветная", "пломба"],
	},
	{
		id: "srv-ped-03",
		code: "ДЕТ-03",
		title: "Герметизация фиссур молочного зуба",
		category: "pediatric",
		priceKopecks: 180000,
		costKopecks: 30000,
		durationMin: 20,
		isActive: true,
		tags: ["детство", "дети", "герметизация", "фиссуры", "профилактика"],
	},

	// 8. Профгигиена
	{
		id: "srv-hyg-01",
		code: "ГИГ-01",
		title: "Профессиональная гигиена полости рта (Air-Flow + УЗ)",
		category: "hygiene",
		priceKopecks: 420000,
		costKopecks: 65000,
		durationMin: 45,
		isActive: true,
		tags: ["чистка", "air-flow", "ультразвук", "камни", "налет", "гигиена"],
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
		tags: ["фторирование", "эмаль", "чувствительность", "профилактика"],
	},
];

const LOCAL_STORAGE_KEY = "dente_canonical_pricelist_v3";

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
 * Реальная загрузка прейскуранта из базы данных PostgreSQL 18 через Fastify API (DEF-PRICE-01).
 * Ликвидирует зависимость от Potemkin LocalStorage.
 */
export async function fetchPricelistFromBackend(
	headers?: Record<string, string>,
): Promise<readonly PricelistStudioItem[]> {
	if (typeof window === "undefined") return CANONICAL_PRICELIST_PRESETS;
	try {
		const res = await fetch("/api/pricelist", {
			method: "GET",
			headers: {
				Accept: "application/json",
				...headers,
			},
		});
		if (!res.ok) {
			console.warn(`[pricelist] GET /api/pricelist status ${res.status}, using offline cache`);
			return loadCanonicalPricelist();
		}
		const data = await res.json();
		const rawItems: any[] = Array.isArray(data.items) ? data.items : [];
		if (rawItems.length === 0) {
			return loadCanonicalPricelist();
		}
		const mapped: PricelistStudioItem[] = rawItems.map((item, idx) => {
			const rawPrice = item.basePriceRub ?? item.priceRub ?? 0;
			const priceKopecks = Number.isFinite(item.priceKopecks)
				? Math.round(item.priceKopecks)
				: Math.round(Number(rawPrice) * 100);
			const rawCost = item.materialsCostRub ?? item.materialCostRub ?? item.costRub ?? 0;
			const costKopecks = Number.isFinite(item.costKopecks)
				? Math.round(item.costKopecks)
				: Math.round(Number(rawCost) * 100);
			return {
				id: item.id || `srv-${idx}`,
				code: item.code || item.order804nCode || `ПОЗ-${idx + 1}`,
				serviceCode: item.code || item.order804nCode || `ПОЗ-${idx + 1}`,
				regulatoryCode: item.order804nCode || item.code,
				title: item.title || "Стоматологическая услуга",
				category: normalizeCategoryFromBackend(item.category),
				priceKopecks,
				costKopecks,
				durationMin: item.durationMinutes || item.durationMin || 30,
				isActive: item.active !== false && item.isActive !== false,
				tags: item.tags || item.aliases || [],
				isBundle: Boolean(item.isBundle),
			};
		});
		saveCanonicalPricelist(mapped);
		return mapped;
	} catch (err) {
		console.warn("[pricelist] fetch /api/pricelist failed:", err);
		return loadCanonicalPricelist();
	}
}

/**
 * Реальная синхронизация отдельной позиции в базу данных PostgreSQL 18 через Fastify API (DEF-PRICE-01).
 */
export async function syncServiceItemToBackend(
	item: Partial<PricelistStudioItem> & { id?: string; title: string; priceKopecks: number },
	headers?: Record<string, string>,
): Promise<{ success: boolean; id?: string }> {
	if (typeof window === "undefined") return { success: false };
	const basePriceRub = Math.round(item.priceKopecks) / 100;
	const materialsCostRub = item.costKopecks ? Math.round(item.costKopecks) / 100 : 0;
	const rawCat = item.category || "therapy";
	const payload = {
		code: item.code || "",
		title: item.title,
		category: normalizeCategoryToBackend(rawCat),
		specialty: getSpecialtyForCategory(rawCat),
		basePriceRub,
		durationMinutes: item.durationMin || 30,
		taxDeductible: true,
		active: item.isActive !== false,
		materialsCostRub,
		order804nCode: item.regulatoryCode || item.code || null,
	};

	const isExisting = item.id && !item.id.startsWith("srv-") && !item.id.startsWith("imp-") && !item.id.startsWith("bundle-");
	const url = isExisting ? `/api/pricelist/${item.id}` : "/api/pricelist";
	const method = isExisting ? "PUT" : "POST";

	try {
		const res = await fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...headers,
			},
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			console.warn(`[pricelist] ${method} ${url} failed with ${res.status}`);
			return { success: false };
		}
		const data = await res.json();
		return { success: true, id: data.id || item.id };
	} catch (err) {
		console.warn(`[pricelist] syncServiceItemToBackend error:`, err);
		return { success: false };
	}
}

/**
 * Пакетная синхронизация прейскуранта в боевой PostgreSQL 18 (DEF-PRICE-01).
 */
export async function batchSyncPricelistToBackend(
	items: readonly PricelistStudioItem[],
	headers?: Record<string, string>,
): Promise<boolean> {
	if (typeof window === "undefined") return false;
	try {
		const batchItems = items.map((it) => ({
			code: it.code,
			order804nCode: it.regulatoryCode || it.code,
			title: it.title,
			category: normalizeCategoryToBackend(it.category),
			specialty: getSpecialtyForCategory(it.category),
			priceRub: Math.round(it.priceKopecks) / 100,
			costRub: Math.round(it.costKopecks) / 100,
			durationMinutes: it.durationMin,
			suggestedAction: "update_existing",
			matchedExistingServiceId: it.id && !it.id.startsWith("srv-") ? it.id : undefined,
		}));

		const res = await fetch("/api/pricelist/batch-import", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...headers,
			},
			body: JSON.stringify({
				items: batchItems,
				collisionStrategy: "update_existing",
			}),
		});
		return res.ok;
	} catch (err) {
		console.warn("[pricelist] batchSyncPricelistToBackend error:", err);
		return false;
	}
}

/**
 * Возвращает клинический тег/синоним, по которому совпал поисковый запрос
 */
export function getMatchedTag(item: PricelistStudioItem, query: string): string | undefined {
	const q = query.trim().toLowerCase();
	if (!q || !item.tags) return undefined;
	return item.tags.find((t) => t.toLowerCase().includes(q));
}

/**
 * Поиск и фильтрация услуг за 1 клик (по названию, коду и синонимам/клиническим тегам)
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
