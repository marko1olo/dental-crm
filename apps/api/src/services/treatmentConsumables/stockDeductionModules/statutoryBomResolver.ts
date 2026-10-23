/**
 * statutoryBomResolver.ts — Tier 4 Statutory defaults & Turnkey Recipes.
 */

import {
	CANONICAL_PROCEDURE_RECIPES,
	DEFAULT_804N_CONSUMABLE_LINKS,
} from "@dental/shared";
import { DEFAULT_804N_BOM_SEEDS } from "../../inventory/defaultBomSeeds.js";
import type { RawRequiredMaterial, ServiceDescriptor } from "./stockDeductionTypes.js";

export function resolveStatutoryBomForService(
	meta: ServiceDescriptor,
	srvQty: number,
): RawRequiredMaterial[] {
	const materials: RawRequiredMaterial[] = [];

	// 4a. CANONICAL_PROCEDURE_RECIPES (@dental/shared)
	const canonicalRecipe = CANONICAL_PROCEDURE_RECIPES.find((rec) => {
		return (
			rec.code804n === meta.order804nCode ||
			rec.code804n === meta.serviceCode ||
			rec.code804n === meta.rawToken ||
			rec.aliases804n.includes(meta.rawToken) ||
			(meta.order804nCode && rec.aliases804n.includes(meta.order804nCode)) ||
			(meta.title && rec.titleRu.toLowerCase().includes(meta.title.toLowerCase()))
		);
	});

	if (canonicalRecipe && canonicalRecipe.items.length > 0) {
		for (const item of canonicalRecipe.items) {
			materials.push({
				key: item.inventoryItemId,
				name: item.nameRu,
				quantity: item.standardQuantity * srvQty,
				unit: item.unit,
				defaultCostRub: Number((item.estimatedUnitCostKopecks / 100).toFixed(2)),
			});
		}
		return materials;
	}

	// 4b. DEFAULT_804N_BOM_SEEDS (defaultBomSeeds.ts)
	const seed = DEFAULT_804N_BOM_SEEDS.find((s) => {
		return (
			s.serviceCode === meta.serviceCode ||
			s.serviceCode === meta.order804nCode ||
			s.serviceCode === meta.rawToken ||
			(meta.title && s.serviceTitle.toLowerCase().includes(meta.title.toLowerCase()))
		);
	});

	if (seed && seed.materials.length > 0) {
		for (const mat of seed.materials) {
			materials.push({
				key: mat.name,
				name: mat.name,
				quantity: mat.quantityToDeduct * srvQty,
				unit: mat.unit,
				defaultCostRub: mat.defaultUnitCostRub,
			});
		}
		return materials;
	}

	// 4c. DEFAULT_804N_CONSUMABLE_LINKS (@dental/shared)
	const links = DEFAULT_804N_CONSUMABLE_LINKS.filter((l) => {
		return (
			l.service804nCode === meta.serviceCode ||
			l.service804nCode === meta.order804nCode ||
			l.service804nCode === meta.rawToken
		);
	});

	if (links.length > 0) {
		for (const link of links) {
			const linkAny = link as any;
			materials.push({
				key: link.inventoryItemId,
				name: linkAny.itemName ?? linkAny.name ?? "Расходник",
				quantity: Number(linkAny.quantityToDeduct ?? linkAny.quantityPerService ?? 1) * srvQty,
				unit: link.unit,
				defaultCostRub: Number(linkAny.defaultUnitCostRub ?? 0),
			});
		}
	}

	return materials;
}
