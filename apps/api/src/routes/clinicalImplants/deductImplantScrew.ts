import { and, eq } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { DbExecutor } from "../../services/treatmentConsumables/types.js";
import { CANONICAL_IMPLANT_WAREHOUSE_SEEDS } from "./implantWarehouseSeeds.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

export async function deductImplantScrew(
	tx: DbExecutor,
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
		const matchingSeed =
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => {
				const lowerName = s.name.toLowerCase();
				const brandMatch = lowerName.includes(input.implantBrand.toLowerCase());
				const diamMatch = lowerName.includes(String(input.implantDiameterMm));
				const lenMatch = lowerName.includes(String(input.implantLengthMm));
				return brandMatch && (diamMatch || lenMatch);
			}) ||
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => s.category === "Имплантология");

		const defaultCostRub = matchingSeed?.unitCostRub ?? "0.00";
		const defaultLot = input.lotNumber || matchingSeed?.lotNumber || "";
		const defaultExp = input.expirationDate || matchingSeed?.expirationDate || null;

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
				unitCostRub: defaultCostRub,
				pricePerUnit: defaultCostRub,
				lotNumber: defaultLot,
				expirationDate: defaultExp,
			})
			.returning();
		if (!created) {
			throw new Error("INVENTORY_INSERT_FAILED: Не удалось создать номенклатурную карточку имплантата.");
		}
		invItem = created;
	}

	const effectiveLotNumber = input.lotNumber || invItem.lotNumber || "";
	const effectiveSerialNumber = input.serialNumber || (invItem.barcode && invItem.barcode.includes("SN-") ? invItem.barcode.split("SN-")[1] : "") || "";
	const currentStock = Number(invItem.currentQty ?? invItem.stockQuantity ?? 0);
	const newStock = Number((currentStock - 1).toFixed(4));
	const isOverdraft = newStock < 0;
	const implantUnitCostRub = Number(invItem.unitCostRub ?? invItem.pricePerUnit ?? 0);
	const implantUnitCostKopecks = BigInt(Math.round(implantUnitCostRub * 100));

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
		implantUnitCostKopecks: implantUnitCostKopecks.toString(),
		effectiveLotNumber,
		effectiveSerialNumber,
	};
}
