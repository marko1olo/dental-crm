import type {
	ConsumableCategory,
	ConsumableItemLink,
	ConsumableUnit,
	PlannedServiceConsumable,
	RenderedServiceItem,
	TreatmentConsumableLink,
} from "./consumableTypes.js";
import { CONSUMABLE_UNIT_LABELS } from "./consumableTypes.js";

export function roundQuantity(val: number, decimals = 4): number {
	if (!Number.isFinite(val)) return 0;
	const factor = 10 ** decimals;
	return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function formatQuantityRu(qty: number, unit?: string): string {
	const rounded = roundQuantity(qty, 4);
	const str = String(rounded).replace(".", ",");
	return unit ? `${str} ${unit}` : str;
}

export function calculateServiceConsumables(
	renderedServices: RenderedServiceItem[],
	links: ConsumableItemLink[],
): PlannedServiceConsumable[] {
	const planned: PlannedServiceConsumable[] = [];

	for (const service of renderedServices) {
		const serviceQuantity = service.quantity ?? 1;
		const toothNumber = service.toothNumber ?? null;

		let matchedLinks = links.filter((l) => l.service804nCode === service.serviceCode);
		if (matchedLinks.length === 0 && service.serviceCode.includes(".")) {
			const parts = service.serviceCode.split(".");
			if (parts.length > 3) {
				matchedLinks = links.filter((l) => l.service804nCode === parts.slice(0, 3).join("."));
			}
		}

		if (matchedLinks.length === 0) {
			const candidate = (service.serviceTitle || service.serviceCode || "").trim().toLowerCase();
			if (
				candidate.includes("filtek") || candidate.includes("estelite") ||
				(candidate.includes("препарирование") && candidate.includes("пломб")) ||
				candidate.includes("светового отверждения")
			) {
				matchedLinks = links.filter(
					(l) => l.service804nCode === "A16.07.002.011" || l.service804nCode === "A16.07.002.001" || l.service804nCode === "A16.07.002",
				);
			} else if (candidate.length > 3) {
				matchedLinks = links.filter((l) => l.serviceTitle.toLowerCase().includes(candidate) || candidate.includes(l.serviceTitle.toLowerCase()));
			}
		}

		for (const link of matchedLinks) {
			const requiredQuantity = roundQuantity(link.quantityPerService * serviceQuantity, 4);
			const totalCostKopecks = Math.round(link.costPriceKopecks * requiredQuantity);
			planned.push({
				linkId: link.id, service804nCode: link.service804nCode, serviceTitle: link.serviceTitle, toothNumber,
				inventoryItemId: link.inventoryItemId, itemName: link.itemName, category: link.category ?? "other",
				unit: link.unit, requiredQuantity, unitCostPriceKopecks: link.costPriceKopecks, totalCostPriceKopecks: totalCostKopecks,
				isMandatory: link.isMandatory ?? true,
			});
		}
	}
	return planned;
}

export function toConsumableItemLink(
	legacy: TreatmentConsumableLink,
	defaultCategory: ConsumableCategory = "other",
	costPriceKopecks = 0,
): ConsumableItemLink {
	return {
		id: legacy.id, service804nCode: legacy.catalogItemId, serviceTitle: legacy.catalogItemName || legacy.catalogItemId,
		inventoryItemId: legacy.inventoryItemId, itemName: legacy.inventoryItemName, category: defaultCategory,
		unit: (legacy.unit in CONSUMABLE_UNIT_LABELS ? legacy.unit : "шт") as ConsumableUnit,
		quantityPerService: legacy.quantityPerService, isMandatory: true, costPriceKopecks, notes: legacy.note ?? null,
	};
}

export function toTreatmentConsumableLink(link: ConsumableItemLink): TreatmentConsumableLink {
	return {
		id: link.id, catalogItemId: link.service804nCode, catalogItemName: link.serviceTitle,
		inventoryItemId: link.inventoryItemId, inventoryItemName: link.itemName, unit: link.unit,
		quantityPerService: link.quantityPerService, note: link.notes ?? undefined,
	};
}
