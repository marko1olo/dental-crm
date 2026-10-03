import type {
	DentalSpecialty,
	ServiceCatalogItem,
	ServiceCategory,
} from "@dental/shared";
import type { ServicePricelistItem } from "../catalog/pricelist/servicePricelistPresets";

function normalizeTitleKey(title: string): string {
	return title
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[«»""''„“]/g, '"')
		.replace(/[\u00A0\s]+/g, " ")
		.trim();
}

export async function syncPricelistItemsToCatalog({
	items,
	existingServices,
	createServiceCatalogItem,
	updateServiceCatalogItem,
}: {
	readonly items: readonly ServicePricelistItem[];
	readonly existingServices: readonly ServiceCatalogItem[];
	// biome-ignore lint/suspicious/noExplicitAny: generic mutation handler
	readonly createServiceCatalogItem?: (payload: any) => Promise<any>;
	// biome-ignore lint/suspicious/noExplicitAny: generic mutation handler
	readonly updateServiceCatalogItem?: (id: string, payload: any) => Promise<any>;
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
		const itemCode = (item.code804n || "").trim().toUpperCase();
		const itemTitle = (
			item.commercialTitle ||
			item.statutoryTitle804n ||
			""
		).trim();
		const normTitle = normalizeTitleKey(itemTitle);

		const existing =
			(itemCode ? existingByCode.get(itemCode) : undefined) ??
			(normTitle ? existingByTitle.get(normTitle) : undefined);

		const category = (item.category as ServiceCategory) || "therapy";
		const specialty =
			(item.specialty === "anesthesiologist"
				? "therapist"
				: (item.specialty as DentalSpecialty)) || "therapist";

		const exactBasePriceRub = Number.isFinite(item.basePriceRub)
			? Math.round(item.basePriceRub * 100) / 100
			: 0;

		// Preserve clinical duration if provided
		const rawItem = item as unknown as { estimatedDurationMin?: number; durationMinutes?: number };
		const durationMinutes =
			typeof rawItem.estimatedDurationMin === "number" && rawItem.estimatedDurationMin > 0
				? rawItem.estimatedDurationMin
				: typeof rawItem.durationMinutes === "number" && rawItem.durationMinutes > 0
					? rawItem.durationMinutes
					: 30;

		const payload = {
			title: itemTitle || "Медицинская услуга",
			code: itemCode,
			category,
			specialty,
			basePriceRub: exactBasePriceRub,
			durationMinutes,
			taxDeductible: true,
			active: true,
		};

		try {
			let savedRecord: ServiceCatalogItem | null = null;
			if (existing?.id) {
				if (updateServiceCatalogItem) {
					savedRecord = await updateServiceCatalogItem(existing.id, payload);
				}
			} else {
				if (createServiceCatalogItem) {
					savedRecord = await createServiceCatalogItem(payload);
				}
			}

			// Upsert local caches immediately to prevent duplicate creation on duplicate rows in same batch
			const targetRecord: ServiceCatalogItem = savedRecord || {
				id: existing?.id || `synced-${itemCode || Math.random().toString(36).slice(2)}`,
				organizationId: existing?.organizationId || "",
				code: itemCode,
				title: itemTitle || "Медицинская услуга",
				aliases: existing?.aliases || [],
				category,
				specialty,
				basePriceRub: exactBasePriceRub,
				durationMinutes,
				taxDeductible: true,
				active: true,
			};

			if (itemCode) existingByCode.set(itemCode, targetRecord);
			if (normTitle) existingByTitle.set(normTitle, targetRecord);
		} catch (err) {
			console.error("Failed to sync catalog item:", itemTitle, err);
		}
	}
}
