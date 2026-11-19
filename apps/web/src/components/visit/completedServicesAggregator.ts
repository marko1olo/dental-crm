/**
 * completedServicesAggregator.ts — Агрегатор номенклатуры 804н, зубов FDI и сводки услуг
 * (Wave 47 / Clinical Visit Services Aggregator).
 *
 * 9 экспресс-услуг у кресла, чистка эмодзи для святости бланков, разбор строк
 * визита и расчет итогового кассового счета для карты приёма и 54-ФЗ.
 */

import { money } from "../../utils/financeUtils";
import {
	parseRubAmount,
	roundToKopecks,
	PRICE_UNKNOWN_TEXT,
} from "./completedServicesPricing";

/**
 * 9 ЭКСПРЕСС-УСЛУГ У КРЕСЛА (Номенклатура 804н).
 * Заполняют пробел между ручным вводом и 4 крупными пакетами:
 * снимки, анестезия, коффердам, осмотр, снятие швов, временная пломба.
 */
export interface ChairsideExpressService {
	id: string;
	code804n: string;
	title: string;
	priceRub: number;
}

export const CHAIRSIDE_EXPRESS_SERVICES: readonly ChairsideExpressService[] = [
	{
		id: "intraoral_xray",
		code804n: "A06.07.001",
		title: "Прицельный рентгеновский снимок",
		priceRub: 450,
	},
	{
		id: "local_anesthesia_articaine",
		code804n: "A25.07.001",
		title: "Местная анестезия (Артикаин)",
		priceRub: 800,
	},
	{
		id: "conduction_anesthesia",
		code804n: "A25.07.002",
		title: "Проводниковая анестезия",
		priceRub: 950,
	},
	{
		id: "consultation_inspection",
		code804n: "A01.07.001",
		title: "Осмотр и консультация",
		priceRub: 1000,
	},
	{
		id: "cofferdam_isolation",
		code804n: "A16.07.051",
		title: "Изоляция коффердамом",
		priceRub: 800,
	},
	{
		id: "suture_removal",
		code804n: "A16.07.097",
		title: "Снятие швов",
		priceRub: 600,
	},
	{
		id: "temp_filling",
		code804n: "A16.07.002.099",
		title: "Временная пломба",
		priceRub: 700,
	},
	{
		id: "dental_deposits_removal_1_tooth",
		code804n: "A16.07.050.001",
		title: "Снятие назубных отложений (1 зуб)",
		priceRub: 350,
	},
	{
		id: "optg_panoramic",
		code804n: "A06.07.002",
		title: "ОПТГ / Панорамный снимок",
		priceRub: 1200,
	},
];

export interface RawCatalogItem {
	active?: boolean | undefined;
	code?: string | undefined;
	code804n?: string | undefined;
	basePriceRub?: number | string | null | undefined;
	priceRub?: number | string | null | undefined;
	price?: number | string | null | undefined;
	id?: string | number | undefined;
	title?: string | undefined;
	category?: string | undefined;
}

/**
 * Разрешает 9 экспресс-услуг у кресла против живого прейскуранта клиники (service_catalog_items).
 */
export function resolveExpressServicesAgainstCatalog(
	catalog: readonly RawCatalogItem[] = [],
): readonly ChairsideExpressService[] {
	if (!Array.isArray(catalog) || catalog.length === 0) {
		return CHAIRSIDE_EXPRESS_SERVICES;
	}

	return CHAIRSIDE_EXPRESS_SERVICES.map((svc) => {
		const targetCode = svc.code804n.trim().toUpperCase();
		const byCode = catalog.find((c) => {
			if (!c || c.active === false) return false;
			const cCode = String(c.code || c.code804n || "").trim().toUpperCase();
			return cCode === targetCode;
		});
		if (byCode) {
			const parsedPrice = parseRubAmount(byCode.basePriceRub ?? byCode.priceRub);
			if (parsedPrice !== null && parsedPrice > 0) {
				return {
					...svc,
					title: svc.title,
					priceRub: parsedPrice,
				};
			}
		}
		return svc;
	});
}

/** 32 зуба взрослой зубной формулы по классификации FDI World Dental Federation */
export const FDI_UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const FDI_LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
export const ALL_FDI_TEETH = [...FDI_UPPER_TEETH, ...FDI_LOWER_TEETH] as const;

