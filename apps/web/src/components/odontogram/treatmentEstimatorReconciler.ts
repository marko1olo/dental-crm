/*
 * treatmentEstimatorReconciler.ts — Интеллектуальный анализатор дневника приёма (Zero-Leakage Reconciler).
 *
 * Детектив расходников (Leak-Proof Billing & Consumables Detective).
 * Ликвидирует финансовые утечки частных клиник (забытые анестезии, коффердамы, рентген-снимки).
 * Соответствует Номенклатуре медицинских услуг Приказа Минздрава РФ № 804н.
 * Мандаты 8b, 8e, 8ah: детерминированные цены из прейскуранта клиники, автономия врача (0 блокировок).
 * Оптимизирован для слабых устройств: скомпилированные RegExp, 0 внешних тяжелых NLP библиотек.
 */

import type { PlanPriceCatalogItem } from "../treatment-plans/planPricing";
import type { PlanItem } from "./treatmentEstimatorCatalogMatching";

export type ConsumableType = "anesthesia" | "isolation" | "radiology";

export interface UnbilledConsumableItem {
	readonly id: string;
	readonly type: ConsumableType;
	readonly name: string;
	readonly code804n: string;
	readonly priceRub: number;
	readonly priceId: string | null;
	readonly category: string;
	readonly matchedMarker: string;
}

export interface ConsumablesReconciliationResult {
	readonly hasUnbilled: boolean;
	readonly unbilledItems: readonly UnbilledConsumableItem[];
	readonly totalUnbilledRub: number;
	readonly detectedMarkers: readonly string[];
	readonly summaryText: string;
}

export interface GenericServiceItem {
	readonly id?: string | null | undefined;
	readonly code?: string | null | undefined;
	readonly code804n?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly title?: string | null | undefined;
	readonly priceRub?: number | null | undefined;
	readonly price?: number | null | undefined;
	readonly unitPriceRub?: number | null | undefined;
	readonly totalRub?: number | null | undefined;
	readonly quantity?: number | null | undefined;
	readonly category?: string | null | undefined;
}

export interface ClinicalProtocolSource {
	readonly complaint?: string | null | undefined;
	readonly anamnesis?: string | null | undefined;
	readonly objectiveStatus?: string | null | undefined;
	readonly statusLocalis?: string | null | undefined;
	readonly diagnosis?: string | null | undefined;
	readonly treatmentPlan?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly procedureProtocol?: string | null | undefined;
	readonly subjectiveComplaints?: string | null | undefined;
	readonly objectiveStatusLocalis?: string | null | undefined;
	readonly planNextVisit?: string | null | undefined;
}

/* 
 * Скомпилированные регулярные выражения (компилируются строго один раз при инициализации модуля)
 * Оптимизация для мобильных и слабых процессоров.
 */
const RE_ANESTHESIA_MARKERS =
	/(?:инфильтрационн\w*|проводников\w*|ультракаин\w*|артикаин\w*|убистезин\w*|септанест\w*|септонест\w*|скандонест\w*|анестези\w*|обезболиван\w*)/i;

const RE_ISOLATION_MARKERS =
	/(?:коффердам\w*|раббердам\w*|оптрагейт\w*|optragate\w*|кламп\w*|изоляци\w*(?:\s+рабоч\w*)?(?:\s+пол\w*)?)/i;

const RE_RADIOLOGY_MARKERS =
	/(?:радиовизиограф\w*|визиограф\w*|визиографи\w*|прицельн\w*\s+снимок\w*|рентген\w*|ортопантомограмм\w*|оптг\w*|клкт\w*|рентгенографи\w*|снимок\s+контрол\w*|рентген-контрол\w*|прицельн\w*\s+рентген\w*)/i;

