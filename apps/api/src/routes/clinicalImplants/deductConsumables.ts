import { and, eq, ilike, or } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { DbExecutor } from "../../services/treatmentConsumables/types.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

export interface DeductedMaterial {
	name: string;
	lotNumber: string | null;
	unitCostRub: number;
	unitCostKopecks: string;
	quantity: number;
	isOverdraft: boolean;
}

export async function deductConsumables(
	tx: DbExecutor,
	orgId: string,
	userId: string | null,
	input: InstallationInput,
) {
	const deductedMaterials: DeductedMaterial[] = [];
	let consumablesCostTotal = 0;

	// 1. Графт
	if (input.boneGraftMaterial || input.boneGraftItemId) {
		const graftName = input.boneGraftMaterial || "Костный графт Geistlich Bio-Oss (0.5г)";
		let graftItem = null;
		if (input.boneGraftItemId) {
			[graftItem] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, input.boneGraftItemId), eq(inventoryItems.organizationId, orgId)))
				.limit(1);
		} else if (input.boneGraftMaterial) {
			const cleanName = input.boneGraftMaterial.trim();
			const [found] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							ilike(inventoryItems.name, `%${cleanName}%`),
							ilike(inventoryItems.name, "%bio-oss%"),
							ilike(inventoryItems.name, "%графт%"),
						),
					),
				)
				.limit(1);
			graftItem = found;
		} else {
			const [found] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							ilike(inventoryItems.name, "%bio-oss%"),
							ilike(inventoryItems.name, "%графт%"),
						),
					),
				)
				.limit(1);
			graftItem = found;
		}

		if (graftItem) {
			const cost = Number(graftItem.unitCostRub || 0);
			const costKopecks = BigInt(Math.round(cost * 100));
			const newStock = Number((Number(graftItem.currentQty || 0) - 1).toFixed(4));
			const isOver = newStock < 0;
			await tx
				.update(inventoryItems)
				.set({
					currentQty: String(newStock),
					stockQuantity: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, graftItem.id),
						eq(inventoryItems.organizationId, orgId),
					),
				);
			await tx.insert(inventoryTransactions).values({
				organizationId: orgId,
				itemId: graftItem.id,
				inventoryItemId: graftItem.id,
				visitId: input.visitId ?? null,
				transactionType: isOver ? "emergency_overdraft" : "auto_deduct",
				isOverdraft: isOver,
				qty: "-1.000",
				quantityChanged: "-1.000",
				unitCostRub: String(cost),
				userId,
				notes: `Списание графта зуба FDI #${input.toothNumberFdi}`,
			});
			deductedMaterials.push({
				name: graftItem.name,
				lotNumber: graftItem.lotNumber,
				unitCostRub: cost,
				unitCostKopecks: costKopecks.toString(),
				quantity: 1,
				isOverdraft: isOver,
			});
			consumablesCostTotal += cost;
		} else {
			deductedMaterials.push({
				name: graftName,
				lotNumber: null,
				unitCostRub: 0,
				unitCostKopecks: "0",
				quantity: 1,
				isOverdraft: true,
			});
		}
	}

	// 2. Мембрана
	if (input.membraneUsed || input.membraneItemId) {
		const memName = input.membraneUsed || "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)";
		let memItem = null;
		if (input.membraneItemId) {
			[memItem] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, input.membraneItemId), eq(inventoryItems.organizationId, orgId)))
				.limit(1);
		} else if (input.membraneUsed) {
			const cleanName = input.membraneUsed.trim();
			const [found] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							ilike(inventoryItems.name, `%${cleanName}%`),
							ilike(inventoryItems.name, "%bio-gide%"),
							ilike(inventoryItems.name, "%мембран%"),
						),
					),
				)
				.limit(1);
			memItem = found;
		} else {
			const [found] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							ilike(inventoryItems.name, "%bio-gide%"),
							ilike(inventoryItems.name, "%мембран%"),
						),
					),
				)
				.limit(1);
			memItem = found;
		}

		if (memItem) {
			const cost = Number(memItem.unitCostRub || 0);
			const costKopecks = BigInt(Math.round(cost * 100));
			const newStock = Number((Number(memItem.currentQty || 0) - 1).toFixed(4));
			const isOver = newStock < 0;
			await tx
				.update(inventoryItems)
				.set({
					currentQty: String(newStock),
					stockQuantity: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, memItem.id),
						eq(inventoryItems.organizationId, orgId),
					),
				);
			await tx.insert(inventoryTransactions).values({
				organizationId: orgId,
				itemId: memItem.id,
				inventoryItemId: memItem.id,
				visitId: input.visitId ?? null,
				transactionType: isOver ? "emergency_overdraft" : "auto_deduct",
				isOverdraft: isOver,
				qty: "-1.000",
				quantityChanged: "-1.000",
				unitCostRub: String(cost),
				userId,
				notes: `Списание мембраны зуба FDI #${input.toothNumberFdi}`,
			});
			deductedMaterials.push({
				name: memItem.name,
				lotNumber: memItem.lotNumber,
				unitCostRub: cost,
				unitCostKopecks: costKopecks.toString(),
				quantity: 1,
				isOverdraft: isOver,
			});
			consumablesCostTotal += cost;
		} else {
			deductedMaterials.push({
				name: memName,
				lotNumber: null,
				unitCostRub: 0,
				unitCostKopecks: "0",
				quantity: 1,
				isOverdraft: true,
			});
		}
	}

	// 3. Шовный материал (только если врач указал шовный материал или выбран айтем)
	if (input.sutureMaterial || input.sutureItemId) {
		const sutureName = input.sutureMaterial || "Шовный материал Ethicon Викрил 4-0";
		let sutureItem = null;
		if (input.sutureItemId) {
			[sutureItem] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, input.sutureItemId),
						eq(inventoryItems.organizationId, orgId),
					),
				)
				.limit(1);
		} else if (input.sutureMaterial) {
			const cleanName = input.sutureMaterial.trim();
			const [found] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							ilike(inventoryItems.name, `%${cleanName}%`),
							ilike(inventoryItems.name, "%викрил%"),
							ilike(inventoryItems.name, "%vicryl%"),
							ilike(inventoryItems.name, "%шовн%"),
						),
					),
				)
				.limit(1);
			sutureItem = found;
		} else {
			const [found] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							ilike(inventoryItems.name, "%викрил%"),
							ilike(inventoryItems.name, "%vicryl%"),
							ilike(inventoryItems.name, "%шовн%"),
						),
					),
				)
				.limit(1);
			sutureItem = found;
		}

		if (sutureItem) {
			const cost = Number(sutureItem.unitCostRub || 0);
			const costKopecks = BigInt(Math.round(cost * 100));
			const newStock = Number((Number(sutureItem.currentQty || 0) - 1).toFixed(4));
			const isOver = newStock < 0;
			await tx
				.update(inventoryItems)
				.set({
					currentQty: String(newStock),
					stockQuantity: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, sutureItem.id),
						eq(inventoryItems.organizationId, orgId),
					),
				);
			await tx.insert(inventoryTransactions).values({
				organizationId: orgId,
				itemId: sutureItem.id,
				inventoryItemId: sutureItem.id,
				visitId: input.visitId ?? null,
				transactionType: isOver ? "emergency_overdraft" : "auto_deduct",
				isOverdraft: isOver,
				qty: "-1.000",
				quantityChanged: "-1.000",
				unitCostRub: String(cost),
				userId,
				notes: `Списание швов зуба FDI #${input.toothNumberFdi}`,
			});
			deductedMaterials.push({
				name: sutureItem.name,
				lotNumber: sutureItem.lotNumber,
				unitCostRub: cost,
				unitCostKopecks: costKopecks.toString(),
				quantity: 1,
				isOverdraft: isOver,
			});
			consumablesCostTotal += cost;
		} else {
			deductedMaterials.push({
				name: sutureName,
				lotNumber: null,
				unitCostRub: 0,
				unitCostKopecks: "0",
				quantity: 1,
				isOverdraft: true,
			});
		}
	}

	const consumablesCostTotalKopecks = BigInt(Math.round(consumablesCostTotal * 100));
	return {
		deductedMaterials,
		consumablesCostTotal,
		consumablesCostTotalKopecks: consumablesCostTotalKopecks.toString(),
	};
}
