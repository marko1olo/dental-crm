import { and, eq, ilike, or } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { formatKopecksToRubles, rublesToKopecks, toExactKopecks } from "@dental/shared";
import { withSavepoint, withTenantWriteCtx, type TenantDb } from "../../db/rls.js";
import { inventoryItems } from "../../db/schema.js";
import { fefoStockService } from "../../services/inventory/fefoStockService.js";
import type { OrthoMaterialDeductionResult } from "./types.js";

export interface DeductOrthoMaterialParams {
	organizationId: string;
	patientId: string;
	itemNamePattern: string;
	defaultItemName: string;
	category: string;
	quantity: number;
	unit: string;
	notes: string;
	/** Стоимость единицы в копейках (DEF-ORTHO-06: Мандат целочисленных копеек BIGINT) */
	unitCostKopecks?: bigint | number | undefined;
	/** Обратная совместимость с рублями */
	unitCostRub?: number | undefined;
	visitId?: string | null | undefined;
	userId?: string | null | undefined;
	logger?: FastifyBaseLogger | undefined;
	tx?: TenantDb | undefined;
}

function resolveOrthoItemUnitCostKopecks(item: {
	unitCostKopecks?: bigint | null;
	pricePerUnitKopecks?: bigint | null;
	unitCostRub?: string | number | null;
}): bigint {
	const legacyRub = Number(item.unitCostRub ?? 0);
	const legacyKopecks = BigInt(rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : 0));
	if (typeof item.unitCostKopecks === "bigint" && (item.unitCostKopecks > 0n || legacyKopecks === 0n)) {
		return item.unitCostKopecks;
	}
	if (typeof item.pricePerUnitKopecks === "bigint" && (item.pricePerUnitKopecks > 0n || legacyKopecks === 0n)) {
		return item.pricePerUnitKopecks;
	}
	return legacyKopecks;
}

export async function deductOrthoMaterialSafely(params: DeductOrthoMaterialParams): Promise<OrthoMaterialDeductionResult> {
	const {
		organizationId,
		patientId,
		itemNamePattern,
		defaultItemName,
		category,
		quantity,
		unit,
		notes,
		unitCostKopecks,
		unitCostRub,
		visitId = null,
		userId = null,
	} = params;

	const explicitKopecks: bigint | null =
		unitCostKopecks !== undefined
			? BigInt(unitCostKopecks)
			: unitCostRub !== undefined
				? BigInt(rublesToKopecks(unitCostRub))
				: null;

	try {
		const runWithTx = async (tx: TenantDb): Promise<OrthoMaterialDeductionResult> => {
			const trimmedPattern = itemNamePattern.trim();
			const nameFilters = [
				...(trimmedPattern.length > 0 ? [ilike(inventoryItems.name, `%${trimmedPattern}%`)] : []),
				...(defaultItemName.trim().length > 0 ? [ilike(inventoryItems.name, `%${defaultItemName.trim()}%`)] : []),
			];

			const found =
				nameFilters.length > 0
					? await tx
							.select()
							.from(inventoryItems)
							.where(and(eq(inventoryItems.organizationId, organizationId), or(...nameFilters)))
							.orderBy(inventoryItems.id)
							.limit(1)
							.for("update")
					: [];
			let targetItem = found[0];

			const effectiveKopecks: bigint =
				explicitKopecks !== null
					? explicitKopecks
					: targetItem
						? resolveOrthoItemUnitCostKopecks(targetItem)
						: 0n;
			const safeCostKopecks = toExactKopecks(effectiveKopecks);
			const costRubFormatted = formatKopecksToRubles(safeCostKopecks);

			if (!targetItem) {
				const [created] = await tx
					.insert(inventoryItems)
					.values({
						organizationId,
						name: defaultItemName,
						category,
						unit,
						unitCostRub: costRubFormatted,
						pricePerUnit: costRubFormatted,
						unitCostKopecks: effectiveKopecks,
						pricePerUnitKopecks: effectiveKopecks,
						stockQuantity: "0",
						currentQty: "0",
						criticalThreshold: "5",
					})
					.returning();
				targetItem = created;
			}
			if (!targetItem) return { success: false, isOverdraft: false, deductedQty: 0 };

			const currentStock = Number(targetItem.stockQuantity ?? targetItem.currentQty ?? 0);
			const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
			const newStock = Number((baseStock - quantity).toFixed(4));

			const fefoRes = await fefoStockService.deductFefo(tx, {
				organizationId,
				inventoryItemId: targetItem.id,
				requiredQty: quantity,
				visitId,
				userId,
				allowOverdraft: true,
				transactionType: "auto_deduct",
				notes: `${notes} (пациент ${patientId})`,
			});

			return {
				success: true,
				itemId: targetItem.id,
				itemName: targetItem.name,
				deductedQty: quantity,
				remainingStock: newStock,
				isOverdraft: fefoRes.isOverdraft,
				unitCostKopecks: safeCostKopecks,
			};
		};

		return params.tx
			? await withSavepoint(params.tx, runWithTx)
			: await withTenantWriteCtx(organizationId, runWithTx);
	} catch (err) {
		params.logger?.warn(
			{ err, organizationId, patientId, itemNamePattern },
			"[Orthodontics] Soft overdraft deduction failed gracefully",
		);
		return { success: false, isOverdraft: false, deductedQty: 0, error: String(err) };
	}
}
