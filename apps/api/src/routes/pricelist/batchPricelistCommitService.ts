/**
 * apps/api/src/routes/pricelist/batchPricelistCommitService.ts
 *
 * Канонический сервис транзакционной фиксации пакетного импорта прейскуранта,
 * распознанных сканов и сырого прайса.
 * Мандаты: 8bf (Единый SSOT, Анти-Дубликат), 8bo (Неделимость ACID через tx),
 * 8bm (Копейки), 8e (Автономия врача), DEF-23-01..DEF-23-04.
 */

import { withTenantCtx } from "../../db/rls.js";
import {
	createServiceCatalogItemInDb,
	updateServiceCatalogItemInDb,
} from "../../db/pricelistQuery.js";
import {
	normalizeCategory,
	normalizeSpecialty,
} from "./serviceCategoryNormalizer.js";
import {
	STATUTORY_CATEGORY_CODES,
	STATUTORY_CATEGORY_DURATIONS,
	type PricelistBatchImportBody,
	type ScanAndImportItem,
} from "./types.js";

export interface CommitMutationStats {
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
}

export interface IngestItemToCommit {
	category: string;
	specialty: string;
	code?: string | null | undefined;
	serviceCode?: string | null | undefined;
	code804n?: string | null | undefined;
	order804nCode?: string | null | undefined;
	suggestedAction?: string | null | undefined;
	matchedExistingServiceId?: string | null | undefined;
	cleanedTitle: string;
	priceRub: number;
	costRub?: number | null | undefined;
}

/**
 * ACID-транзакционная фиксация элементов пакетного импорта с сохранением внутренних кодов клиники.
 */
export async function commitBatchImportItems(
	orgId: string,
	items: PricelistBatchImportBody["items"],
	collisionStrategy: "update_existing" | "skip_duplicates" | "create_new",
): Promise<CommitMutationStats> {
	let createdCount = 0;
	let updatedCount = 0;
	let skippedCount = 0;

	if (!items || items.length === 0) {
		return { createdCount: 0, updatedCount: 0, skippedCount: 0 };
	}

	return await withTenantCtx(orgId, async (tx) => {
		for (const item of items) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);

			// DEF-23-03: сохраняем внутренний артикул клиники, не затирая его кодом 804н
			const rawInternalCode = item.code?.trim() || item.serviceCode?.trim();
			const statutoryOrder804nCode =
				item.order804nCode && item.order804nCode.trim().length > 0
					? item.order804nCode.trim()
					: null;
			const internalCode =
				rawInternalCode || statutoryOrder804nCode || STATUTORY_CATEGORY_CODES[category] || "A16.07.002";

			const durationMinutes =
				item.durationMinutes || STATUTORY_CATEGORY_DURATIONS[category] || 30;

			if (collisionStrategy === "skip_duplicates" && item.matchedExistingServiceId) {
				skippedCount++;
				continue;
			}

			if (
				(collisionStrategy === "update_existing" ||
					item.suggestedAction === "update_existing") &&
				item.matchedExistingServiceId
			) {
				await updateServiceCatalogItemInDb(
					orgId,
					item.matchedExistingServiceId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						title: item.title,
						basePriceRub: item.priceRub,
						...(item.costRub !== undefined ? { materialsCostRub: item.costRub } : {}),
						category,
						specialty,
						durationMinutes,
					},
					tx,
				);
				updatedCount++;
			} else {
				await createServiceCatalogItemInDb(
					orgId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						title: item.title,
						category,
						specialty,
						basePriceRub: item.priceRub,
						...(item.costRub !== undefined ? { materialsCostRub: item.costRub } : {}),
						durationMinutes,
						taxDeductible: true,
						active: true,
					},
					tx,
				);
				createdCount++;
			}
		}

		return { createdCount, updatedCount, skippedCount };
	});
}

/**
 * ACID-транзакционная фиксация распознанных строк скана прейскуранта.
 */
