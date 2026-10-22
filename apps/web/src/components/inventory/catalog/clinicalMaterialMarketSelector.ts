/**
 * clinicalMaterialMarketSelector.ts — 1-Click Clinical Materials Selector for UI & Inventory.
 */

import {
	type ClinicalMarketMaterialItem,
	type ConsumableItemLink,
	ALL_CLINICAL_MARKET_MATERIALS,
	getClinicalMaterialsByDomain,
	getTopPopularMaterials,
	searchClinicalMaterials,
	findClinicalMaterialById,
} from "@dental/shared";
import {
	type MaterialOptionGroup,
	getGroupedClinicalMarketMaterials,
} from "./groupedMarketMaterials.js";

export type { MaterialOptionGroup };
export { getGroupedClinicalMarketMaterials };

export function convertMarketMaterialToBomLink(
	material: ClinicalMarketMaterialItem,
	service804nCode: string,
	serviceTitle: string,
	quantity = 1,
): ConsumableItemLink {
	const costPriceKopecks = Math.round(material.approximatePriceRub * 100);

	let category: ConsumableItemLink["category"] = "other";
	if (
		material.domain.startsWith("therapy_") ||
		material.domain === "prostho_cement_perm" ||
		material.domain === "prostho_cement_temp"
	) {
		category = "composite";
	} else if (material.domain === "endo_file") {
		category = "endo_file";
	} else if (material.domain === "surg_suture") {
		category = "suture";
	} else if (material.domain === "endo_irrigation") {
		category = "disinfectant";
	}

	return {
		id: `link-${service804nCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${material.id}`,
		service804nCode,
		serviceTitle,
		inventoryItemId: material.id,
		itemName: material.nameRu,
		category,
		unit: material.defaultUnit as ConsumableItemLink["unit"],
		quantityPerService: quantity,
		isMandatory: true,
		costPriceKopecks,
		notes: `Каталог 90% рынка РФ/СНГ (#${material.marketRank} в ${material.domain}). ${material.clinicalIndicationsRu}`,
	};
}

export interface WarehouseItemDraft {
	readonly sku: string;
	readonly name: string;
	readonly unit: string;
	readonly defaultPurchasePriceRub: number;
	readonly manufacturer: string;
	readonly country: string;
	readonly category: string;
	readonly description: string;
	readonly isSharps: boolean;
	readonly isClassBWaste: boolean;
}

export function convertMarketMaterialToWarehouseDraft(
	material: ClinicalMarketMaterialItem,
): WarehouseItemDraft {
	const isSharps =
		material.domain === "surg_suture" ||
		material.domain === "endo_file" ||
		material.domain === "ortho_miniscrew";

	const isClassBWaste =
		isSharps ||
		material.domain === "implant_system" ||
		material.domain === "bone_graft_membrane" ||
		material.domain === "surg_hemostatic" ||
		material.domain === "endo_irrigation";

	return {
		sku: `SKU-${material.id.toUpperCase()}`,
		name: material.nameRu,
		unit: material.defaultUnit,
		defaultPurchasePriceRub: material.approximatePriceRub,
		manufacturer: material.manufacturer,
		country: material.country,
		category: material.domain,
		description: `${material.clinicalIndicationsRu}. Позиция #${material.marketRank} на рынке РФ/СНГ.`,
		isSharps,
		isClassBWaste,
	};
}

export {
	ALL_CLINICAL_MARKET_MATERIALS,
	getClinicalMaterialsByDomain,
	getTopPopularMaterials,
	searchClinicalMaterials,
	findClinicalMaterialById,
};
