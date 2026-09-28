/**
 * clinicalMaterialMarketSelector.ts — 1-Click Clinical Materials Selector for UI & Inventory.
 *
 * Wave 134+ / Red Team Mandates 8e, 8k, 8n (Doctor Autonomy & Scale Sovereignty):
 * Provides frontend components, warehouse acceptance, and tech-map recipe builders
 * with instant 1-click access to the 90%+ CIS market share clinical materials catalog.
 *
 * ZERO EMOJIS — Exact deterministic typing — Descending popularity ordering.
 */

import {
	type ClinicalMarketMaterialItem,
	type ClinicalMaterialDomain,
	type ConsumableItemLink,
	ALL_CLINICAL_MARKET_MATERIALS,
	getClinicalMaterialsByDomain,
	getTopPopularMaterials,
	searchClinicalMaterials,
	findClinicalMaterialById,
} from "@dental/shared";

export interface MaterialOptionGroup {
	readonly domain: ClinicalMaterialDomain;
	readonly titleRu: string;
	readonly items: readonly ClinicalMarketMaterialItem[];
}

/**
 * Returns grouped clinical materials for dropdowns and popover menus,
 * with items strictly sorted by descending market popularity (Rank 1 first).
 */
export function getGroupedClinicalMarketMaterials(): readonly MaterialOptionGroup[] {
	return [
		{
			domain: "implant_system",
			titleRu: "Дентальные имплантаты (16 систем РФ/СНГ)",
			items: getClinicalMaterialsByDomain("implant_system"),
		},
		{
			domain: "bone_graft_membrane",
			titleRu: "Костная пластика и мембраны (НКР)",
			items: getClinicalMaterialsByDomain("bone_graft_membrane"),
		},
		{
			domain: "surg_suture",
			titleRu: "Хирургический шовный материал",
			items: getClinicalMaterialsByDomain("surg_suture"),
		},
		{
			domain: "surg_hemostatic",
			titleRu: "Хирургический гемостаз",
			items: getClinicalMaterialsByDomain("surg_hemostatic"),
		},
		{
			domain: "endo_file",
			titleRu: "Эндодонтические машинные файлы",
			items: getClinicalMaterialsByDomain("endo_file"),
		},
		{
			domain: "endo_sealer",
			titleRu: "Эндодонтические силеры",
			items: getClinicalMaterialsByDomain("endo_sealer"),
		},
		{
			domain: "endo_irrigation",
			titleRu: "Эндодонтическая ирригация и промывание",
			items: getClinicalMaterialsByDomain("endo_irrigation"),
		},
		{
			domain: "endo_dressing",
			titleRu: "Временные внутриканальные вложения",
			items: getClinicalMaterialsByDomain("endo_dressing"),
		},
		{
			domain: "ortho_bracket",
			titleRu: "Ортодонтические брекет-системы",
			items: getClinicalMaterialsByDomain("ortho_bracket"),
		},
		{
			domain: "ortho_aligner",
			titleRu: "Элайнеры и прозрачные каппы",
			items: getClinicalMaterialsByDomain("ortho_aligner"),
		},
		{
			domain: "ortho_archwire",
			titleRu: "Ортодонтические дуги",
			items: getClinicalMaterialsByDomain("ortho_archwire"),
		},
		{
			domain: "ortho_miniscrew",
			titleRu: "Ортодонтические микроимплантаты (TAD)",
			items: getClinicalMaterialsByDomain("ortho_miniscrew"),
		},
		{
			domain: "prostho_a_silicone",
			titleRu: "А-силиконы и полиэфиры",
			items: getClinicalMaterialsByDomain("prostho_a_silicone"),
		},
		{
			domain: "prostho_c_silicone",
			titleRu: "С-силиконы",
			items: getClinicalMaterialsByDomain("prostho_c_silicone"),
		},
		{
			domain: "prostho_bite_reg",
			titleRu: "Регистраторы прикуса",
			items: getClinicalMaterialsByDomain("prostho_bite_reg"),
		},
		{
			domain: "prostho_cement_perm",
			titleRu: "Постоянные стоматологические цементы",
			items: getClinicalMaterialsByDomain("prostho_cement_perm"),
		},
		{
			domain: "prostho_cement_temp",
			titleRu: "Временные стоматологические цементы",
			items: getClinicalMaterialsByDomain("prostho_cement_temp"),
		},
		{
			domain: "prostho_retraction",
			titleRu: "Ретракционные нити",
			items: getClinicalMaterialsByDomain("prostho_retraction"),
		},
		{
			domain: "lab_cad_material",
			titleRu: "CAD/CAM зуботехнические материалы",
			items: getClinicalMaterialsByDomain("lab_cad_material"),
		},
		{
			domain: "therapy_composite",
			titleRu: "Светоотверждаемые нанокомпозиты",
			items: getClinicalMaterialsByDomain("therapy_composite"),
		},
		{
			domain: "therapy_adhesive",
			titleRu: "Адгезивные системы",
			items: getClinicalMaterialsByDomain("therapy_adhesive"),
		},
	];
}

/**
 * Converts a ClinicalMarketMaterialItem into a ConsumableItemLink template
 * for 1-click binding to an 804n clinical service.
 */
export function convertMarketMaterialToBomLink(
	material: ClinicalMarketMaterialItem,
	service804nCode: string,
	serviceTitle: string,
	quantity = 1,
): ConsumableItemLink {
	const costPriceKopecks = Math.round(material.approximatePriceRub * 100);

	// Map domain to consumable category
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

/**
 * Converts a ClinicalMarketMaterialItem into a warehouse item draft
 * for 1-click receipt or manual warehouse item creation.
 */
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