/** Удаляет эмодзи из текста для гарантии номенклатурной чистоты бланков 804н (Мандаты 8d / 8e). */
export function stripEmojis(text: string): string {
	if (!text) return "";
	return text
		.replace(
			/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu,
			"",
		)
		.replace(/\s{2,}/g, " ")
		.trim();
}

/** Параметры для формирования строки выполненной услуги */
export interface FormatCompletedServiceParams {
	code804n?: string | null;
	title: string;
	priceRub: number | null;
	toothCode?: string | number | null;
	quantity?: number | null;
}

/**
 * Формирует строку выполненной услуги для поля treatmentPlan карты приёма.
 * Строго гарантирует отсутствие эмодзи и сохранение копеек.
 */
export function formatCompletedServiceLine({
	code804n,
	title,
	priceRub,
	toothCode,
	quantity,
}: FormatCompletedServiceParams): string {
	const cleanTitle = stripEmojis(title.trim()) || "Услуга";
	const cleanCode = code804n ? stripEmojis(code804n.trim()) : "";
	const codePart = cleanCode ? `[${cleanCode}] ` : "";

	const toothStr =
		toothCode !== undefined && toothCode !== null ? String(toothCode).trim() : "";
	const isMulti = toothStr.includes(",") || toothStr.includes("-");
	const toothPart =
		toothStr &&
		toothStr.toLowerCase() !== "none" &&
		toothStr !== "0" &&
		toothStr.toLowerCase() !== "без зуба"
			? isMulti
				? ` (зубы ${toothStr})`
				: ` (зуб ${toothStr})`
			: "";

	const q =
		quantity !== undefined && quantity !== null && quantity > 1
			? `, ${quantity} шт.`
			: "";

	const pricePart =
		priceRub === null || !Number.isFinite(priceRub)
			? PRICE_UNKNOWN_TEXT
			: money(roundToKopecks(priceRub));

	return `Выполнено: ${codePart}${cleanTitle}${toothPart}${q} — ${pricePart}`;
}

/** Результат разбора строки выполненной услуги */
export interface ParsedCompletedLine {
	rawLine: string;
	code804n?: string | undefined;
	title: string;
	toothCode?: string | undefined;
	quantity: number;
	priceRub: number | null;
}
export type ParsedCompletedServiceLine = ParsedCompletedLine;

/**
 * Разбирает строку «Выполнено: ...» из текста карты приёма.
 * Возвращает null, если строка не является записью выполненной услуги.
 */
