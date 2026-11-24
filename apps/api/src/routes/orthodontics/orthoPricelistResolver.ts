import type { FastifyBaseLogger } from "fastify";
import { and, eq, ilike, or } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
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

function resolveServicePriceKopecks(
	found: { priceKopecks?: bigint | null; priceRub?: string | number | null; basePriceRub?: string | number | null },
	fallbackPriceRub: number,
): bigint {
	const legacyRub = Number(found.priceRub ?? found.basePriceRub ?? fallbackPriceRub);
	const legacyKopecks = BigInt(rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : fallbackPriceRub));
	if (typeof found.priceKopecks === "bigint" && (found.priceKopecks > 0n || legacyKopecks === 0n)) {
		return found.priceKopecks;
	}
	return legacyKopecks;
}

function resolveInventoryCostKopecks(found: {
	unitCostKopecks?: bigint | null;
	pricePerUnitKopecks?: bigint | null;
	unitCostRub?: string | number | null;
}): bigint {
	const legacyRub = Number(found.unitCostRub ?? 0);
	const legacyKopecks = BigInt(rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : 0));
	if (typeof found.unitCostKopecks === "bigint" && (found.unitCostKopecks > 0n || legacyKopecks === 0n)) {
		return found.unitCostKopecks;
	}
	if (typeof found.pricePerUnitKopecks === "bigint" && (found.pricePerUnitKopecks > 0n || legacyKopecks === 0n)) {
		return found.pricePerUnitKopecks;
	}
	return legacyKopecks;
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
	tx?: TenantDb | undefined;
	logger?: FastifyBaseLogger | undefined;
}): Promise<ResolvedOrthoServicePrice> {
	const {
		organizationId,
		serviceCode,
		defaultServiceName,
		fallbackPriceKopecks,
		fallbackPriceRub = 0,
		tx,
		logger,
	} = params;

	const defaultKopecks =
		fallbackPriceKopecks !== undefined
			? BigInt(fallbackPriceKopecks)
			: BigInt(rublesToKopecks(fallbackPriceRub));

	try {
		const runQuery = async (client: TenantDb) =>
			client
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

		const [found] = tx ? await runQuery(tx) : await withTenantCtx(organizationId, runQuery);

		if (found) {
			const priceKopecks = resolveServicePriceKopecks(found, fallbackPriceRub);

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
	tx?: TenantDb | undefined;
	logger?: FastifyBaseLogger | undefined;
}): Promise<ResolvedOrthoMaterialCost> {
	const {
		organizationId,
		itemNamePattern,
		fallbackCostKopecks,
		fallbackCostRub = 0,
		tx,
		logger,
	} = params;

	const defaultKopecks =
		fallbackCostKopecks !== undefined
			? BigInt(fallbackCostKopecks)
			: BigInt(rublesToKopecks(fallbackCostRub));

	const trimmedPattern = itemNamePattern.trim();
	if (!trimmedPattern) {
		return {
			unitCostKopecks: defaultKopecks,
			amountKopecks: defaultKopecks,
			unitCostRub: kopecksToRubles(defaultKopecks),
			isInventoryMatch: false,
		};
	}

	try {
		const runQuery = async (client: TenantDb) =>
			client
				.select({
					id: inventoryItems.id,
					unitCostKopecks: inventoryItems.unitCostKopecks,
					pricePerUnitKopecks: inventoryItems.pricePerUnitKopecks,
					unitCostRub: inventoryItems.unitCostRub,
				})
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						ilike(inventoryItems.name, `%${trimmedPattern}%`),
					),
				)
				.orderBy(inventoryItems.id)
				.limit(1);

		const [found] = tx ? await runQuery(tx) : await withTenantCtx(organizationId, runQuery);

		if (found) {
			const kopecks = resolveInventoryCostKopecks(found);
			if (kopecks > 0n) {
				return {
					unitCostKopecks: kopecks,
					amountKopecks: kopecks,
					unitCostRub: kopecksToRubles(kopecks),
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
