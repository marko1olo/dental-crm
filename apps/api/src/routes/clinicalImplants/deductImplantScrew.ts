import { and, desc, eq } from "drizzle-orm";
import { type createImplantInstallationSchema, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import { fefoStockService } from "../../services/inventory/fefoStockService.js";
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

function resolveImplantCostKopecks(invItem: {
	unitCostKopecks?: bigint | null;
	pricePerUnitKopecks?: bigint | null;
	unitCostRub?: string | null;
	pricePerUnit?: string | null;
}): bigint {
	const legacyRub = Number(invItem.unitCostRub ?? invItem.pricePerUnit ?? 0);
	const legacyKopecks = BigInt(rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : 0));
	if (typeof invItem.unitCostKopecks === "bigint" && (invItem.unitCostKopecks > 0n || legacyKopecks === 0n)) {
		return invItem.unitCostKopecks;
	}
	if (typeof invItem.pricePerUnitKopecks === "bigint" && (invItem.pricePerUnitKopecks > 0n || legacyKopecks === 0n)) {
		return invItem.pricePerUnitKopecks;
	}
	return legacyKopecks;
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
		const exactBrandSeed =
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => {
				const brandMatch = matchesImplantBrand(s.name, input.implantBrand);
				const lowerName = s.name.toLowerCase();
				const diamMatch = lowerName.includes(String(input.implantDiameterMm));
				const lenMatch = lowerName.includes(String(input.implantLengthMm));
				return brandMatch && (diamMatch || lenMatch);
			}) ||
			CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => matchesImplantBrand(s.name, input.implantBrand));

		const fallbackSeed = CANONICAL_IMPLANT_WAREHOUSE_SEEDS.find((s) => s.category === "Имплантология");
		const fallbackName = `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм`;
		const itemName = exactBrandSeed ? exactBrandSeed.name : fallbackName;

		const defaultCostRub = exactBrandSeed?.unitCostRub ?? fallbackSeed?.unitCostRub ?? "0.00";
		const defaultCostKopecks = BigInt(rublesToKopecks(Number(defaultCostRub)));
		const defaultLot = input.lotNumber || exactBrandSeed?.lotNumber || "";
		const defaultExp = input.expirationDate || exactBrandSeed?.expirationDate || null;
		const defaultSku = exactBrandSeed && "sku" in exactBrandSeed ? (exactBrandSeed.sku as string) : null;
		const defaultBarcode = exactBrandSeed && "barcode" in exactBrandSeed ? (exactBrandSeed.barcode as string) : null;

		const [created] = await tx
			.insert(inventoryItems)
			.values({
				organizationId: orgId,
				name: itemName,
				category: "Имплантология",
				unit: "шт.",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "2",
				unitCostRub: defaultCostRub,
				pricePerUnit: defaultCostRub,
				unitCostKopecks: defaultCostKopecks,
				pricePerUnitKopecks: defaultCostKopecks,
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

	const initialLotNumber = input.lotNumber || invItem.lotNumber || "";
	const effectiveSerialNumber =
		input.serialNumber ||
		(invItem.barcode && invItem.barcode.includes("SN-") ? invItem.barcode.split("SN-")[1] : "") ||
		"";
	const currentStock = Number(invItem.currentQty ?? invItem.stockQuantity ?? 0);
	const newStock = Number((currentStock - 1).toFixed(4));
	const implantUnitCostKopecks = resolveImplantCostKopecks(invItem);
	const implantUnitCostRub = kopecksToRubles(implantUnitCostKopecks);

	const fefoResult = await fefoStockService.deductFefo(tx, {
		organizationId: orgId,
		inventoryItemId: invItem.id,
		requiredQty: 1,
		visitId: input.visitId ?? null,
		userId,
		allowOverdraft: true,
		transactionType: "auto_deduct",
		notes: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (LOT: ${initialLotNumber}) зуба FDI #${input.toothNumberFdi}`,
	});

	const effectiveLotNumber = fefoResult.batchesUsed[0]?.batchNumber || initialLotNumber;

	const [implantTx] = await tx
		.select({ id: inventoryTransactions.id })
		.from(inventoryTransactions)
		.where(
			and(
				eq(inventoryTransactions.organizationId, orgId),
				eq(inventoryTransactions.inventoryItemId, invItem.id),
			),
		)
		.orderBy(desc(inventoryTransactions.createdAt))
		.limit(1);

	return {
		invItem,
		implantTx,
		currentStock,
		newStock,
		isOverdraft: fefoResult.isOverdraft,
		implantUnitCostRub,
		implantUnitCostKopecks: implantUnitCostKopecks.toString(),
		implantUnitCostKopecksBigInt: implantUnitCostKopecks,
		effectiveLotNumber,
		effectiveSerialNumber,
	};
}
