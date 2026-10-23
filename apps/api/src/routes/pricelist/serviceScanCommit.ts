import { db } from "../../db/client.js";
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
	type ScanAndImportItem,
} from "./types.js";

export interface CommitMutationStats {
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
}

export async function commitScanAndImportItems(
	orgId: string,
	itemsToCommit: ScanAndImportItem[],
	collisionStrategy: "update_existing" | "skip_duplicates" | "create_new",
): Promise<CommitMutationStats> {
	let createdCount = 0;
	let updatedCount = 0;
	let skippedCount = 0;

	await db.transaction(async (tx) => {
		for (const item of itemsToCommit) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);
			const statutoryCode =
				item.code804n && item.code804n.trim().length > 0
					? item.code804n.trim()
					: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
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
				await updateServiceCatalogItemInDb(orgId, item.matchedExistingServiceId, {
					code: statutoryCode,
					title: item.cleanedTitle,
					basePriceRub: item.priceRub,
					category,
					specialty,
					durationMinutes,
				});
				updatedCount++;
			} else {
				await createServiceCatalogItemInDb(orgId, {
					code: statutoryCode,
					title: item.cleanedTitle,
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