export async function commitScanAndImportItems(
	orgId: string,
	itemsToCommit: ScanAndImportItem[],
	collisionStrategy: "update_existing" | "skip_duplicates" | "create_new",
): Promise<CommitMutationStats> {
	let createdCount = 0;
	let updatedCount = 0;
	let skippedCount = 0;

	if (!itemsToCommit || itemsToCommit.length === 0) {
		return { createdCount: 0, updatedCount: 0, skippedCount: 0 };
	}

	return await withTenantCtx(orgId, async (tx) => {
		for (const item of itemsToCommit) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);

			// DEF-23-03: сохраняем внутренний артикул клиники, не затирая его кодом 804н
			const rawInternalCode = item.code?.trim() || item.serviceCode?.trim();
			const statutoryOrder804nCode =
				item.code804n && item.code804n.trim().length > 0
					? item.code804n.trim()
					: null;
			const internalCode =
				rawInternalCode || statutoryOrder804nCode || STATUTORY_CATEGORY_CODES[category] || "A16.07.002";

			const durationMinutes =
				item.durationMinutes || STATUTORY_CATEGORY_DURATIONS[category] || 30;

			if (collisionStrategy === "skip_duplicates" && item.matchedExistingServiceId) {
				skippedCount++;
				continue;
			}

			if (
				(collisionStrategy === "update_existing" ||
					item.suggestedAction === "update_existing" ||
					item.suggestedAction === "link_existing") &&
				item.matchedExistingServiceId
			) {
				await updateServiceCatalogItemInDb(
					orgId,
					item.matchedExistingServiceId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						title: item.cleanedTitle,
						basePriceRub: item.priceRub,
						category,
						specialty,
						durationMinutes,
					},
					tx,
				);
				updatedCount++;
			} else {
				await createServiceCatalogItemInDb(
					orgId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						title: item.cleanedTitle,
						category,
						specialty,
						basePriceRub: item.priceRub,
						durationMinutes,
						taxDeductible: true,
						active: true,
					},
					tx,
				);
				createdCount++;
			}
		}

		return { createdCount, updatedCount, skippedCount };
	});
}

/**
 * ACID-транзакционная фиксация разобранных строк прайса.
 */
export async function commitIngestedPriceListItems(
	orgId: string,
	itemsToCommit: IngestItemToCommit[],
): Promise<number> {
	let committedCount = 0;

	if (!itemsToCommit || itemsToCommit.length === 0) {
		return 0;
	}

	return await withTenantCtx(orgId, async (tx) => {
		for (const item of itemsToCommit) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);

			const rawInternalCode = item.code?.trim() || item.serviceCode?.trim();
			const statutoryOrder804nCode =
				(item.order804nCode && item.order804nCode.trim().length > 0 ? item.order804nCode.trim() : undefined) ||
				(item.code804n && item.code804n.trim().length > 0 ? item.code804n.trim() : undefined) ||
				null;
			const internalCode =
				rawInternalCode || statutoryOrder804nCode || STATUTORY_CATEGORY_CODES[category] || "A16.07.002";

			const durationMinutes = STATUTORY_CATEGORY_DURATIONS[category] || 30;

			if (
				item.suggestedAction === "update_existing" &&
				item.matchedExistingServiceId
			) {
				await updateServiceCatalogItemInDb(
					orgId,
					item.matchedExistingServiceId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						title: item.cleanedTitle,
						basePriceRub: item.priceRub,
						category,
						specialty,
					},
					tx,
				);
				committedCount++;
			} else if (
				item.suggestedAction === "link_existing" &&
				item.matchedExistingServiceId
			) {
				await updateServiceCatalogItemInDb(
					orgId,
					item.matchedExistingServiceId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						basePriceRub: item.priceRub,
					},
					tx,
				);
				committedCount++;
			} else if (
				item.suggestedAction === "create_new" ||
				!item.matchedExistingServiceId
			) {
				await createServiceCatalogItemInDb(
					orgId,
					{
						code: internalCode,
						order804nCode: statutoryOrder804nCode,
						title: item.cleanedTitle,
						category,
						specialty,
						basePriceRub: item.priceRub,
						durationMinutes,
						taxDeductible: true,
						active: true,
					},
					tx,
				);
				committedCount++;
			}
		}
		return committedCount;
	});
}
