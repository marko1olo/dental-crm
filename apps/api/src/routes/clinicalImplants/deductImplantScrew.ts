import { and, eq, ilike } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { DbExecutor } from "../../services/treatmentConsumables/types.js";
import { CANONICAL_IMPLANT_WAREHOUSE_SEEDS } from "./implantWarehouseSeeds.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

const BRAND_SYNONYMS: Record<string, readonly string[]> = {
	nobel_biocare: ["nobel biocare", "nobel", "nobelactive", "parallel cc", "replace select", "nobelparallel"],
	straumann: ["straumann", "blx", "roxolid", "slactive", "bone level"],
	astra_tech: ["astra tech", "astra", "osseospeed", "tx profile", "astratech"],
	osstem: ["osstem", "tsiii", "ts iii", "ts-iii", "osstem implant", "hiossen"],
	dentium: ["dentium", "superline", "simpleline", "implantium"],
	anyridge: ["anyridge", "megagen", "anyone"],
	megagen: ["megagen", "anyridge", "anyone"],
	neodent: ["neodent", "grand morse", "helix"],
	ankylos: ["ankylos", "tissuecare", "dentsply"],
	hiossen: ["hiossen", "etiii", "osstem"],
	mis: ["mis", "c1", "v3", "seven"],
	bicon: ["bicon", "short implant"],
	alpha_bio: ["alpha bio", "alpha-bio", "spi", "ice", "neobiotech"],
};

export function matchesImplantBrand(itemName: string, inputBrand: string): boolean {
	const lowerItem = itemName.toLowerCase();
	const cleanItem = lowerItem.replace(/[\s_-]+/g, "");
	const normBrandKey = inputBrand.toLowerCase().trim().replace(/[\s-]+/g, "_");
	const cleanInputBrand = normBrandKey.replace(/[\s_-]+/g, "");

	if (cleanItem.includes(cleanInputBrand) || lowerItem.includes(inputBrand.toLowerCase())) {
		return true;
	}

	const synonyms = BRAND_SYNONYMS[normBrandKey] ?? [];
	for (const syn of synonyms) {
		const cleanSyn = syn.replace(/[\s_-]+/g, "");
		if (lowerItem.includes(syn) || cleanItem.includes(cleanSyn)) {
			return true;
		}
	}
	return false;
}

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
		// Поиск в существующей номенклатуре организации по бренду и размерам
		const orgItems = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, orgId),
					eq(inventoryItems.category, "Имплантология"),
				),
			)
			.for("update");

		const foundInOrg = orgItems.find((item) => {
			const brandMatch = matchesImplantBrand(item.name, input.implantBrand);
			const lowerName = item.name.toLowerCase();
			const diamMatch = lowerName.includes(String(input.implantDiameterMm));
			const lenMatch = lowerName.includes(String(input.implantLengthMm));
			return brandMatch && (diamMatch || lenMatch);
		});

		if (foundInOrg) {
			invItem = foundInOrg;
		}
	}

	if (!invItem) {
		const matchingSeed =
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => {
				const brandMatch = matchesImplantBrand(s.name, input.implantBrand);
				const lowerName = s.name.toLowerCase();
				const diamMatch = lowerName.includes(String(input.implantDiameterMm));
				const lenMatch = lowerName.includes(String(input.implantLengthMm));
				return brandMatch && (diamMatch || lenMatch);
			}) ||
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => matchesImplantBrand(s.name, input.implantBrand)) ||
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => s.category === "Имплантология");

		const defaultCostRub = matchingSeed?.unitCostRub ?? "0.00";
		const defaultLot = input.lotNumber || matchingSeed?.lotNumber || "";
		const defaultExp = input.expirationDate || matchingSeed?.expirationDate || null;
		const defaultSku = matchingSeed && "sku" in matchingSeed ? (matchingSeed.sku as string) : null;
		const defaultBarcode = matchingSeed && "barcode" in matchingSeed ? (matchingSeed.barcode as string) : null;

		const [created] = await tx
			.insert(inventoryItems)
			.values({
				organizationId: orgId,
				name: matchingSeed
					? matchingSeed.name
					: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм`,
				category: "Имплантология",
				unit: "шт.",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "2",
				unitCostRub: defaultCostRub,
				pricePerUnit: defaultCostRub,
				sku: defaultSku,
				barcode: defaultBarcode,
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
