import { and, eq, ilike, or } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

export async function deductImplantScrew(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tx: any,
	orgId: string,
	userId: string | null,
	input: InstallationInput,
) {
	const targetItemId = input.inventoryItemId || input.catalogItemId;
	let invItem = targetItemId
		? (
				await tx
					.select()
					.from(inventoryItems)
					.where(and(eq(inventoryItems.id, targetItemId), eq(inventoryItems.organizationId, orgId)))
					.for("update")
					.limit(1)
			)[0]
		: null;

	if (!invItem) {
		const brandRegex = `%${input.implantBrand}%`;
		const sizeRegex = `%${input.implantDiameterMm}%`;
		const matching = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, orgId),
					or(ilike(inventoryItems.name, brandRegex), ilike(inventoryItems.name, sizeRegex)),
				),
			)
			.limit(1);
		if (matching[0]) invItem = matching[0];
	}

	if (!invItem) {
		const [created] = await tx
			.insert(inventoryItems)
			.values({
				organizationId: orgId,
				name: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм`,
				category: "Имплантология",
				unit: "шт.",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "2",
				unitCostRub: "12500.00",
				pricePerUnit: "12500.00",
				lotNumber: input.lotNumber ?? "LOT-AUTO",
				expirationDate: input.expirationDate ?? "2028-12-31",
			})
			.returning();
		invItem = created!;
	}

	const effectiveLotNumber = input.lotNumber || invItem.lotNumber || "LOT-REAL-STOCK";
	const effectiveSerialNumber = input.serialNumber || `SN-${invItem.id.slice(0, 8).toUpperCase()}`;
	const currentStock = Number(invItem.currentQty ?? invItem.stockQuantity ?? 0);
	const newStock = Number((currentStock - 1).toFixed(4));
	const isOverdraft = newStock < 0;
	const implantUnitCostRub = Number(invItem.unitCostRub ?? invItem.pricePerUnit ?? 12500);

	await tx
		.update(inventoryItems)
		.set({ currentQty: String(newStock), stockQuantity: String(newStock), updatedAt: new Date() })
		.where(and(eq(inventoryItems.id, invItem.id), eq(inventoryItems.organizationId, orgId)));

	const [implantTx] = await tx
		.insert(inventoryTransactions)
		.values({
			organizationId: orgId,
			itemId: invItem.id,
			inventoryItemId: invItem.id,
			visitId: input.visitId ?? null,
			transactionType: isOverdraft ? "emergency_overdraft" : "auto_deduct",
			isOverdraft,
			qty: "-1.000",
			quantityChanged: "-1.000",
			unitCostRub: String(implantUnitCostRub),
			userId,
			notes: isOverdraft
				? `Мягкий овердрафт: имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (LOT: ${effectiveLotNumber}) зуба FDI #${input.toothNumberFdi}`
				: `Списание со склада: имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (LOT: ${effectiveLotNumber}) зуба FDI #${input.toothNumberFdi}`,
		})
		.returning({ id: inventoryTransactions.id });

	return {
		invItem,
		implantTx,
		currentStock,
		newStock,
		isOverdraft,
		implantUnitCostRub,
		effectiveLotNumber,
		effectiveSerialNumber,
	};
}
