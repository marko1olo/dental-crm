import {
	kopecksToRubles,
	rublesToKopecks,
	type DentalSpecialty,
	type ServiceCatalogItem,
	type ServiceCategory,
} from "@dental/shared";
import {
	normalizeCategoryToBackend,
	getSpecialtyForCategory,
} from "../catalog/pricelistCatalogData";
import { clientLogger } from "../../services/logging/clientLogger";
import { showToast } from "../GlobalToast";

export interface SyncableCatalogItemInput {
	readonly id?: string | undefined;
	readonly code?: string | undefined;
	readonly code804n?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly catalogCode?: string | undefined;
	readonly standardCode?: string | undefined;
	readonly regulatoryCode?: string | undefined;
	readonly title?: string | undefined;
	readonly commercialTitle?: string | undefined;
	readonly statutoryTitle804n?: string | undefined;
	readonly name?: string | undefined;
	readonly category?: string | undefined;
	readonly specialty?: string | undefined;
	readonly basePriceRub?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly priceKopecks?: number | undefined;
	readonly basePriceKopecks?: number | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly materialCostRub?: number | undefined;
	readonly costKopecks?: number | undefined;
	readonly costRub?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly durationMin?: number | undefined;
	readonly estimatedDurationMin?: number | undefined;
	readonly active?: boolean | undefined;
	readonly isActive?: boolean | undefined;
	readonly taxDeductible?: boolean | undefined;
}

export interface CatalogMutationPayload {
	title: string;
	code: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	basePriceRub: number;
	materialsCostRub?: number;
	durationMinutes: number;
	taxDeductible: boolean;
	active: boolean;
}

function normalizeTitleKey(title: string): string {
	return title
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[«»""''„“]/g, '"')
		.replace(/[\u00A0\s]+/g, " ")
		.trim();
}

function extractItemCode(item: SyncableCatalogItemInput): string {
	return (
		item.code ||
		item.code804n ||
		item.serviceCode ||
		item.catalogCode ||
		item.standardCode ||
		item.regulatoryCode ||
		""
	).trim().toUpperCase();
}

function extractItemTitle(item: SyncableCatalogItemInput): string {
	return (
		item.title ||
		item.commercialTitle ||
		item.name ||
		item.statutoryTitle804n ||
		""
	).trim();
}

function extractItemPriceRub(item: SyncableCatalogItemInput): number {
	if (typeof item.basePriceRub === "number" && Number.isFinite(item.basePriceRub)) {
		return kopecksToRubles(rublesToKopecks(item.basePriceRub));
	}
	if (typeof item.priceRub === "number" && Number.isFinite(item.priceRub)) {
		return kopecksToRubles(rublesToKopecks(item.priceRub));
	}
	if (typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)) {
		return kopecksToRubles(item.priceKopecks);
	}
	if (typeof item.basePriceKopecks === "number" && Number.isFinite(item.basePriceKopecks)) {
		return kopecksToRubles(item.basePriceKopecks);
	}
	return 0;
}

function extractItemMaterialsCostRub(item: SyncableCatalogItemInput): number {
	if (typeof item.materialsCostRub === "number" && Number.isFinite(item.materialsCostRub)) {
		return kopecksToRubles(rublesToKopecks(item.materialsCostRub));
	}
	if (typeof item.materialCostRub === "number" && Number.isFinite(item.materialCostRub)) {
		return kopecksToRubles(rublesToKopecks(item.materialCostRub));
	}
	if (typeof item.costKopecks === "number" && Number.isFinite(item.costKopecks)) {
		return kopecksToRubles(item.costKopecks);
	}
	if (typeof item.costRub === "number" && Number.isFinite(item.costRub)) {
		return kopecksToRubles(rublesToKopecks(item.costRub));
	}
	return 0;
}

function extractItemDuration(item: SyncableCatalogItemInput): number {
	if (typeof item.durationMinutes === "number" && item.durationMinutes > 0) {
		return item.durationMinutes;
	}
	if (typeof item.durationMin === "number" && item.durationMin > 0) {
		return item.durationMin;
	}
	if (typeof item.estimatedDurationMin === "number" && item.estimatedDurationMin > 0) {
		return item.estimatedDurationMin;
	}
	return 30;
}