export function parseCompletedServiceLine(
	rawLine: string,
): ParsedCompletedLine | null {
	if (typeof rawLine !== "string") return null;
	const trimmed = rawLine.trim();
	const isCompleted = trimmed.toLowerCase().startsWith("выполнено:");
	const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
	const isToothPrefix = /^зуб(?:ы)?\s+[A-Za-z0-9.,\s-]+[:\s]/i.test(trimmed);
	if (!isCompleted && !isBullet && !isToothPrefix) return null;

	let content = trimmed;
	if (isCompleted) {
		content = trimmed.substring("выполнено:".length).trim();
	} else if (isBullet) {
		content = trimmed.substring(1).trim();
	}
	if (!content) return null;

	// Разделение по последнему тире (эмитируется em-dash «—», en-dash «–» или « - »)
	let lastDashIdx = content.lastIndexOf("—");
	if (lastDashIdx === -1) lastDashIdx = content.lastIndexOf("–");
	if (lastDashIdx === -1) {
		const spaceDash = content.lastIndexOf(" - ");
		if (spaceDash !== -1) lastDashIdx = spaceDash + 1;
	}

	let headPart = content;
	let priceRub: number | null = null;

	if (lastDashIdx !== -1) {
		headPart = content.slice(0, lastDashIdx).trim();
		const priceStr = content.slice(lastDashIdx + 1).replace(/₽/g, "").trim();
		if (
			priceStr &&
			priceStr.toLowerCase() !== PRICE_UNKNOWN_TEXT.toLowerCase()
		) {
			priceRub = parseRubAmount(priceStr);
		}
	} else if (isBullet) {
		return null;
	}

	// 1. Проверяем префиксный зуб в самом начале: «Зуб 16: ...» или «зубы 16, 17: ...»
	let toothCode: string | undefined;
	const prefixToothMatch = headPart.match(/^зуб(?:ы)?\s+([A-Za-z0-9.,\s-]+)[:\s]\s*/i);
	if (prefixToothMatch && prefixToothMatch[1]) {
		toothCode = prefixToothMatch[1].trim();
		headPart = headPart.slice(prefixToothMatch[0].length).trim();
	}

	// 2. Извлекаем код 804н: в квадратных скобках [A06.07.001] или без скобок A16.07.002.001
	let code804n: string | undefined;
	const codeMatch = headPart.match(/^(?:\[([A-Za-z0-9.]+)\]|([AB]\d{2}(?:\.\d{2,3})*(?:\.\d{3})?))\s*/i);
	if (codeMatch) {
		code804n = codeMatch[1] || codeMatch[2];
		headPart = headPart.slice(codeMatch[0].length).trim();
	}

	// 3. Если зуба еще нет, проверяем префиксный зуб ПОСЛЕ кода: «[A16.07.002] Зуб 16: ...»
	if (!toothCode) {
		const afterCodeToothMatch = headPart.match(/^зуб(?:ы)?\s+([A-Za-z0-9.,\s-]+)[:\s]\s*/i);
		if (afterCodeToothMatch && afterCodeToothMatch[1]) {
			toothCode = afterCodeToothMatch[1].trim();
			headPart = headPart.slice(afterCodeToothMatch[0].length).trim();
		}
	}

	// 4. Извлекаем количество: «, 2 шт.» или «— 1 усл.»
	let quantity = 1;
	const qMatch = headPart.match(/,\s*(\d+)\s*(?:шт|усл)\.?$/i);
	if (qMatch && qMatch[1]) {
		quantity = Math.max(1, Number.parseInt(qMatch[1], 10) || 1);
		if (qMatch.index !== undefined) {
			headPart = headPart.slice(0, qMatch.index).trim();
		}
	}

	// 5. Если зуба еще нет, извлекаем суффиксный зуб в конце: «(зуб 26)» или «(зубы 16, 17)»
	if (!toothCode) {
		const toothMatch = headPart.match(/\(зуб(?:ы)?\s+([A-Za-z0-9.,\s-]+)\)$/i);
		if (toothMatch && toothMatch[1]) {
			toothCode = toothMatch[1].trim();
			if (toothMatch.index !== undefined) {
				headPart = headPart.slice(0, toothMatch.index).trim();
			}
		}
	}

	const title = stripEmojis(headPart.trim());

	return {
		rawLine: trimmed,
		code804n,
		title,
		toothCode,
		quantity,
		priceRub,
	};
}

/** Отфильтрованная позиция прейскуранта клиники */
export interface FilteredCatalogService {
	id: string;
	code: string;
	title: string;
	priceRub: number;
	category?: string | undefined;
}

/**
 * Быстрый поиск по прейскуранту клиники (dashboard.serviceCatalog).
 * Моментальная фильтрация по названию и коду 804н, нечувствительная к регистру.
 */
export function filterServiceCatalog(
	catalog: unknown,
	query: string,
	limit = 20,
): FilteredCatalogService[] {
	if (!Array.isArray(catalog)) return [];
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [];

	const results: FilteredCatalogService[] = [];

	for (const item of catalog) {
		if (!item || typeof item !== "object") continue;
		const catItem = item as Record<string, unknown>;
		if (catItem.active === false) continue;

		const code = typeof catItem.code === "string" ? catItem.code.trim() : "";
		const title = typeof catItem.title === "string" ? catItem.title.trim() : "";
		const rawPrice =
			catItem.basePriceRub ?? catItem.priceRub ?? catItem.price;
		const priceRub = parseRubAmount(rawPrice) ?? 0;

		const matchCode = code.toLowerCase().includes(trimmed);
		const matchTitle = title.toLowerCase().includes(trimmed);

		if (matchCode || matchTitle) {
			results.push({
				id: String(catItem.id || code || title),
				code: code || "Услуга",
				title: title || "Услуга без названия",
				priceRub,
				category:
					typeof catItem.category === "string" ? catItem.category : undefined,
			});
			if (results.length >= limit) break;
		}
	}

	return results;
}

