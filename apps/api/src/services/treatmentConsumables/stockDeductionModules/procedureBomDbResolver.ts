/**
 * procedureBomDbResolver.ts — Tiers 1-3 BOM resolution (Tech cards, Consumables map, Material rules).
 */

import { and, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import {
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
	treatmentConsumables,
} from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import type { RawRequiredMaterial, ServiceDescriptor } from "./stockDeductionTypes.js";

export async function resolveDbBomRulesForService(
	tx: DbExecutor,
	organizationId: string,
	meta: ServiceDescriptor,
	srvQty: number,
): Promise<RawRequiredMaterial[] | null> {
	// Tier 1: procedure_tech_cards
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
			.where(and(eq(procedureTechCards.organizationId, organizationId), eq(procedureTechCards.status, "active"), or(...techCardCodeOrIdMatches)))
			.limit(1);

		if (techCard) {
			const cardItems = await tx
				.select()
				.from(procedureTechCardItems)
				.where(eq(procedureTechCardItems.techCardId, techCard.id));

			if (cardItems.length > 0) {
				return cardItems.map((ci) => ({
					key: ci.inventoryItemId,
					quantity: Number(ci.quantity) * srvQty,
					unit: ci.unit || "pcs",
					isMdlpRequired: Boolean(ci.isMdlpRequired),
				}));
			}
		}
	}

	// Tier 2: treatment_consumables
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
			return tcRows.map((tc) => ({
				key: tc.inventoryItemId,
				quantity: Number(tc.quantity) * srvQty,
				unit: "pcs",
			}));
		}
	}

	// Tier 3: procedure_material_rules
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
			const materials: RawRequiredMaterial[] = [];
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
			return materials;
		}
	}

	return null;
}