export async function syncPricelistItemsToCatalog({
	items,
	existingServices,
	createServiceCatalogItem,
	updateServiceCatalogItem,
}: {
	readonly items: readonly SyncableCatalogItemInput[];
	readonly existingServices: readonly ServiceCatalogItem[];
	readonly createServiceCatalogItem?:
		| ((payload: CatalogMutationPayload) => Promise<unknown>)
		| undefined;
	readonly updateServiceCatalogItem?:
		| ((id: string, payload: CatalogMutationPayload) => Promise<unknown>)
		| undefined;
}): Promise<void> {
	const existingByCode = new Map<string, ServiceCatalogItem>();
	const existingByTitle = new Map<string, ServiceCatalogItem>();

	for (const s of existingServices) {
		const normCode = s.code?.trim().toUpperCase();
		if (normCode) existingByCode.set(normCode, s);
		const normTitle = normalizeTitleKey(s.title || "");
		if (normTitle) existingByTitle.set(normTitle, s);
	}

	for (const item of items) {
		const itemCode = extractItemCode(item);
		const itemTitle = extractItemTitle(item);
		const normTitle = normalizeTitleKey(itemTitle);

		const existing =
			(itemCode ? existingByCode.get(itemCode) : undefined) ??
			(normTitle ? existingByTitle.get(normTitle) : undefined);

		const rawCategory = item.category || "therapy";
		const category = normalizeCategoryToBackend(rawCategory);
		const specialty = (
			item.specialty && item.specialty !== "anesthesiologist"
				? item.specialty
				: getSpecialtyForCategory(rawCategory)
		) as DentalSpecialty;

		const exactBasePriceRub = extractItemPriceRub(item);
		const materialsCostRub = extractItemMaterialsCostRub(item);
		const durationMinutes = extractItemDuration(item);
		const active = item.active !== false && item.isActive !== false;

		const payload: CatalogMutationPayload = {
			title: itemTitle || "Стоматологическая услуга",
			code: itemCode,
			category,
			specialty,
			basePriceRub: exactBasePriceRub,
			materialsCostRub,
			durationMinutes,
			taxDeductible: item.taxDeductible !== false,
			active,
		};

		try {
			let savedRecord: ServiceCatalogItem | null = null;
			if (existing?.id) {
				if (updateServiceCatalogItem) {
					const res = await updateServiceCatalogItem(existing.id, payload);
					if (res && typeof res === "object" && "title" in res) {
						savedRecord = res as ServiceCatalogItem;
					}
				}
			} else {
				if (createServiceCatalogItem) {
					const res = await createServiceCatalogItem(payload);
					if (res && typeof res === "object" && "title" in res) {
						savedRecord = res as ServiceCatalogItem;
					}
				}
			}

			// Upsert local caches immediately to prevent duplicate creation on duplicate rows in same batch
			const targetRecord: ServiceCatalogItem = savedRecord || {
				id: existing?.id || `synced-${itemCode || Math.random().toString(36).slice(2)}`,
				organizationId: existing?.organizationId || "",
				code: itemCode,
				title: itemTitle || "Стоматологическая услуга",
				aliases: existing?.aliases || [],
				category,
				specialty,
				basePriceRub: exactBasePriceRub,
				durationMinutes,
				taxDeductible: item.taxDeductible !== false,
				active,
				priceKopecks: rublesToKopecks(exactBasePriceRub),
			};

			if (itemCode) existingByCode.set(itemCode, targetRecord);
			if (normTitle) existingByTitle.set(normTitle, targetRecord);
		} catch (err) {
			clientLogger.error("Failed to sync catalog item", { itemTitle, err }, { module: "catalogSyncHelper" });
			showToast(`Не удалось синхронизировать услугу «${itemTitle || "Без названия"}»`, "warning");
		}
	}
}
