import { db } from "../../db/client.js";
import {
	createServiceCatalogItemInDb,
	updateServiceCatalogItemInDb,
} from "../../db/pricelistQuery.js";
import {
	normalizeCategory,
	normalizeSpecialty,
} from "./serviceCategoryNormalizer.js";
import type { CommitMutationStats } from "./serviceIngestCommit.js";
import {
	STATUTORY_CATEGORY_CODES,
	STATUTORY_CATEGORY_DURATIONS,
	type PricelistBatchImportBody,
} from "./types.js";

/**
 * ACID-транзакционная фиксация элементов пакетного импорта.
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

	await db.transaction(async (tx) => {
		for (const item of items) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);
			const statutoryCode =
				item.order804nCode && item.order804nCode.trim().length > 0
					? item.order804nCode.trim()
					: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
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
				await updateServiceCatalogItemInDb(orgId, item.matchedExistingServiceId, {
					code: statutoryCode,
					title: item.title,
					basePriceRub: item.priceRub,
					category,
					specialty,
					durationMinutes,
				});
				updatedCount++;
			} else {
				await createServiceCatalogItemInDb(orgId, {
					code: statutoryCode,
					title: item.title,
					category,
					specialty,
					basePriceRub: item.priceRub,
					durationMinutes,
					taxDeductible: true,
					active: true,
				});
				createdCount++;
			}
		}
	});

	return { createdCount, updatedCount, skippedCount };
}
