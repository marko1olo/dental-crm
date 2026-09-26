import type {
	DentalSpecialty,
	ServiceCatalogItem,
	ServiceCategory,
} from "@dental/shared";
import type { ServicePricelistItem } from "../catalog/pricelist/servicePricelistPresets";

export async function syncPricelistItemsToCatalog({
	items,
	existingServices,
	createServiceCatalogItem,
	updateServiceCatalogItem,
}: {
	readonly items: readonly ServicePricelistItem[];
	readonly existingServices: readonly ServiceCatalogItem[];
	readonly createServiceCatalogItem?: (payload: any) => Promise<any>;
	readonly updateServiceCatalogItem?: (id: string, payload: any) => Promise<any>;
}): Promise<void> {
	const existingByCode = new Map(
		existingServices.map((s) => [s.code.trim().toUpperCase(), s]),
	);
	const existingByTitle = new Map(
		existingServices.map((s) => [s.title.trim().toLowerCase(), s]),
	);

	for (const item of items) {
		const itemCode = (item.code804n || "").trim().toUpperCase();
		const itemTitle = (
			item.commercialTitle ||
			item.statutoryTitle804n ||
			""
		).trim();
		const existing =
			(itemCode ? existingByCode.get(itemCode) : undefined) ??
			existingByTitle.get(itemTitle.toLowerCase());

		const category = (item.category as ServiceCategory) || "therapy";
		const specialty =
			(item.specialty === "anesthesiologist"
				? "therapist"
				: (item.specialty as DentalSpecialty)) || "therapist";
		const payload = {
			title: itemTitle || "Медицинская услуга",
			code: itemCode,
			category,
			specialty,
			basePriceRub: item.basePriceRub,
			durationMinutes: 30,
			taxDeductible: true,
			active: true,
		};

		try {
			if (existing?.id) {
				if (updateServiceCatalogItem) {
					await updateServiceCatalogItem(existing.id, payload);
				}
			} else {
				if (createServiceCatalogItem) {
					await createServiceCatalogItem(payload);
				}
			}
		} catch (err) {
			console.error("Failed to sync catalog item:", itemTitle, err);
		}
	}
}
