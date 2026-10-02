/*
 * treatmentEstimatorCatalogMatching.ts — Сопоставление с прайс-листом клиники и генерация позиций.
 * Мандаты 8b, 8e: <= 800 строк, модульность, честный прайс без выдуманных цен.
 */

import { isValidFdiToothNumber } from "@dental/shared";
import type { PlanPriceCatalogItem } from "../treatment-plans/planPricing";
import {
	type EstimatorRule,
	type EstimatorSuggestionKey,
	estimatorRulesForTooth,
	isDeciduousFdiToothNumber,
} from "./treatmentEstimatorRules";

/** Почему у строки сметы нет цены. */
export type EstimatorPriceIssueKind =
	| "catalog_empty"
	| "service_disabled"
	| "not_in_catalog"
	| "ambiguous"
	| "price_missing"
	| "service_unlinked";

export interface EstimatorPriceIssue {
	readonly kind: EstimatorPriceIssueKind;
	readonly humanName: string;
	readonly matches: number;
	readonly catalogTitle?: string;
}

/**
 * Позиция сметы.
 * `price` и `priceId` допускают null.
 */
export interface PlanItem {
	id?: string;
	toothNumber?: number;
	priceId: string | null;
	name: string;
	quantity: number;
	price: number | null;
	discount: number;
	phase: number;
	isAuto?: boolean;
	suggestion?: EstimatorSuggestionKey;
	category?: string;
	issue?: EstimatorPriceIssue | null;
}

/** Зуб в том виде, в каком его читает подбор. */
export interface EstimatorToothInput {
	readonly toothNumber: number;
	readonly state: string;
	readonly surfaces?: readonly string[] | undefined;
}

export interface EstimatorResolution {
	serviceId: string | null;
	serviceTitle: string | null;
	priceRub: number | null;
	category: string | null;
	issue: EstimatorPriceIssue | null;
}

function normalizeTitle(title: string): string {
	return title.toLowerCase().replace(/ё/g, "е");
}

function catalogPriceRub(service: PlanPriceCatalogItem): number | null {
	return Number.isFinite(service.basePriceRub) ? service.basePriceRub : null;
}

/**
 * Услуга прайса под правило — либо ровно одна, либо ни одной с названной причиной.
 */
export function resolveEstimatorService(
	rule: EstimatorRule,
	catalog: readonly PlanPriceCatalogItem[],
	toothNumber?: number,
): EstimatorResolution {
	let matched = catalog.filter((service) => {
		if (service.category !== rule.match.category) return false;
		const title = normalizeTitle(service.title);
		return rule.match.keywords.some((keyword) =>
			title.includes(normalizeTitle(keyword)),
		);
	});

	// Интеллектуальное разделение для сменного прикуса (молочный vs постоянный зуб)
	if (toothNumber !== undefined && matched.length > 1) {
		const isDeciduous = isDeciduousFdiToothNumber(toothNumber);
		if (isDeciduous) {
			const pediatrics = matched.filter((s) => {
				const norm = normalizeTitle(s.title);
				return norm.includes("молочн") || norm.includes("детск");
			});
			if (pediatrics.length > 0) {
				matched = pediatrics;
			}
		} else {
			const adults = matched.filter((s) => {
				const norm = normalizeTitle(s.title);
				return !norm.includes("молочн") && !norm.includes("детск");
			});
			if (adults.length > 0) {
				matched = adults;
			}
		}
	}

	const matches = matched.filter((service) => service.active);
	const disabled = matched.filter((service) => !service.active);

	const single = matches.length === 1 ? matches[0] : undefined;
	if (single) {
		const priceRub = catalogPriceRub(single);
		return {
			serviceId: single.id,
			serviceTitle: single.title,
			priceRub,
			category: single.category,
			issue:
				priceRub === null
					? {
							kind: "price_missing",
							humanName: rule.match.humanName,
							matches: 1,
							catalogTitle: single.title,
						}
					: null,
		};
	}

	if (matches.length === 0 && disabled.length > 0) {
		const onlyDisabled = disabled.length === 1 ? disabled[0] : undefined;
		return {
			serviceId: null,
			serviceTitle: null,
			priceRub: null,
			category: null,
			issue: {
				kind: "service_disabled",
				humanName: rule.match.humanName,
				matches: disabled.length,
				...(onlyDisabled ? { catalogTitle: onlyDisabled.title } : {}),
			},
		};
	}

	return {
		serviceId: null,
		serviceTitle: null,
		priceRub: null,
		category: null,
		issue: {
			kind:
				matches.length > 1
					? "ambiguous"
					: catalog.length === 0
						? "catalog_empty"
						: "not_in_catalog",
			humanName: rule.match.humanName,
			matches: matches.length,
		},
	};
}