/** Итог по всем выполненным услугам приёма */
export interface CompletedServicesSummary {
	totalRub: number;
	count: number;
	unpricedCount: number;
	servicesForInvoice: Array<{
		code: string;
		code804n?: string | undefined;
		title: string;
		price: number;
		priceRub?: number | undefined;
		unitPriceRub?: number | undefined;
		quantity: number;
		toothCode?: string | undefined;
	}>;
}

/** Типизированная сущность оказанной услуги у кресла (DEF-PRICE-04) */
export interface CompletedServiceEntity {
	readonly id?: string | undefined;
	readonly code?: string | undefined;
	readonly code804n?: string | undefined;
	readonly title?: string | undefined;
	readonly name?: string | undefined;
	readonly price?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly quantity?: number | undefined;
	readonly toothCode?: string | number | undefined;
	readonly toothNumber?: number | undefined;
	readonly isCompleted?: boolean | undefined;
	readonly status?: string | undefined;
}

/**
 * Агрегирует выполненные услуги напрямую из типизированных доменных сущностей (DEF-PRICE-04).
 */
export function aggregateCompletedStructuredEntities(
	entities: readonly CompletedServiceEntity[],
): CompletedServicesSummary {
	let totalRub = 0;
	let unpricedCount = 0;
	const servicesForInvoice: CompletedServicesSummary["servicesForInvoice"] = [];

	for (const item of entities) {
		if (item.status && item.status !== "completed" && item.status !== "done" && item.isCompleted !== true) {
			continue;
		}
		const rawPrice = item.priceRub ?? item.unitPriceRub ?? item.price;
		const priceRub = typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : null;
		const code = item.code804n || item.code || "Услуга";
		const title = item.title || item.name || "Стоматологическая услуга";
		const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
		const toothCode =
			item.toothCode !== undefined && item.toothCode !== null
				? String(item.toothCode)
				: item.toothNumber !== undefined && item.toothNumber !== null
					? String(item.toothNumber)
					: undefined;

		if (priceRub === null) {
			unpricedCount++;
		} else {
			totalRub += priceRub * quantity;
		}

		const unitPrice = priceRub ?? 0;
		servicesForInvoice.push({
			code,
			code804n: code,
			title,
			price: unitPrice,
			priceRub: unitPrice,
			unitPriceRub: unitPrice,
			quantity,
			toothCode,
		});
	}

	return {
		totalRub: roundToKopecks(totalRub),
		count: servicesForInvoice.length,
		unpricedCount,
		servicesForInvoice,
	};
}

/**
 * Считает сводку по всем выполненным услугам (поддерживает как типизированные сущности,
 * так и текстовый протокол приёма со строками «Выполнено: ...»).
 */
export function calculateCompletedServicesSummary(
	treatmentPlanInput: unknown,
	structuredEntities?: readonly CompletedServiceEntity[],
): CompletedServicesSummary {
	if (Array.isArray(treatmentPlanInput)) {
		return aggregateCompletedStructuredEntities(treatmentPlanInput as CompletedServiceEntity[]);
	}

	const rawText =
		typeof treatmentPlanInput === "string" ? treatmentPlanInput : "";
	const lines = rawText.split("\n").map((l) => (l ?? "").trim());

	const completedLines: string[] = [];
	let totalRub = 0;
	let unpricedCount = 0;
	const servicesForInvoice: CompletedServicesSummary["servicesForInvoice"] = [];

	for (const line of lines) {
		const parsed = parseCompletedServiceLine(line);
		if (!parsed) continue;

		completedLines.push(line);

		if (parsed.priceRub === null) {
			unpricedCount++;
		} else {
			totalRub += parsed.priceRub;
		}

		const unitPrice = parsed.priceRub ?? 0;
		servicesForInvoice.push({
			code: parsed.code804n || "Услуга",
			code804n: parsed.code804n || "Услуга",
			title: parsed.title,
			price: unitPrice,
			priceRub: unitPrice,
			unitPriceRub: unitPrice,
			quantity: parsed.quantity,
			toothCode: parsed.toothCode,
		});
	}

	if (completedLines.length === 0 && structuredEntities && structuredEntities.length > 0) {
		return aggregateCompletedStructuredEntities(structuredEntities);
	}

	return {
		totalRub: roundToKopecks(totalRub),
		count: completedLines.length,
		unpricedCount,
		servicesForInvoice,
	};
}
