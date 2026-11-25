import {
	type ServiceCatalogItem,
	basisPointsFromPercent,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { BASELINE_804N_PRICELIST_SERVICES } from "../../services/clinical/statutoryCatalogs.js";
import { withSavepoint, withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import {
	projectServiceCatalogRows,
	projectSingleServiceCatalogRow,
	useInMemory,
} from "./pricelistReadQueries.js";
import {
	ServiceCatalogStorageDisabledError,
	createServiceCatalogItemInDb,
	moneyColumns,
} from "./pricelistWriteMutations.js";

const logger = createApiLogger("pricelistQuery");

/**
 * Наполнение прейскуранта клиники базовым набором по Приказу Минздрава РФ № 804н (30 услуг).
 */
export async function seedBaseline804nServicesInDb(
	organizationId: string,
	options: { replace?: boolean } = {},
): Promise<{
	success: true;
	createdCount: number;
	skippedCount: number;
	totalBaseline: number;
	items: ServiceCatalogItem[];
}> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();

	return await withTenantCtx(organizationId, async (tx) => {
		const existingRows = await tx
			.select()
			.from(schema.serviceCatalogItems)
			.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
		const existingCatalog = projectServiceCatalogRows(existingRows).items;
		const existingCodes = new Set(
			existingCatalog
				.map((item) => (item.code || "").trim().toUpperCase())
				.filter(Boolean),
		);
		const existingTitles = new Set(
			existingCatalog.map((item) => item.title.trim().toLowerCase()),
		);

		if (options.replace && existingCatalog.length > 0) {
			await tx
				.update(schema.serviceCatalogItems)
				.set({ isActive: false })
				.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
			existingCodes.clear();
			existingTitles.clear();
		}

		const createdItems: ServiceCatalogItem[] = [];
		let skippedCount = 0;

		for (const baseline of BASELINE_804N_PRICELIST_SERVICES) {
			const normCode = baseline.code.trim().toUpperCase();
			const normTitle = baseline.title.trim().toLowerCase();

			if (
				!options.replace &&
				(existingCodes.has(normCode) || existingTitles.has(normTitle))
			) {
				skippedCount++;
				continue;
			}

			try {
				const item = await withSavepoint(tx, async (spTx) =>
					createServiceCatalogItemInDb(
						organizationId,
						{
							code: baseline.code,
							order804nCode: baseline.code,
							title: baseline.title,
							category: baseline.category,
							specialty: baseline.specialty,
							basePriceRub: baseline.basePriceRub,
							durationMinutes: baseline.durationMinutes,
							taxDeductible: baseline.taxDeductible,
							active: baseline.active,
						},
						spTx,
					),
				);
				createdItems.push(item);
				existingCodes.add(normCode);
				existingTitles.add(normTitle);
			} catch (err) {
				const errObj =
					typeof err === "object" && err !== null
						? (err as { code?: string; cause?: { code?: string } })
						: null;
				const pgCode = errObj?.code ?? errObj?.cause?.code;
				if (pgCode !== "23505") {
					throw err;
				}
				skippedCount++;
				logger.warn(
					{
						err: safeLogError(err),
						organizationId,
						serviceCode: baseline.code,
					},
					"Пропущена дублирующая услуга базового каталога 804н",
				);
			}
		}

		return {
			success: true,
			createdCount: createdItems.length,
			skippedCount,
			totalBaseline: BASELINE_804N_PRICELIST_SERVICES.length,
			items: createdItems,
		};
	});
}

export type PriceRoundingRule = "none" | "round_10" | "round_50" | "round_100";

export interface BatchRepriceOptions {
	readonly percentChange?: number | undefined;
	readonly fixedRubChange?: number | undefined;
	readonly roundMode?: PriceRoundingRule | undefined;
	readonly category?: string | undefined;
	readonly specialty?: string | undefined;
	readonly serviceIds?: readonly string[] | undefined;
}

export interface BatchRepriceResult {
	readonly success: true;
	readonly updatedCount: number;
	readonly items: ServiceCatalogItem[];
}

export function computeRepricedAmount(
	currentPriceRub: number,
	percentChange?: number,
	fixedRubChange?: number,
	roundMode?: PriceRoundingRule,
): number {
	let currentPriceKopecks = rublesToKopecks(Math.max(0, currentPriceRub));

	if (percentChange !== undefined && Number.isFinite(percentChange)) {
		const bp = basisPointsFromPercent(Math.abs(percentChange));
		const deltaKopecks = Math.round((currentPriceKopecks * bp) / 10_000);
		currentPriceKopecks =
			percentChange >= 0
				? currentPriceKopecks + deltaKopecks
				: Math.max(0, currentPriceKopecks - deltaKopecks);
	}

	if (fixedRubChange !== undefined && Number.isFinite(fixedRubChange)) {
		const deltaKopecks = rublesToKopecks(Math.abs(fixedRubChange));
		currentPriceKopecks =
			fixedRubChange >= 0
				? currentPriceKopecks + deltaKopecks
				: Math.max(0, currentPriceKopecks - deltaKopecks);
	}

	switch (roundMode) {
		case "round_10":
			return kopecksToRubles(Math.round(currentPriceKopecks / 1000) * 1000);
		case "round_50":
			return kopecksToRubles(Math.round(currentPriceKopecks / 5000) * 5000);
		case "round_100":
			return kopecksToRubles(Math.round(currentPriceKopecks / 10000) * 10000);
		case "none":
		default:
			return kopecksToRubles(currentPriceKopecks);
	}
}

/**
 * Пакетная переоценка услуг клиники в ACID-транзакции с сохранением точных копеек.
 */
export async function batchRepriceServicesInDb(
	organizationId: string,
	options: BatchRepriceOptions,
): Promise<BatchRepriceResult> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();

	return await withTenantCtx(organizationId, async (tx) => {
		const currentRows = await tx
			.select()
			.from(schema.serviceCatalogItems)
			.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
		const currentCatalog = projectServiceCatalogRows(currentRows).items;
		if (currentCatalog.length === 0) {
			return { success: true, updatedCount: 0, items: [] };
		}

		const targetServiceIdSet =
			options.serviceIds && options.serviceIds.length > 0
				? new Set(options.serviceIds)
				: null;

		const itemsToUpdate = currentCatalog.filter((item) => {
			if (targetServiceIdSet && !targetServiceIdSet.has(item.id)) return false;
			if (
				options.category &&
				options.category !== "all" &&
				item.category !== options.category
			) {
				return false;
			}
			if (
				options.specialty &&
				options.specialty !== "all" &&
				item.specialty !== options.specialty
			) {
				return false;
			}
			return true;
		});

		if (itemsToUpdate.length === 0) {
			return { success: true, updatedCount: 0, items: [] };
		}

		const updatedItems: ServiceCatalogItem[] = [];

		for (const item of itemsToUpdate) {
			const newPrice = computeRepricedAmount(
				item.basePriceRub,
				options.percentChange,
				options.fixedRubChange,
				options.roundMode,
			);

			const [row] = await tx
				.update(schema.serviceCatalogItems)
				.set(moneyColumns(newPrice))
				.where(
					and(
						eq(schema.serviceCatalogItems.id, item.id),
						eq(schema.serviceCatalogItems.organizationId, organizationId),
					),
				)
				.returning();

			if (row) {
				updatedItems.push(projectSingleServiceCatalogRow(row));
			}
		}

		return {
			success: true,
			updatedCount: updatedItems.length,
			items: updatedItems,
		};
	});
}
