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
} from "./types.js";

export * from "./serviceScanCommit.js";

export interface IngestItemToCommit {
	category: string;
	specialty: string;
	code804n?: string | null | undefined;
	suggestedAction?: string | null | undefined;
	matchedExistingServiceId?: string | null | undefined;
	cleanedTitle: string;
	priceRub: number;
}

export async function commitIngestedPriceListItems(
	orgId: string,
	itemsToCommit: IngestItemToCommit[],
): Promise<number> {
	let committedCount = 0;
	await db.transaction(async (tx) => {
		for (const item of itemsToCommit) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);
			const statutoryCode =
				item.code804n && item.code804n.trim().length > 0
					? item.code804n.trim()
					: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
			const durationMinutes =
				STATUTORY_CATEGORY_DURATIONS[category] || 30;

			if (
				item.suggestedAction === "update_existing" &&
				item.matchedExistingServiceId
			) {
				await updateServiceCatalogItemInDb(orgId, item.matchedExistingServiceId, {
					code: statutoryCode,
					title: item.cleanedTitle,
					basePriceRub: item.priceRub,
					category,
					specialty,
				});
				committedCount++;
			} else if (
				item.suggestedAction === "link_existing" &&
				item.matchedExistingServiceId
			) {
				await updateServiceCatalogItemInDb(orgId, item.matchedExistingServiceId, {
					code: statutoryCode,
					basePriceRub: item.priceRub,
				});
				committedCount++;
			} else if (
				item.suggestedAction === "create_new" ||
				!item.matchedExistingServiceId
			) {
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
				committedCount++;
			}
		}
	});
	return committedCount;
}