// Коды Приказа Минздрава РФ № 804н
export const CODES_804N = {
	ANESTHESIA_INFILTRATION: "B01.003.004.005",
	ANESTHESIA_CONDUCTION: "B01.003.004.004",
	ANESTHESIA_GENERAL: "A11.07.012",
	ISOLATION_COFFERDAM: "A16.07.093",
	ISOLATION_PREPARATION: "A16.07.002.001",
	RADIOLOGY_INTRAORAL: "A06.07.003",
	RADIOLOGY_PANORAMIC: "A06.07.004",
} as const;

// Мягкие базовые цены справочника (при отсутствии каталога или позиции в прайсе клиники)
export const DEFAULT_FALLBACK_PRICES_RUB = {
	ANESTHESIA: 800,
	ISOLATION: 600,
	RADIOLOGY: 500,
} as const;

/**
 * Извлекает и объединяет весь текст протокола приёма из различных структур ЭМК
 */
export function extractClinicalProtocolText(
	source: string | ClinicalProtocolSource | null | undefined,
): string {
	if (!source) return "";
	if (typeof source === "string") return source.trim();

	const fragments: string[] = [];

	if (source.treatmentDescription) fragments.push(source.treatmentDescription);
	if (source.treatmentPlan) fragments.push(source.treatmentPlan);
	if (source.procedureProtocol) fragments.push(source.procedureProtocol);
	if (source.statusLocalis) fragments.push(source.statusLocalis);
	if (source.objectiveStatus) fragments.push(source.objectiveStatus);
	if (source.objectiveStatusLocalis) fragments.push(source.objectiveStatusLocalis);
	if (source.complaint) fragments.push(source.complaint);
	if (source.subjectiveComplaints) fragments.push(source.subjectiveComplaints);
	if (source.anamnesis) fragments.push(source.anamnesis);
	if (source.diagnosis) fragments.push(source.diagnosis);
	if (source.planNextVisit) fragments.push(source.planNextVisit);

	return fragments.join(" ").trim();
}

/**
 * Ищет подходящую услугу в прейскуранте клиники по кодам 804н и ключевым словам
 */
function findCatalogItemForConsumable(
	catalog: readonly PlanPriceCatalogItem[] | undefined,
	codes: readonly string[],
	keywords: readonly string[],
	preferredCategory: string,
): PlanPriceCatalogItem | undefined {
	if (!catalog || catalog.length === 0) return undefined;
	const activeItems = catalog.filter((c) => c.active);

	// 1. Поиск по точным кодам 804н
	for (const code of codes) {
		const match = activeItems.find(
			(s) =>
				s.id === code ||
				(s as unknown as Record<string, unknown>).code === code ||
				(s as unknown as Record<string, unknown>).code804n === code,
		);
		if (match) return match;
	}

	const normKeywords = keywords.map((k) => k.toLowerCase().replace(/ё/g, "е"));

	// 2. Поиск в профильной категории
	const inCat = activeItems.filter((s) =>
		s.category.toLowerCase().includes(preferredCategory.toLowerCase()),
	);
	for (const kw of normKeywords) {
		const match = inCat.find((s) =>
			s.title.toLowerCase().replace(/ё/g, "е").includes(kw),
		);
		if (match) return match;
	}

	// 3. Поиск по всему каталогу
	for (const kw of normKeywords) {
		const match = activeItems.find((s) =>
			s.title.toLowerCase().replace(/ё/g, "е").includes(kw),
		);
		if (match) return match;
	}

	return undefined;
}

/**
 * Проверяет, включена ли конкретная группа услуг в текущий счёт/смету
 */
function isServiceAlreadyBilled(
	billedServices: readonly GenericServiceItem[],
	codes: readonly string[],
	keywordsRegex: RegExp,
): boolean {
	if (!billedServices || billedServices.length === 0) return false;

	return billedServices.some((svc) => {
		// Проверка по коду 804н
		const code = svc.code || svc.code804n || svc.id;
		if (code && codes.some((c) => code.includes(c))) {
			return true;
		}

		// Проверка по названию услуги
		const title = (svc.title || svc.name || "").toLowerCase().replace(/ё/g, "е");
		if (title && keywordsRegex.test(title)) {
			return true;
		}

		return false;
	});
}

