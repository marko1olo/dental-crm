import { and, eq, ilike, or } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

export interface DeductedMaterial {
	name: string;
	lotNumber: string | null;
	unitCostRub: number;
	quantity: number;
	isOverdraft: boolean;
}

export async function deductConsumables(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tx: any,
	orgId: string,
	userId: string | null,
	input: InstallationInput,
) {
	const deductedMaterials: DeductedMaterial[] = [];
	let consumablesCostTotal = 0;

	// 1. Графт
	if (input.boneGraftMaterial || input.boneGraftItemId) {
		const graftName = input.boneGraftMaterial || "Костный графт Geistlich Bio-Oss (0.5г)";
		let [graftItem] = input.boneGraftItemId
			? await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, input.boneGraftItemId), eq(inventoryItems.organizationId, orgId))).limit(1)
			: await tx.select().from(inventoryItems).where(and(eq(inventoryItems.organizationId, orgId), ilike(inventoryItems.name, "%bio-oss%"))).limit(1);

		if (!graftItem) {
			const [created] = await tx.insert(inventoryItems).values({
				organizationId: orgId, name: graftName, category: "Хирургия", unit: "упак.", stockQuantity: "0", currentQty: "0", unitCostRub: "8200.00", lotNumber: "BO-8921", expirationDate: "2028-06-30",
			}).returning();
			graftItem = created!;
		}
		const cost = Number(graftItem.unitCostRub || 8200);
		const newStock = Number((Number(graftItem.currentQty || 0) - 1).toFixed(4));
		const isOver = newStock < 0;
		await tx.update(inventoryItems).set({ currentQty: String(newStock), stockQuantity: String(newStock) }).where(eq(inventoryItems.id, graftItem.id));
		await tx.insert(inventoryTransactions).values({
			organizationId: orgId, itemId: graftItem.id, inventoryItemId: graftItem.id, visitId: input.visitId ?? null, transactionType: isOver ? "emergency_overdraft" : "auto_deduct", isOverdraft: isOver, qty: "-1.000", quantityChanged: "-1.000", unitCostRub: String(cost), userId, notes: `Списание графта зуба FDI #${input.toothNumberFdi}`,
		});
		deductedMaterials.push({ name: graftItem.name, lotNumber: graftItem.lotNumber, unitCostRub: cost, quantity: 1, isOverdraft: isOver });
		consumablesCostTotal += cost;
	}

	// 2. Мембрана
	if (input.membraneUsed || input.membraneItemId) {
		const memName = input.membraneUsed || "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)";
		let [memItem] = input.membraneItemId
			? await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, input.membraneItemId), eq(inventoryItems.organizationId, orgId))).limit(1)
			: await tx.select().from(inventoryItems).where(and(eq(inventoryItems.organizationId, orgId), ilike(inventoryItems.name, "%bio-gide%"))).limit(1);

		if (!memItem) {
			const [created] = await tx.insert(inventoryItems).values({
				organizationId: orgId, name: memName, category: "Хирургия", unit: "упак.", stockQuantity: "0", currentQty: "0", unitCostRub: "9800.00", lotNumber: "BG-3310", expirationDate: "2028-08-31",
			}).returning();
			memItem = created!;
		}
		const cost = Number(memItem.unitCostRub || 9800);
		const newStock = Number((Number(memItem.currentQty || 0) - 1).toFixed(4));
		const isOver = newStock < 0;
		await tx.update(inventoryItems).set({ currentQty: String(newStock), stockQuantity: String(newStock) }).where(eq(inventoryItems.id, memItem.id));
		await tx.insert(inventoryTransactions).values({
			organizationId: orgId, itemId: memItem.id, inventoryItemId: memItem.id, visitId: input.visitId ?? null, transactionType: isOver ? "emergency_overdraft" : "auto_deduct", isOverdraft: isOver, qty: "-1.000", quantityChanged: "-1.000", unitCostRub: String(cost), userId, notes: `Списание мембраны зуба FDI #${input.toothNumberFdi}`,
		});
		deductedMaterials.push({ name: memItem.name, lotNumber: memItem.lotNumber, unitCostRub: cost, quantity: 1, isOverdraft: isOver });
		consumablesCostTotal += cost;
	}

	// 3. Шовный материал
	const sutureName = input.sutureMaterial || "Шовный материал Ethicon Викрил 4-0";
	let [sutureItem] = input.sutureItemId
		? await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, input.sutureItemId), eq(inventoryItems.organizationId, orgId))).limit(1)
		: await tx.select().from(inventoryItems).where(and(eq(inventoryItems.organizationId, orgId), or(ilike(inventoryItems.name, "%викрил%"), ilike(inventoryItems.name, "%vicryl%")))).limit(1);

	if (!sutureItem) {
		const [created] = await tx.insert(inventoryItems).values({
			organizationId: orgId, name: sutureName, category: "Расходные материалы", unit: "шт.", stockQuantity: "20", currentQty: "20", unitCostRub: "650.00", lotNumber: "VK-2026", expirationDate: "2027-12-31",
		}).returning();
		sutureItem = created!;
	}
	const cost = Number(sutureItem.unitCostRub || 650);
	const newStock = Number((Number(sutureItem.currentQty || 0) - 1).toFixed(4));
	const isOver = newStock < 0;
	await tx.update(inventoryItems).set({ currentQty: String(newStock), stockQuantity: String(newStock) }).where(eq(inventoryItems.id, sutureItem.id));
	await tx.insert(inventoryTransactions).values({
		organizationId: orgId, itemId: sutureItem.id, inventoryItemId: sutureItem.id, visitId: input.visitId ?? null, transactionType: isOver ? "emergency_overdraft" : "auto_deduct", isOverdraft: isOver, qty: "-1.000", quantityChanged: "-1.000", unitCostRub: String(cost), userId, notes: `Списание швов зуба FDI #${input.toothNumberFdi}`,
	});
	deductedMaterials.push({ name: sutureItem.name, lotNumber: sutureItem.lotNumber, unitCostRub: cost, quantity: 1, isOverdraft: isOver });
	consumablesCostTotal += cost;

	return { deductedMaterials, consumablesCostTotal };
}
