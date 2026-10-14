/**
 * stockFefoBatchSelector.ts — Layer 1/2: Multi-tier service metadata & Bill-of-Materials (BOM) resolution.
 *
 * Implements 4-tier BOM resolution:
 * Tier 1: Active Procedure Tech Cards (procedure_tech_cards + procedure_tech_card_items)
 * Tier 2: Treatment Consumables mapping table (treatment_consumables)
 * Tier 3: Procedure Material Rules (procedure_material_rules)
 * Tier 4: Statutory defaults (CANONICAL_PROCEDURE_RECIPES, DEFAULT_804N_BOM_SEEDS, DEFAULT_804N_CONSUMABLE_LINKS)
 */

import {
	CANONICAL_PROCEDURE_RECIPES,
	DEFAULT_804N_CONSUMABLE_LINKS,
} from "@dental/shared";
import { and, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import {
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
	serviceCatalogItems,
	treatmentConsumables,
} from "../../../db/schema.js";
import { DEFAULT_804N_BOM_SEEDS } from "../../inventory/defaultBomSeeds.js";
import type { DbExecutor } from "../types.js";
import {
	isPureUuid,
	type RawRequiredMaterial,
	type ServiceDescriptor,
} from "./stockDeductionTypes.js";

/**
 * Resolves raw service identifiers (UUIDs, 804n codes, local codes) into canonical catalog metadata.
 */
export async function resolveServicesMetadata(
	tx: DbExecutor,
	organizationId: string,
	rawTokens: string[],
): Promise<Map<string, ServiceDescriptor>> {
	const result = new Map<string, ServiceDescriptor>();
	const uniqueTokens = Array.from(new Set(rawTokens.filter(Boolean)));
	if (uniqueTokens.length === 0) return result;

	const uuidTokens = uniqueTokens.filter(isPureUuid);
	const textTokens = uniqueTokens.filter((t) => !isPureUuid(t));

	const orConditions: Array<SQL<unknown>> = [];
	if (uuidTokens.length > 0) {
		orConditions.push(inArray(serviceCatalogItems.id, uuidTokens));
	}
	if (textTokens.length > 0) {
		orConditions.push(
			inArray(serviceCatalogItems.code, textTokens),
			inArray(serviceCatalogItems.order804nCode, textTokens),
			inArray(serviceCatalogItems.title, textTokens),
		);
	}

	const catalogRows = orConditions.length > 0
		? await tx
				.select({
					id: serviceCatalogItems.id,
					code: serviceCatalogItems.code,
					order804nCode: serviceCatalogItems.order804nCode,
					title: serviceCatalogItems.title,
				})
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, organizationId),
						or(...orConditions),
					),
				)
		: [];

	for (const token of uniqueTokens) {
		const isUuid = isPureUuid(token);
		const match = catalogRows.find(
			(c) =>
				(isUuid && c.id === token) ||
				c.code === token ||
				c.order804nCode === token ||
				c.title === token,
		);

		if (match) {
			result.set(token, {
				rawToken: token,
				serviceId: match.id,
				serviceCode: match.code,
				order804nCode: match.order804nCode,
				title: match.title,
			});
		} else {
			result.set(token, {
				rawToken: token,
				serviceId: isUuid ? token : null,
				serviceCode: isUuid ? null : token,
				order804nCode: isUuid ? null : token,
				title: null,
			});
		}
	}

	return result;
}

/**
 * Resolves required materials for a set of services via a robust 4-tier fallback:
 * Tier 1: Active Procedure Tech Cards (procedure_tech_cards + procedure_tech_card_items)
 * Tier 2: Treatment Consumables mapping table (treatment_consumables)
 * Tier 3: Procedure Material Rules (procedure_material_rules)
 * Tier 4: Statutory defaults (CANONICAL_PROCEDURE_RECIPES, DEFAULT_804N_BOM_SEEDS, DEFAULT_804N_CONSUMABLE_LINKS)
 */