/**
 * Анализирует текст протокола лечения и секций дневника визита.
 * Выявляет клинические маркеры (анестезия, коффердам, рентген) и сопоставляет
 * со списком выставленных в счёт услуг (Zero-Leakage Reconciler).
 */
export function detectUnbilledConsumables(
	protocolSource: string | ClinicalProtocolSource | null | undefined,
	billedServices: readonly GenericServiceItem[] = [],
	catalog: readonly PlanPriceCatalogItem[] = [],
): ConsumablesReconciliationResult {
	const text = extractClinicalProtocolText(protocolSource);
	if (!text) {
		return {
			hasUnbilled: false,
			unbilledItems: [],
			totalUnbilledRub: 0,
			detectedMarkers: [],
			summaryText: "",
		};
	}

	const detectedMarkers: string[] = [];
	const unbilledItems: UnbilledConsumableItem[] = [];

	// 1. Анестезия
	const hasAnesthesiaMarker = RE_ANESTHESIA_MARKERS.test(text);
	if (hasAnesthesiaMarker) {
		detectedMarkers.push("Анестезия");
		const isBilled = isServiceAlreadyBilled(
			billedServices,
			[
				CODES_804N.ANESTHESIA_INFILTRATION,
				CODES_804N.ANESTHESIA_CONDUCTION,
				CODES_804N.ANESTHESIA_GENERAL,
				"A11.07.012",
				"A25.07.001",
			],
			RE_ANESTHESIA_MARKERS,
		);

		if (!isBilled) {
			const catalogMatch = findCatalogItemForConsumable(
				catalog,
				[CODES_804N.ANESTHESIA_INFILTRATION, CODES_804N.ANESTHESIA_CONDUCTION, "A11.07.012"],
				["анестези", "ультракаин", "артикаин", "убистезин", "септанест"],
				"анестез",
			);

			const price = catalogMatch && Number.isFinite(catalogMatch.basePriceRub)
				? catalogMatch.basePriceRub
				: DEFAULT_FALLBACK_PRICES_RUB.ANESTHESIA;

			unbilledItems.push({
				id: `leak_anesth_${Date.now()}`,
				type: "anesthesia",
				name: catalogMatch ? catalogMatch.title : "Анестезия инфильтрационная / проводниковая",
				code804n: catalogMatch
					? ((catalogMatch as unknown as Record<string, string>).code804n || CODES_804N.ANESTHESIA_INFILTRATION)
					: CODES_804N.ANESTHESIA_INFILTRATION,
				priceRub: price,
				priceId: catalogMatch ? catalogMatch.id : null,
				category: catalogMatch ? catalogMatch.category : "Анестезия",
				matchedMarker: "Анестезия",
			});
		}
	}

	// 2. Изоляция рабочего поля (коффердам / раббердам / оптрагейт)
	const hasIsolationMarker = RE_ISOLATION_MARKERS.test(text);
	if (hasIsolationMarker) {
		detectedMarkers.push("Коффердам");
		const isBilled = isServiceAlreadyBilled(
			billedServices,
			[
				CODES_804N.ISOLATION_COFFERDAM,
				CODES_804N.ISOLATION_PREPARATION,
				"A16.07.051",
			],
			RE_ISOLATION_MARKERS,
		);

		if (!isBilled) {
			const catalogMatch = findCatalogItemForConsumable(
				catalog,
				[CODES_804N.ISOLATION_COFFERDAM, "A16.07.051"],
				["коффердам", "раббердам", "оптрагейт", "изоляци"],
				"терап",
			);

			const price = catalogMatch && Number.isFinite(catalogMatch.basePriceRub)
				? catalogMatch.basePriceRub
				: DEFAULT_FALLBACK_PRICES_RUB.ISOLATION;

			unbilledItems.push({
				id: `leak_isol_${Date.now()}`,
				type: "isolation",
				name: catalogMatch ? catalogMatch.title : "Изоляция рабочего поля (коффердам / оптрагейт)",
				code804n: catalogMatch
					? ((catalogMatch as unknown as Record<string, string>).code804n || CODES_804N.ISOLATION_COFFERDAM)
					: CODES_804N.ISOLATION_COFFERDAM,
				priceRub: price,
				priceId: catalogMatch ? catalogMatch.id : null,
				category: catalogMatch ? catalogMatch.category : "Терапия",
				matchedMarker: "Коффердам",
			});
		}
	}

	// 3. Рентген-контроль / радиовизиография
	const hasRadiologyMarker = RE_RADIOLOGY_MARKERS.test(text);
	if (hasRadiologyMarker) {
		detectedMarkers.push("Рентген-контроль");
		const isBilled = isServiceAlreadyBilled(
			billedServices,
			[
				CODES_804N.RADIOLOGY_INTRAORAL,
				CODES_804N.RADIOLOGY_PANORAMIC,
				"A06.07.006",
			],
			RE_RADIOLOGY_MARKERS,
		);

		if (!isBilled) {
			const catalogMatch = findCatalogItemForConsumable(
				catalog,
				[CODES_804N.RADIOLOGY_INTRAORAL, "A06.07.006"],
				["радиовизиограф", "визиограф", "прицельный снимок", "рентген"],
				"диагност",
			);

			const price = catalogMatch && Number.isFinite(catalogMatch.basePriceRub)
				? catalogMatch.basePriceRub
				: DEFAULT_FALLBACK_PRICES_RUB.RADIOLOGY;

			unbilledItems.push({
				id: `leak_rad_${Date.now()}`,
				type: "radiology",
				name: catalogMatch ? catalogMatch.title : "Прицельная радиовизиография (рентген-контроль)",
				code804n: catalogMatch
					? ((catalogMatch as unknown as Record<string, string>).code804n || CODES_804N.RADIOLOGY_INTRAORAL)
					: CODES_804N.RADIOLOGY_INTRAORAL,
				priceRub: price,
				priceId: catalogMatch ? catalogMatch.id : null,
				category: catalogMatch ? catalogMatch.category : "Диагностика",
				matchedMarker: "Рентген-контроль",
			});
		}
	}

	const totalUnbilledRub = unbilledItems.reduce((acc, it) => acc + it.priceRub, 0);

	const summaryListText = unbilledItems
		.map((it) => `${it.matchedMarker} (${it.priceRub.toLocaleString("ru-RU")} ₽)`)
		.join(", ");

	const summaryText = unbilledItems.length > 0
		? `В дневнике зафиксировано, но не включено в счёт: ${summaryListText}`
		: "";

	return {
		hasUnbilled: unbilledItems.length > 0,
		unbilledItems,
		totalUnbilledRub,
		detectedMarkers,
		summaryText,
	};
}

/**
 * Преобразует забытый расходник в элемент сметы (PlanItem) для 1-клик добавления
 */
export function convertUnbilledConsumableToPlanItem(
	item: UnbilledConsumableItem,
	toothNumber: number = 0,
): PlanItem {
	return {
		id: item.id,
		toothNumber,
		priceId: item.priceId,
		name: item.name,
		quantity: 1,
		price: item.priceRub,
		discount: 0,
		phase: 1,
		category: item.category,
		isAuto: false,
		suggestion: item.type as any,
		issue: null,
	};
}

/**
 * Преобразует забытый расходник в позицию чека/услуг визита
 */
export function convertUnbilledConsumableToChairsideService(
	item: UnbilledConsumableItem,
): GenericServiceItem {
	return {
		id: item.priceId || item.id,
		code: item.code804n,
		code804n: item.code804n,
		title: item.name,
		name: item.name,
		priceRub: item.priceRub,
		price: item.priceRub,
		unitPriceRub: item.priceRub,
		totalRub: item.priceRub,
		quantity: 1,
		category: item.category,
	};
}
