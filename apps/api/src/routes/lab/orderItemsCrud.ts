import { and, eq } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import { labItems, labOrders } from "../../db/schema.js";
import { kopecksToNumericString, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type { z } from "zod";
import type { createLabItemSchema, updateLabItemSchema } from "./types.js";

export type CreateLabItemInput = z.infer<typeof createLabItemSchema>;
export type UpdateLabItemInput = z.infer<typeof updateLabItemSchema>;

/**
 * Синхронизация себестоимости и формулы зубов родительского наряда ЗТЛ в единой транзакции (Мандат 8bo / SEV-1).
 * Зарплатный модуль читает себестоимость из lab_orders.labCostKopecks.
 */
export async function recalculateLabOrderFromItemsTx(
	tx: TenantDb,
	orgId: string,
	labOrderId: string,
) {
	const [order] = await tx
		.select({
			id: labOrders.id,
			isWarranty: labOrders.isWarranty,
			warrantyLiabilityType: labOrders.warrantyLiabilityType,
		})
		.from(labOrders)
		.where(and(eq(labOrders.id, labOrderId), eq(labOrders.organizationId, orgId)))
		.limit(1);

	if (!order) return null;

	const allItems = await tx
		.select({
			id: labItems.id,
			toothFdi: labItems.toothFdi,
			priceKopecks: labItems.priceKopecks,
			priceRub: labItems.priceRub,
		})
		.from(labItems)
		.where(and(eq(labItems.organizationId, orgId), eq(labItems.labOrderId, labOrderId)))
		.orderBy(labItems.toothFdi);

	const uniqueTeeth = Array.from(new Set(allItems.map((it) => it.toothFdi))).sort((a, b) => a - b);
	const teethFdi = uniqueTeeth.length > 0 ? uniqueTeeth.join(",") : null;

	const sumPriceKopecks = allItems.reduce((acc, it) => {
		const kop =
			it.priceKopecks != null
				? Number(it.priceKopecks)
				: it.priceRub != null
					? rublesToKopecks(Number(it.priceRub))
					: 0;
		return acc + kop;
	}, 0);

	const priceKopecks = order.isWarranty ? 0 : sumPriceKopecks;
	const priceRub = order.isWarranty ? 0 : kopecksToRubles(sumPriceKopecks);

	const [updatedOrder] = await tx
		.update(labOrders)
		.set({
			toothFdi: teethFdi,
			priceKopecks,
			priceRub,
			updatedAt: new Date(),
		})
		.where(and(eq(labOrders.id, labOrderId), eq(labOrders.organizationId, orgId)))
		.returning();

	return updatedOrder ?? null;
}

export async function insertLabItemTx(
	tx: TenantDb,
	orgId: string,
	labOrderId: string,
	body: CreateLabItemInput,
) {
	const computedPriceKopecks =
		body.priceKopecks != null
			? Number(body.priceKopecks)
			: body.priceRub != null
				? rublesToKopecks(body.priceRub)
				: null;

	const [createdItem] = await tx
		.insert(labItems)
		.values({
			organizationId: orgId,
			labOrderId,
			toothFdi: body.toothFdi,
			restorationType: body.restorationType,
			material: body.material,
			shadeSystem: body.shadeSystem,
			shadeFinal: body.shadeFinal,
			shadeStump: body.shadeStump ?? null,
			shadeGingiva: body.shadeGingiva ?? null,
			translucencyLevel: body.translucencyLevel,
			cementGapMicrons: body.cementGapMicrons,
			extraMarginGapMicrons: body.extraMarginGapMicrons,
			minimalThicknessMm: body.minimalThicknessMm,
			implantSystem: body.implantSystem ?? null,
			implantPlatformDiameterMm: body.implantPlatformDiameterMm ?? null,
			tiBaseHeightMm: body.tiBaseHeightMm ?? null,
			priceRub:
				computedPriceKopecks != null
					? kopecksToNumericString(computedPriceKopecks)
					: body.priceRub
						? String(body.priceRub)
						: null,
			priceKopecks: computedPriceKopecks,
		})
		.returning();

	if (createdItem) {
		await recalculateLabOrderFromItemsTx(tx, orgId, labOrderId);
	}

	return createdItem;
}

export async function updateLabItemTx(
	tx: TenantDb,
	orgId: string,
	labOrderId: string,
	itemId: string,
	body: UpdateLabItemInput,
) {
	const updatePayload: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (body.toothFdi !== undefined) updatePayload.toothFdi = body.toothFdi;
	if (body.restorationType !== undefined) updatePayload.restorationType = body.restorationType;
	if (body.material !== undefined) updatePayload.material = body.material;
	if (body.shadeSystem !== undefined) updatePayload.shadeSystem = body.shadeSystem;
	if (body.shadeFinal !== undefined) updatePayload.shadeFinal = body.shadeFinal;
	if (body.shadeStump !== undefined) updatePayload.shadeStump = body.shadeStump;
	if (body.shadeGingiva !== undefined) updatePayload.shadeGingiva = body.shadeGingiva;
	if (body.translucencyLevel !== undefined) updatePayload.translucencyLevel = body.translucencyLevel;
	if (body.cementGapMicrons !== undefined) updatePayload.cementGapMicrons = body.cementGapMicrons;
	if (body.extraMarginGapMicrons !== undefined) updatePayload.extraMarginGapMicrons = body.extraMarginGapMicrons;
	if (body.minimalThicknessMm !== undefined) updatePayload.minimalThicknessMm = body.minimalThicknessMm;
	if (body.implantSystem !== undefined) updatePayload.implantSystem = body.implantSystem;
	if (body.implantPlatformDiameterMm !== undefined) updatePayload.implantPlatformDiameterMm = body.implantPlatformDiameterMm;
	if (body.tiBaseHeightMm !== undefined) updatePayload.tiBaseHeightMm = body.tiBaseHeightMm;

	if (body.priceKopecks !== undefined || body.priceRub !== undefined) {
		const computedPriceKopecks =
			body.priceKopecks != null
				? Number(body.priceKopecks)
				: body.priceRub != null
					? rublesToKopecks(body.priceRub)
					: null;
		updatePayload.priceKopecks = computedPriceKopecks;
		updatePayload.priceRub =
			computedPriceKopecks != null ? kopecksToNumericString(computedPriceKopecks) : null;
	}


	const [updatedItem] = await tx
		.update(labItems)
		.set(updatePayload)
		.where(
			and(
				eq(labItems.id, itemId),
				eq(labItems.labOrderId, labOrderId),
				eq(labItems.organizationId, orgId),
			),
		)
		.returning();

	if (updatedItem) {
		await recalculateLabOrderFromItemsTx(tx, orgId, labOrderId);
	}

	return updatedItem ?? null;
}

export async function deleteLabItemTx(
	tx: TenantDb,
	orgId: string,
	labOrderId: string,
	itemId: string,
) {
	const [deletedItem] = await tx
		.delete(labItems)
		.where(
			and(
				eq(labItems.id, itemId),
				eq(labItems.labOrderId, labOrderId),
				eq(labItems.organizationId, orgId),
			),
		)
		.returning();

	if (deletedItem) {
		await recalculateLabOrderFromItemsTx(tx, orgId, labOrderId);
	}

	return deletedItem ?? null;
}

export async function insertLabItem(
	orgId: string,
	labOrderId: string,
	body: CreateLabItemInput,
) {
	return withTenantCtx(orgId, async (tx) => {
		return insertLabItemTx(tx, orgId, labOrderId, body);
	});
}

export async function updateLabItem(
	orgId: string,
	labOrderId: string,
	itemId: string,
	body: UpdateLabItemInput,
) {
	return withTenantCtx(orgId, async (tx) => {
		return updateLabItemTx(tx, orgId, labOrderId, itemId, body);
	});
}

export async function deleteLabItem(
	orgId: string,
	labOrderId: string,
	itemId: string,
) {
	return withTenantCtx(orgId, async (tx) => {
		return deleteLabItemTx(tx, orgId, labOrderId, itemId);
	});
}
