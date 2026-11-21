import { and, eq, ilike, or } from "drizzle-orm";
import { type createImplantInstallationSchema, rublesToKopecks } from "@dental/shared";
import type { z } from "zod";
import { inventoryItems } from "../../db/schema.js";
import type { DbExecutor } from "../../services/treatmentConsumables/types.js";
import { fefoStockService } from "../../services/inventory/fefoStockService.js";
import { CANONICAL_BIOMATERIAL_SEEDS } from "./implantBiomaterialSeeds.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

export interface DeductedMaterial {
	name: string;
	lotNumber: string | null;
	unitCostRub: number;
	unitCostKopecks: string;
	quantity: number;
	isOverdraft: boolean;
}

interface DeductConsumableItemParams {
	targetItemId?: string | null | undefined;
	materialName: string;
	fallbackKeywords: readonly string[];
	category: string;
	toothNumberFdi: number;
	visitId?: string | null | undefined;
	notesPrefix: string;
}

async function deductSingleConsumable(
	tx: DbExecutor,
	orgId: string,
	userId: string | null,
	params: DeductConsumableItemParams,
): Promise<DeductedMaterial | null> {
	let item: typeof inventoryItems.$inferSelect | undefined = undefined;

	if (params.targetItemId) {
		const [foundById] = await tx
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, params.targetItemId), eq(inventoryItems.organizationId, orgId)))
			.limit(1);
		item = foundById;
	}

	if (!item) {
		const cleanName = params.materialName.trim();
		const nameFilters = [
			ilike(inventoryItems.name, `%${cleanName}%`),
			...params.fallbackKeywords.map((kw) => ilike(inventoryItems.name, `%${kw}%`)),
		];
		const [foundByName] = await tx
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.organizationId, orgId), or(...nameFilters)))
			.limit(1);
		item = foundByName;
	}

	if (!item) {
		// Автосоздание номенклатурной карточки в организации (Мандаты 8e, 8n, 8v)
		const matchedSeed = CANONICAL_BIOMATERIAL_SEEDS.find((s) => {
			const lowerSeed = s.name.toLowerCase();
			return (
				lowerSeed.includes(params.materialName.toLowerCase()) ||
				params.fallbackKeywords.some((kw) => lowerSeed.includes(kw.toLowerCase()))
			);
		});

		const defaultName = matchedSeed?.name ?? params.materialName;
		const defaultCostRub = matchedSeed?.unitCostRub ?? "0.00";
		const defaultUnit = matchedSeed?.unit ?? "шт.";
		const defaultSku = matchedSeed?.sku ?? null;
		const defaultBarcode = matchedSeed?.barcode ?? null;
		const defaultLot = matchedSeed?.lotNumber ?? "";
		const defaultExp = matchedSeed?.expirationDate ?? null;

		const [created] = await tx
			.insert(inventoryItems)
			.values({
				organizationId: orgId,
				name: defaultName,
				category: params.category,
				unit: defaultUnit,
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
			throw new Error(`INVENTORY_INSERT_FAILED: Не удалось создать номенклатурную карточку материала «${params.materialName}».`);
		}
		item = created;
	}

	// Списание через канонический сервис FEFO с партионным учетом и мягким овердрафтом
	const fefoResult = await fefoStockService.deductFefo(tx, {
		organizationId: orgId,
		inventoryItemId: item.id,
		requiredQty: 1,
		visitId: params.visitId ?? null,
		userId,
		allowOverdraft: true,
		transactionType: "treatment_consumable",
		notes: `${params.notesPrefix} зуба FDI #${params.toothNumberFdi}`,
	});

	const cost = Number(item.unitCostRub || item.pricePerUnit || 0);
	const costKopecks = BigInt(rublesToKopecks(cost));
	const lotNumber = fefoResult.batchesUsed[0]?.batchNumber ?? item.lotNumber ?? null;

	return {
		name: item.name,
		lotNumber,
		unitCostRub: cost,
		unitCostKopecks: costKopecks.toString(),
		quantity: 1,
		isOverdraft: fefoResult.isOverdraft,
	};
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
		const result = await deductSingleConsumable(tx, orgId, userId, {
			targetItemId: input.boneGraftItemId,
			materialName: graftName,
			fallbackKeywords: ["bio-oss", "графт", "костн"],
			category: "Хирургия",
			toothNumberFdi: input.toothNumberFdi,
			visitId: input.visitId ?? null,
			notesPrefix: "Списание графта",
		});
		if (result) {
			deductedMaterials.push(result);
			consumablesCostTotal += result.unitCostRub;
		}
	}

	// 2. Мембрана
	if (input.membraneUsed || input.membraneItemId) {
		const memName = input.membraneUsed || "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)";
		const result = await deductSingleConsumable(tx, orgId, userId, {
			targetItemId: input.membraneItemId,
			materialName: memName,
			fallbackKeywords: ["bio-gide", "мембран"],
			category: "Хирургия",
			toothNumberFdi: input.toothNumberFdi,
			visitId: input.visitId ?? null,
			notesPrefix: "Списание мембраны",
		});
		if (result) {
			deductedMaterials.push(result);
			consumablesCostTotal += result.unitCostRub;
		}
	}

	// 3. Шовный материал (только если врач указал шовный материал или выбран айтем)
	if (input.sutureMaterial || input.sutureItemId) {
		const sutureName = input.sutureMaterial || "Шовный материал Ethicon Викрил 4-0";
		const result = await deductSingleConsumable(tx, orgId, userId, {
			targetItemId: input.sutureItemId,
			materialName: sutureName,
			fallbackKeywords: ["викрил", "vicryl", "шовн"],
			category: "Расходные материалы",
			toothNumberFdi: input.toothNumberFdi,
			visitId: input.visitId ?? null,
			notesPrefix: "Списание швов",
		});
		if (result) {
			deductedMaterials.push(result);
			consumablesCostTotal += result.unitCostRub;
		}
	}

	const consumablesCostTotalKopecks = BigInt(rublesToKopecks(consumablesCostTotal));
	return {
		deductedMaterials,
		consumablesCostTotal,
		consumablesCostTotalKopecks: consumablesCostTotalKopecks.toString(),
	};
}
