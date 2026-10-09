/**
 * cacheKeyAndTiming.ts — Layer 1: Вычисление канонических ключей кэша,
 * правила регламентных каталогов Минздрава и хелперы заголовков.
 *
 * Чистые функции без привязки к глобальному состоянию.
 */

import type { CatalogCacheRule } from "./types";

/**
 * Канонические правила кэширования регламентных стоматологических справочников.
 */
export const STATUTORY_CATALOG_RULES: readonly CatalogCacheRule[] = [
	{
		id: "nomenclature-804n",
		pattern: /^\/api\/(?:clinical\/)?(?:nomenclature|804n)(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — эталон Минздрава меняется крайне редко
		description: "Номенклатура медицинских услуг Минздрава 804н",
	},
	{
		id: "icd10-diagnosis",
		pattern: /^\/api\/(?:catalogs?\/|clinical\/)?(?:icd10|icd-10|mkb|mkb10|mkb-10|classifiers)(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — справочник МКБ-10
		description: "Справочник диагнозов МКБ-10",
	},
	{
		id: "clinical-somatic-templates",
		pattern: /^\/api\/(?:templates|document-templates|documents\/templates|outpatient\/templates|emr\/templates|somatic(?:-status|-templates)?)(?:\/|\?|$)/i,
		defaultTtlMs: 20 * 60 * 1000, // 20 минут — клинические протоколы, шаблоны 043/у и соматические статусы
		description: "Клинические протоколы, шаблоны 043/у, соматические статусы и ИДС",
	},
	{
		id: "catalog-services-pricelists",
		pattern: /^\/api\/(?:catalog|price-lists|settings\/price)(?:\/|\?|$)/i,
		defaultTtlMs: 10 * 60 * 1000, // 10 минут
		description: "Прайс-листы клиники и каталог стоматологических услуг",
	},
	{
		id: "clinic-staff-doctors",
		pattern: /^\/api\/(?:settings\/staff|hr\/doctors)(?:\/|\?|$)/i,
		defaultTtlMs: 5 * 60 * 1000, // 5 минут
		description: "Список сотрудников и расписание врачей клиники",
	},
	{
		id: "clinic-structure-workspace",
		pattern: /^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)(?:\/|\?|$)/i,
		defaultTtlMs: 5 * 60 * 1000, // 5 минут
		description: "Структура клиники, филиалы, кресла и профиль кабинета",
	},
	{
		id: "clinical-task-types",
		pattern: /^\/api\/crm\/custom-task-types(?:\/|\?|$)/i,
		defaultTtlMs: 10 * 60 * 1000, // 10 минут
		description: "Пользовательские типы клинических задач",
	},
	{
		id: "clinical-rules-definitions",
		pattern: /^\/api\/clinical\/rules(?:\?|$)/i,
		defaultTtlMs: 10 * 60 * 1000, // 10 минут (только определения правил, не вычисление evaluate)
		description: "Определения клинических правил и протоколов",
	},
	{
		id: "clinical-phase-completions",
		pattern: /^\/api\/clinical\/phase-completions(?:\/|\?|$)/i,
		defaultTtlMs: 5 * 60 * 1000, // 5 минут
		description: "Справочник завершений клинических фаз",
	},
	{
		id: "pharmacology-references",
		pattern: /^\/api\/pharmacology(?:\/(?:references|interactions-matrix|medications|catalog|drugs))?(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут
		description: "Справочники фармакологии, лекарственных препаратов и матрица совместимости",
	},
	{
		id: "sanpin-references",
		pattern: /^\/api\/sanpin\/references(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут
		description: "Нормативы СанПиН и справочники стерилизации",
	},
	{
		id: "inventory-warehouse-items",
		pattern: /^\/api\/inventory(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 15 * 60 * 1000, // 15 минут — номенклатура склада и материалы
		description: "Складской учет, расходные материалы и медикаменты",
	},
	{
		id: "inventory-boms-rules",
		pattern: /^\/api\/inventory(?:\/[a-zA-Z0-9_-]+)?\/rules(?:\/|\?|$)/i,
		defaultTtlMs: 20 * 60 * 1000, // 20 минут — техкарты списания материалов (804н)
		description: "Техкарты и правила списания материалов по услугам",
	},
	{
		id: "dental-lab-catalogs",
		pattern: /^\/api\/lab(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 20 * 60 * 1000, // 20 минут — каталоги зуботехнических лабораторий и наряды ЗТЛ
		description: "Каталоги зуботехнических лабораторий, этапы и прайслисты ЗТЛ",
	},
	{
		id: "insurance-dms-catalogs",
		pattern: /^\/api\/insurance(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — страховые компании ДМС и гарантийные тарифы
		description: "Справочники страховых компаний ДМС, программы и гарантийные лимиты",
	},
	{
		id: "marketing-channels-sources",
		pattern: /^\/api\/marketing(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 15 * 60 * 1000, // 15 минут — каналы привлечения и рекламные источники
		description: "Маркетинговые каналы, рекламные источники и метрики привлечения",
	},
] as const;

/**
 * Извлекает относительный путь API из строки, URL или объекта Request.
 */
export function normalizeApiUrl(input: RequestInfo | URL): string {
	let rawUrl: string;
	if (typeof input === "string") {
		rawUrl = input;
	} else if (input instanceof URL) {
		rawUrl = input.toString();
	} else {
		rawUrl = input.url;
	}

	try {
		const origin = typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
		const parsed = new URL(rawUrl, origin);
		return parsed.pathname + parsed.search;
	} catch {
		return rawUrl;
	}
}

/**
 * Проверяет, подходит ли URL под регламентное кэширование справочников.
 */
export function matchCatalogRule(pathname: string): CatalogCacheRule | undefined {
	for (const rule of STATUTORY_CATALOG_RULES) {
		if (rule.pattern.test(pathname)) {
			return rule;
		}
	}
	return undefined;
}

/**
 * Проверяет, можно ли кэшировать данный запрос (только безопасные методы GET/HEAD и подходящий путь).
 */
export function isCacheableCatalogUrl(url: string, method = "GET"): boolean {
	const normalizedMethod = method.toUpperCase();
	if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
		return false;
	}
	const normalizedPath = normalizeApiUrl(url);
	return matchCatalogRule(normalizedPath) !== undefined;
}

/**
 * Преобразует заголовки Headers в плоский объект Record<string, string>.
 */
export function headersToRecord(headers?: HeadersInit): Record<string, string> {
	if (!headers) return {};
	const result: Record<string, string> = {};

	if (headers instanceof Headers) {
		headers.forEach((value, key) => {
			result[key.toLowerCase()] = value;
		});
	} else if (Array.isArray(headers)) {
		for (const [key, value] of headers) {
			result[key.toLowerCase()] = value;
		}
	} else {
		for (const [key, value] of Object.entries(headers)) {
			if (typeof value === "string") {
				result[key.toLowerCase()] = value;
			}
		}
	}

	return result;
}
