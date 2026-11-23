import type { FastifyBaseLogger } from "fastify";
import { and, eq, ilike, or } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { db } from "../../db/client.js";
import { inventoryItems, serviceCatalogItems } from "../../db/schema.js";

export interface ResolvedOrthoServicePrice {
	serviceId?: string | undefined;
	serviceCode: string;
	serviceName: string;
	priceKopecks: bigint;
	amountKopecks: bigint;
	priceRub: number;
	isPricelistMatch: boolean;
}

/**
 * DEF-ORTHO-02 / DEF-ORTHO-SEV3-01 / Мандат 8bm:
 * Динамический выбор цен процедур ортодонтии из прейскуранта клиники
 * с безопасным фоллбеком и строгим расчетом в целочисленных копейках (BIGINT, amountKopecks).
 */
export async function resolveOrthoServicePrice(params: {
	organizationId: string;
	serviceCode: string;
	defaultServiceName: string;
	fallbackPriceKopecks?: bigint | number | undefined;
	fallbackPriceRub?: number | undefined;
	logger?: FastifyBaseLogger | undefined;
}): Promise<ResolvedOrthoServicePrice> {
	const {
		organizationId,
		serviceCode,
		defaultServiceName,
		fallbackPriceKopecks,
		fallbackPriceRub = 0,
		logger,
	} = params;

	const defaultKopecks =
		fallbackPriceKopecks !== undefined
			? BigInt(fallbackPriceKopecks)
			: BigInt(rublesToKopecks(fallbackPriceRub));

	try {
		const [found] = await db
			.select({
				id: serviceCatalogItems.id,
				code: serviceCatalogItems.code,
				order804nCode: serviceCatalogItems.order804nCode,
				title: serviceCatalogItems.title,
				priceKopecks: serviceCatalogItems.priceKopecks,
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
			let priceKopecks: bigint;
			if (found.priceKopecks != null) {
				priceKopecks = BigInt(found.priceKopecks);
			} else {
				const effectiveRub = Number(found.priceRub ?? found.basePriceRub ?? fallbackPriceRub);
				priceKopecks = BigInt(rublesToKopecks(effectiveRub));
			}

			return {
				serviceId: found.id,
				serviceCode: found.order804nCode || found.code || serviceCode,
				serviceName: found.title || defaultServiceName,
				priceKopecks,
				amountKopecks: priceKopecks,
				priceRub: kopecksToRubles(priceKopecks),
				isPricelistMatch: true,
			};
		}
	} catch (err) {
		if (logger) {
			logger.warn({ err, organizationId, serviceCode }, "[OrthoPricelistResolver] Warning searching service catalog");
		}
	}

	return {
		serviceCode,
		serviceName: defaultServiceName,
		priceKopecks: defaultKopecks,
		amountKopecks: defaultKopecks,
		priceRub: kopecksToRubles(defaultKopecks),
		isPricelistMatch: false,
	};
}

export interface ResolvedOrthoMaterialCost {
	unitCostKopecks: bigint;
	amountKopecks: bigint;
	unitCostRub: number;
	isInventoryMatch: boolean;
}

/**
 * DEF-ORTHO-02 / DEF-ORTHO-SEV3-01 / Мандат 8bm:
 * Динамический выбор стоимости материала ортодонтии из складских остатков клиники
 * с расчетом в копейках unitCostKopecks (BIGINT).
 */
export async function resolveOrthoMaterialCost(params: {
	organizationId: string;
	itemNamePattern: string;
	fallbackCostKopecks?: bigint | number | undefined;
	fallbackCostRub?: number | undefined;
	logger?: FastifyBaseLogger | undefined;
}): Promise<ResolvedOrthoMaterialCost> {
	const {
		organizationId,
		itemNamePattern,
		fallbackCostKopecks,
		fallbackCostRub = 0,
		logger,
	} = params;

	const defaultKopecks =
		fallbackCostKopecks !== undefined
			? BigInt(fallbackCostKopecks)
			: BigInt(rublesToKopecks(fallbackCostRub));

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
				const kopecks = BigInt(rublesToKopecks(parsed));
				return {
					unitCostKopecks: kopecks,
					amountKopecks: kopecks,
					unitCostRub: parsed,
					isInventoryMatch: true,
				};
			}
		}
	} catch (err) {
		if (logger) {
			logger.warn({ err, organizationId, itemNamePattern }, "[OrthoPricelistResolver] Warning searching inventory cost");
		}
	}

	return {
		unitCostKopecks: defaultKopecks,
		amountKopecks: defaultKopecks,
		unitCostRub: kopecksToRubles(defaultKopecks),
		isInventoryMatch: false,
	};
}
