/**
 * apps/web/src/components/catalog/pricelist/pricelistCatalogStorage.ts
 *
 * Синхронизация прейскуранта с базой данных PostgreSQL 18 через Fastify API и localStorage кэш.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 250).
 * Расчеты денег строго через @dental/shared/src/money.ts (Мандат 8b).
 */

import { generateUuidV7, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import {
	getSpecialtyForCategory,
	normalizeCategoryFromBackend,
	normalizeCategoryToBackend,
	type PricelistStudioItem,
} from "./pricelistCatalogTypes";
import { CANONICAL_PRICELIST_PRESETS } from "./pricelistCatalogPresets";

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
		clientLogger.warn("Failed to read pricelist from storage, using preset fallback", e, {
			module: "pricelistCatalogStorage",
		});
	}
	return CANONICAL_PRICELIST_PRESETS;
}

/**
 * Сохранение прейскуранта в постоянную память браузера
 */
export function saveCanonicalPricelist(items: readonly PricelistStudioItem[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
	} catch (e) {
		clientLogger.warn("Failed to persist pricelist to storage", e, {
			module: "pricelistCatalogStorage",
		});
	}
}

interface RawBackendPricelistItem {
	readonly id?: string | undefined;
	readonly code?: string | undefined;
	readonly order804nCode?: string | undefined;
	readonly title?: string | undefined;
	readonly category?: string | undefined;
	readonly basePriceRub?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly priceKopecks?: number | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly materialCostRub?: number | undefined;
	readonly costRub?: number | undefined;
	readonly costKopecks?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly durationMin?: number | undefined;
	readonly active?: boolean | undefined;
	readonly isActive?: boolean | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly aliases?: readonly string[] | undefined;
	readonly isBundle?: boolean | undefined;
}

/**
 * Реальная загрузка прейскуранта из базы данных PostgreSQL 18 через Fastify API (DEF-PRICE-01).
 */
export async function fetchPricelistFromBackend(
	headers?: Record<string, string>,
): Promise<readonly PricelistStudioItem[]> {
	if (typeof window === "undefined") return CANONICAL_PRICELIST_PRESETS;
	try {
		const res = await fetch("/api/pricelist", {
			method: "GET",
			headers: {
				...denteClinicalReadHeaders(),
				Accept: "application/json",
				...headers,
			},
		});
		if (!res.ok) {
			clientLogger.warn(
				`[pricelist] GET /api/pricelist status ${res.status}, using offline cache`,
				{ status: res.status },
				{ module: "pricelistCatalogStorage" },
			);
			return loadCanonicalPricelist();
		}
		const raw = (await res.json()) as {
			readonly data?: { readonly items?: readonly RawBackendPricelistItem[] | undefined } | readonly RawBackendPricelistItem[] | undefined;
			readonly items?: readonly RawBackendPricelistItem[] | undefined;
		};
		const unwrapped = raw?.data ?? raw;
		const rawItems: readonly RawBackendPricelistItem[] = Array.isArray(unwrapped)
			? unwrapped
			: unwrapped && typeof unwrapped === "object" && "items" in unwrapped && Array.isArray(unwrapped.items)
				? unwrapped.items
				: [];
		if (rawItems.length === 0) {
			return loadCanonicalPricelist();
		}
		const mapped: PricelistStudioItem[] = rawItems.map((item, idx) => {
			const rawPrice = item.basePriceRub ?? item.priceRub ?? 0;
			const priceKopecks =
				typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)
					? Math.round(item.priceKopecks)
					: rublesToKopecks(Number(rawPrice));
			const rawCost = item.materialsCostRub ?? item.materialCostRub ?? item.costRub ?? 0;
			const costKopecks =
				typeof item.costKopecks === "number" && Number.isFinite(item.costKopecks)
					? Math.round(item.costKopecks)
					: rublesToKopecks(Number(rawCost));
			return {
				id: item.id || `srv-${idx}`,
				code: item.code || item.order804nCode || `ПОЗ-${idx + 1}`,
				serviceCode: item.code || item.order804nCode || `ПОЗ-${idx + 1}`,
				regulatoryCode: item.order804nCode || item.code,
				statutoryCode: item.order804nCode || item.code,
				code804n: item.order804nCode || item.code,
				title: item.title || "Стоматологическая услуга",
				commercialTitle: item.title || "Стоматологическая услуга",
				category: normalizeCategoryFromBackend(item.category),
				priceKopecks,
				basePriceRub: kopecksToRubles(priceKopecks),
				priceRub: kopecksToRubles(priceKopecks),
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
		clientLogger.warn("[pricelist] fetch /api/pricelist failed", err, {
			module: "pricelistCatalogStorage",
		});
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
	const basePriceRub = kopecksToRubles(item.priceKopecks);
	const materialsCostRub = item.costKopecks ? kopecksToRubles(item.costKopecks) : 0;
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

	const isExisting =
		item.id &&
		!item.id.startsWith("srv-") &&
		!item.id.startsWith("imp-") &&
		!item.id.startsWith("bundle-");
	const url = isExisting ? `/api/pricelist/${item.id}` : "/api/pricelist";
	const method = isExisting ? "PUT" : "POST";

	try {
		const res = await fetch(url, {
			method,
			headers: {
				...denteClinicalMutationHeaders(),
				"Content-Type": "application/json",
				Accept: "application/json",
				"Idempotency-Key": generateUuidV7(),
				...headers,
			},
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			clientLogger.warn(`[pricelist] ${method} ${url} failed with ${res.status}`, { status: res.status }, {
				module: "pricelistCatalogStorage",
			});
			return { success: false };
		}
		const raw = (await res.json()) as { id?: string; data?: { id?: string } };
		const data = raw?.data ?? raw;
		const resolvedId = data?.id || item.id;
		return resolvedId !== undefined ? { success: true, id: resolvedId } : { success: true };
	} catch (err) {
		clientLogger.warn("[pricelist] syncServiceItemToBackend error", err, {
			module: "pricelistCatalogStorage",
		});
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
			priceRub: kopecksToRubles(it.priceKopecks),
			costRub: kopecksToRubles(it.costKopecks),
			durationMinutes: it.durationMin,
			suggestedAction: "update_existing",
			matchedExistingServiceId: it.id && !it.id.startsWith("srv-") ? it.id : undefined,
		}));

		const res = await fetch("/api/pricelist/batch-import", {
			method: "POST",
			headers: {
				...denteClinicalMutationHeaders(),
				"Content-Type": "application/json",
				Accept: "application/json",
				"Idempotency-Key": generateUuidV7(),
				...headers,
			},
			body: JSON.stringify({
				items: batchItems,
				collisionStrategy: "update_existing",
			}),
		});
		return res.ok;
	} catch (err) {
		clientLogger.warn("[pricelist] batchSyncPricelistToBackend error", err, {
			module: "pricelistCatalogStorage",
		});
		return false;
	}
}