function capitalizeFirst(text: string): string {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Очистка и безопасное форматирование поверхностей зуба (без [object Object], undefined, null). */
export function formatSurfacesText(surfaces: unknown): string {
	if (!surfaces) return "";
	if (Array.isArray(surfaces)) {
		const cleaned = surfaces
			.map((s) => {
				if (typeof s === "string") return s.trim();
				if (typeof s === "object" && s !== null) {
					const rec = s as Record<string, unknown>;
					const val = rec.name ?? rec.code ?? rec.surface ?? rec.label;
					if (typeof val === "string") return val.trim();
				}
				return "";
			})
			.filter((s) => {
				const low = s.toLowerCase();
				return s.length > 0 && s !== "[object Object]" && low !== "undefined" && low !== "null";
			});
		return cleaned.length > 0 ? cleaned.join(", ") : "";
	}
	if (typeof surfaces === "string") {
		const trimmed = surfaces.trim();
		const low = trimmed.toLowerCase();
		return trimmed !== "[object Object]" && low !== "undefined" && low !== "null" ? trimmed : "";
	}
	return "";
}

export function surfaceSuffix(surfaces: unknown): string {
	const text = formatSurfacesText(surfaces);
	return text.length > 0 ? ` (Поверхности: ${text})` : "";
}

/** Человеческое название номера зуба по FDI (без «Tooth undefined»). */
export function formatToothFdiLabel(toothNumber?: number | null): string {
	if (
		toothNumber === undefined ||
		toothNumber === null ||
		!isValidFdiToothNumber(toothNumber)
	) {
		return "Позиция плана (без привязки к зубу)";
	}
	return `Зуб ${toothNumber}`;
}

/**
 * Строка сметы из правила и прайса.
 */
export function planItemFromRule(
	rule: EstimatorRule,
	tooth: EstimatorToothInput,
	catalog: readonly PlanPriceCatalogItem[],
): PlanItem {
	const resolution = resolveEstimatorService(rule, catalog, tooth.toothNumber);
	const baseName =
		resolution.serviceTitle ?? capitalizeFirst(rule.match.humanName);
	return {
		isAuto: true,
		suggestion: rule.key,
		toothNumber: tooth.toothNumber,
		priceId: resolution.serviceId,
		name: baseName + surfaceSuffix(tooth.surfaces),
		quantity: 1,
		price: resolution.priceRub,
		discount: 0,
		phase: rule.phase,
		...(resolution.category !== null ? { category: resolution.category } : {}),
		issue: resolution.issue,
	};
}

export const ESTIMATOR_RULE_SAMPLES: Partial<
	Record<EstimatorSuggestionKey, EstimatorRule>
> = (() => {
	const samples: Partial<Record<EstimatorSuggestionKey, EstimatorRule>> = {};
	const adultTooth = 11;
	for (const state of ["Caries", "Pulpitis", "Crown", "Planned_Implant"]) {
		for (const rule of estimatorRulesForTooth(state, adultTooth)) {
			samples[rule.key] = rule;
		}
	}
	return samples;
})();

export function estimatorDismissalKeys(item: PlanItem): string[] {
	if (item.toothNumber === undefined) return [];
	const keys: string[] = [];
	if (item.suggestion)
		keys.push(`${item.toothNumber}:подбор:${item.suggestion}`);
	if (item.priceId) keys.push(`${item.toothNumber}:прайс:${item.priceId}`);
	return keys;
}

export function reconcileAutoSuggestions(
	previous: readonly PlanItem[],
	teeth: readonly EstimatorToothInput[],
	catalog: readonly PlanPriceCatalogItem[],
	dismissed: ReadonlySet<string> = new Set(),
): { items: PlanItem[]; changed: boolean } {
	const keysByServiceId = new Map<string, Set<EstimatorSuggestionKey>>();
	for (const rule of Object.values(ESTIMATOR_RULE_SAMPLES)) {
		const { serviceId } = resolveEstimatorService(rule, catalog);
		if (!serviceId) continue;
		const keys =
			keysByServiceId.get(serviceId) ?? new Set<EstimatorSuggestionKey>();
		keys.add(rule.key);
		keysByServiceId.set(serviceId, keys);
	}

	const toothByNumber = new Map<number, EstimatorToothInput>();
	for (const tooth of teeth) toothByNumber.set(tooth.toothNumber, tooth);

	const allowedKeysByTooth = new Map<number, Set<EstimatorSuggestionKey>>();
	for (const tooth of teeth) {
		allowedKeysByTooth.set(
			tooth.toothNumber,
			new Set(
				estimatorRulesForTooth(tooth.state, tooth.toothNumber).map(
					(rule) => rule.key,
				),
			),
		);
	}

	let changed = false;

	// 1. Убрать автоматические строки, которых зубная формула больше не требует.
	const kept = previous.filter((item) => {
		if (!item.isAuto) return true;
		if (item.toothNumber === undefined) return true;
		const tooth = toothByNumber.get(item.toothNumber);
		if (!tooth) {
			changed = true;
			return false;
		}
		const allowed = allowedKeysByTooth.get(item.toothNumber);
		const itemKeys: Set<EstimatorSuggestionKey> | undefined = item.suggestion
			? new Set([item.suggestion])
			: item.priceId
				? keysByServiceId.get(item.priceId)
				: undefined;
		if (!itemKeys || itemKeys.size === 0) return true;
		const stillNeeded = [...itemKeys].some((key) => allowed?.has(key) === true);
		if (!stillNeeded) changed = true;
		return stillNeeded;
	});

	// 2. Добавить недостающие.
	const items = [...kept];
	for (const tooth of teeth) {
		for (const rule of estimatorRulesForTooth(tooth.state, tooth.toothNumber)) {
			const resolution = resolveEstimatorService(rule, catalog);
			const alreadyThere = items.some(
				(item) =>
					item.toothNumber === tooth.toothNumber &&
					(item.suggestion === rule.key ||
						(resolution.serviceId !== null &&
							item.priceId === resolution.serviceId)),
			);
			if (alreadyThere) continue;
			const wasDismissed =
				dismissed.has(`${tooth.toothNumber}:подбор:${rule.key}`) ||
				(resolution.serviceId !== null &&
					dismissed.has(`${tooth.toothNumber}:прайс:${resolution.serviceId}`));
			if (wasDismissed) continue;
			items.push(planItemFromRule(rule, tooth, catalog));
			changed = true;
		}
	}

	return { items, changed };
}

export function planItemFromServer(raw: unknown): PlanItem | null {
	if (!raw || typeof raw !== "object") return null;
	const item = raw as Record<string, unknown>;
	const finiteOr = (value: unknown, fallback: number) =>
		typeof value === "number" && Number.isFinite(value) ? value : fallback;
	const name = typeof item.name === "string" ? item.name : "";
	if (!name) return null;
	const priceId =
		typeof item.priceId === "string" && item.priceId.trim() !== ""
			? item.priceId
			: null;
	const price =
		typeof item.price === "number" && Number.isFinite(item.price)
			? item.price
			: null;
	const toothNumber = isValidFdiToothNumber(item.toothNumber)
		? item.toothNumber
		: undefined;
	return {
		...(typeof item.id === "string" ? { id: item.id } : {}),
		...(toothNumber !== undefined ? { toothNumber } : {}),
		priceId,
		name,
		quantity: Math.max(1, finiteOr(item.quantity, 1)),
		price,
		discount: finiteOr(item.discount, 0),
		phase: finiteOr(item.phase, 1),
		...(typeof item.isAuto === "boolean" ? { isAuto: item.isAuto } : {}),
		issue:
			price === null
				? { kind: "price_missing", humanName: name, matches: 0 }
				: priceId === null
					? { kind: "service_unlinked", humanName: name, matches: 0 }
					: null,
	};
}
