import { and, eq, ilike, or } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { db } from "../../db/client.js";
import { inventoryItems, serviceCatalogItems } from "../../db/schema.js";

export interface ResolvedOrthoServicePrice {
	serviceId?: string | undefined;
	serviceCode: string;
	serviceName: string;
	priceRub: number;
	priceKopecks: bigint;
	isPricelistMatch: boolean;
}

/**
 * DEF-ORTHO-02 / Ред Тим: Динамический выбор цен процедур ортодонтии из прейскуранта клиники
 * с безопасным фоллбеком на нормативный базовый прайс.
 */
export async function resolveOrthoServicePrice(params: {
	organizationId: string;
	serviceCode: string;
	defaultServiceName: string;
	fallbackPriceRub: number;
}): Promise<ResolvedOrthoServicePrice> {
	const { organizationId, serviceCode, defaultServiceName, fallbackPriceRub } = params;

	try {
		const [found] = await db
			.select({
				id: serviceCatalogItems.id,
				code: serviceCatalogItems.code,
				order804nCode: serviceCatalogItems.order804nCode,
				title: serviceCatalogItems.title,
				priceRub: serviceCatalogItems.priceRub,
				basePriceRub: serviceCatalogItems.basePriceRub,
				isActive: serviceCatalogItems.isActive,
			})
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.organizationId, organizationId),
					eq(serviceCatalogItems.isActive, true),
					or(
						eq(serviceCatalogItems.code, serviceCode),
						eq(serviceCatalogItems.order804nCode, serviceCode),
					),
				),
			)
			.limit(1);

		if (found) {
			const effectiveRub = Number(found.priceRub ?? found.basePriceRub ?? fallbackPriceRub);
			const priceKopecks = BigInt(rublesToKopecks(effectiveRub));
			return {
				serviceId: found.id,
				serviceCode: found.order804nCode || found.code || serviceCode,
				serviceName: found.title || defaultServiceName,
				priceRub: effectiveRub,
				priceKopecks,
				isPricelistMatch: true,
			};
		}
	} catch (err) {
		console.warn("[OrthoPricelistResolver] Warning searching service catalog:", err);
	}

	const priceKopecks = BigInt(rublesToKopecks(fallbackPriceRub));
	return {
		serviceCode,
		serviceName: defaultServiceName,
		priceRub: fallbackPriceRub,
		priceKopecks,
		isPricelistMatch: false,
	};
}

export interface ResolvedOrthoMaterialCost {
	unitCostRub: number;
	unitCostKopecks: bigint;
	isInventoryMatch: boolean;
}

/**
 * DEF-ORTHO-02: Динамический выбор стоимости материала ортодонтии из складских остатков клиники
 * с безопасным фоллбеком на нормативную себестоимость.
 */
export async function resolveOrthoMaterialCost(params: {
	organizationId: string;
	itemNamePattern: string;
	fallbackCostRub: number;
}): Promise<ResolvedOrthoMaterialCost> {
	const { organizationId, itemNamePattern, fallbackCostRub } = params;

	try {
		const [found] = await db
			.select({
				id: inventoryItems.id,
				unitCostRub: inventoryItems.unitCostRub,
			})
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, organizationId),
					ilike(inventoryItems.name, `%${itemNamePattern}%`),
				),
			)
			.orderBy(inventoryItems.id)
			.limit(1);

		if (found && found.unitCostRub != null) {
			const parsed = Number(found.unitCostRub);
			if (Number.isFinite(parsed) && parsed > 0) {
				return {
					unitCostRub: parsed,
					unitCostKopecks: BigInt(rublesToKopecks(parsed)),
					isInventoryMatch: true,
				};
			}
		}
	} catch (err) {
		console.warn("[OrthoPricelistResolver] Warning searching inventory cost:", err);
	}

	return {
		unitCostRub: fallbackCostRub,
		unitCostKopecks: BigInt(rublesToKopecks(fallbackCostRub)),
		isInventoryMatch: false,
	};
}