export async function resolveRequiredMaterialsForServices(
	tx: DbExecutor,
	organizationId: string,
	services: Array<{ serviceToken: string; quantity: number }>,
	serviceMetadataMap: Map<string, ServiceDescriptor>,
): Promise<RawRequiredMaterial[]> {
	const materials: RawRequiredMaterial[] = [];

	for (const srv of services) {
		const srvQty = srv.quantity > 0 ? srv.quantity : 1;
		const meta = serviceMetadataMap.get(srv.serviceToken) ?? {
			rawToken: srv.serviceToken,
			serviceId: isPureUuid(srv.serviceToken) ? srv.serviceToken : null,
			serviceCode: isPureUuid(srv.serviceToken) ? null : srv.serviceToken,
			order804nCode: isPureUuid(srv.serviceToken) ? null : srv.serviceToken,
			title: null,
		};

		let tierMaterialsFound = false;

		// ─── TIER 1: procedure_tech_cards ────────────────────────────────────
		const techCardConds = [
			eq(procedureTechCards.organizationId, organizationId),
			eq(procedureTechCards.status, "active"),
		];
		const techCardCodeOrIdMatches: Array<SQL<unknown>> = [];
		if (meta.serviceId) techCardCodeOrIdMatches.push(eq(procedureTechCards.serviceId, meta.serviceId));
		if (meta.serviceCode) techCardCodeOrIdMatches.push(eq(procedureTechCards.serviceCode, meta.serviceCode));
		if (meta.order804nCode) techCardCodeOrIdMatches.push(eq(procedureTechCards.serviceCode, meta.order804nCode));
		if (meta.rawToken && meta.rawToken !== meta.serviceCode && meta.rawToken !== meta.order804nCode) {
			techCardCodeOrIdMatches.push(eq(procedureTechCards.serviceCode, meta.rawToken));
		}

		if (techCardCodeOrIdMatches.length > 0) {
			const [techCard] = await tx
				.select({ id: procedureTechCards.id })
				.from(procedureTechCards)
				.where(and(...techCardConds, or(...techCardCodeOrIdMatches)))
				.limit(1);

			if (techCard) {
				const cardItems = await tx
					.select()
					.from(procedureTechCardItems)
					.where(eq(procedureTechCardItems.techCardId, techCard.id));

				if (cardItems.length > 0) {
					tierMaterialsFound = true;
					for (const ci of cardItems) {
						materials.push({
							key: ci.inventoryItemId,
							quantity: Number(ci.quantity) * srvQty,
							unit: ci.unit || "pcs",
							isMdlpRequired: Boolean(ci.isMdlpRequired),
						});
					}
				}
			}
		}

		if (tierMaterialsFound) continue;

		// ─── TIER 2: treatment_consumables ───────────────────────────────────
		const candidateCodes = Array.from(
			new Set([meta.serviceCode, meta.order804nCode, meta.rawToken].filter(Boolean) as string[]),
		);

		if (candidateCodes.length > 0) {
			const tcRows = await tx
				.select()
				.from(treatmentConsumables)
				.where(
					and(
						eq(treatmentConsumables.organizationId, organizationId),
						inArray(treatmentConsumables.catalogItemCode, candidateCodes),
					),
				);

			if (tcRows.length > 0) {
				tierMaterialsFound = true;
				for (const tc of tcRows) {
					materials.push({
						key: tc.inventoryItemId,
						quantity: Number(tc.quantity) * srvQty,
						unit: "pcs",
					});
				}
			}
		}

		if (tierMaterialsFound) continue;

		// ─── TIER 3: procedure_material_rules ────────────────────────────────
		const ruleOrConds: Array<SQL<unknown>> = [];
		if (meta.serviceId) ruleOrConds.push(eq(procedureMaterialRules.serviceId, meta.serviceId));
		if (candidateCodes.length > 0) ruleOrConds.push(inArray(procedureMaterialRules.serviceCode, candidateCodes));

		if (ruleOrConds.length > 0) {
			const rules = await tx
				.select()
				.from(procedureMaterialRules)
				.where(
					and(
						or(
							eq(procedureMaterialRules.organizationId, organizationId),
							isNull(procedureMaterialRules.organizationId),
						),
						or(...ruleOrConds),
					),
				);

			if (rules.length > 0) {
				tierMaterialsFound = true;
				for (const rule of rules) {
					const targetKey = rule.inventoryItemId ?? rule.materialItemId;
					if (!targetKey) continue;
					const ruleQty = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
					materials.push({
						key: targetKey,
						quantity: ruleQty * srvQty,
						unit: rule.unit || "pcs",
						name: rule.materialName ?? undefined,
						isMdlpRequired: Boolean(rule.isMdlpRequired),
					});
				}
			}
		}

		if (tierMaterialsFound) continue;

		// ─── TIER 4: Statutory Defaults & Turnkey Recipes ────────────────────
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
			continue;
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
			continue;
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
	}

	return materials;
}
