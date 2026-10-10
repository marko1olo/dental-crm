import {
	type DentalSpecialty,
	type ServiceCategory,
} from "@dental/shared";
import { db } from "../../db/client.js";
import {
	createServiceCatalogItemInDb,
	updateServiceCatalogItemInDb,
} from "../../db/pricelistQuery.js";
import {
	STATUTORY_CATEGORY_CODES,
	STATUTORY_CATEGORY_DURATIONS,
	VALID_SERVICE_CATEGORIES,
	type PricelistBatchImportBody,
	type ScanAndImportItem,
} from "./types.js";

export {
	VALID_SERVICE_CATEGORIES,
	STATUTORY_CATEGORY_CODES,
	STATUTORY_CATEGORY_DURATIONS,
	SERVICE_CATEGORIES_METADATA,
} from "./types.js";

// ─── Валидация и нормализация категорий стоматологических услуг ─────────────

export function isValidServiceCategory(category: string): boolean {
	const c = (category || "").toLowerCase().trim();
	return (
		(VALID_SERVICE_CATEGORIES as readonly string[]).includes(c) ||
		[
			"терапия",
			"ортопедия",
			"хирургия",
			"ортодонтия",
			"гигиена",
			"пародонтология",
			"диагностика",
			"рентген",
			"консультация",
			"документы",
			"протезирование",
			"orthopedics",
		].includes(c)
	);
}

export function normalizeCategory(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase().trim();
	if (
		c === "therapy" ||
		c === "терапия" ||
		c.includes("кариес") ||
		c.includes("пульпит") ||
		c.includes("эндодонт")
	)
		return "therapy";
	if (
		c === "surgery" ||
		c === "хирургия" ||
		c.includes("удален") ||
		c.includes("имплант") ||
		c.includes("синус")
	)
		return "surgery";
	if (
		c === "orthopedics" ||
		c === "prosthetics" ||
		c === "ортопедия" ||
		c === "протезирование" ||
		c.includes("корон") ||
		c.includes("винир") ||
		c.includes("протез")
	)
		return "prosthetics";
	if (
		c === "orthodontics" ||
		c === "ортодонтия" ||
		c.includes("брекет") ||
		c.includes("элайн")
	)
		return "orthodontics";
	if (
		c === "hygiene" ||
		c === "гигиена" ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел")
	)
		return "hygiene";
	if (c === "periodontology" || c === "пародонтология" || c.includes("пародонт"))
		return "periodontology";
	if (
		c === "diagnostics" ||
		c === "imaging" ||
		c === "диагностика" ||
		c.includes("рентген") ||
		c.includes("сним") ||
		c.includes("оптг") ||
		c.includes("кт")
	)
		return "imaging";
	if (
		c === "consultation" ||
		c === "консультация" ||
		c.includes("консульт") ||
		c.includes("осмотр") ||
		c.includes("прием")
	)
		return "consultation";
	if (
		c === "documents" ||
		c === "документы" ||
		c.includes("справк") ||
		c.includes("вычет")
	)
		return "documents";
	return "other";
}

export function normalizeSpecialty(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase().trim();
	if (s === "therapist" || s === "терапевт") return "therapist";
	if (s === "orthopedist" || s === "ортопед") return "orthopedist";
	if (s === "surgeon" || s === "хирург") return "surgeon";
	if (s === "orthodontist" || s === "ортодонт") return "orthodontist";
	if (s === "periodontist" || s === "пародонтолог") return "periodontist";
	if (s === "hygienist" || s === "гигиенист") return "hygienist";
	if (s === "pediatric" || s === "детский") return "pediatric";
	if (s === "implantologist" || s === "имплантолог") return "implantologist";
	if (s === "radiologist" || s === "рентгенолог") return "radiologist";
	return "universal";
}

export interface IngestItemToCommit {
	category: string;
	specialty: string;
	code804n?: string | null | undefined;
	suggestedAction?: string | null | undefined;
	matchedExistingServiceId?: string | null | undefined;
	cleanedTitle: string;
	priceRub: number;
}

/**
 * ACID-транзакционная фиксация предложений AI-ингестии прейскуранта.
 */
export async function commitIngestedPriceListItems(
	orgId: string,
	itemsToCommit: IngestItemToCommit[],
): Promise<number> {
	let committedCount = 0;
	await db.transaction(async () => {
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
				await updateServiceCatalogItemInDb(
					orgId,
					item.matchedExistingServiceId,
					{
						code: statutoryCode,
						title: item.cleanedTitle,
						basePriceRub: item.priceRub,
						category,
						specialty,
					},
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
						code: statutoryCode,
						basePriceRub: item.priceRub,
					},
				);
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

export interface CommitMutationStats {
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
}

/**
 * ACID-транзакционная фиксация результатов сканирования прейскуранта.
 */
export async function commitScanAndImportItems(
	orgId: string,
	itemsToCommit: ScanAndImportItem[],
	collisionStrategy: "update_existing" | "skip_duplicates" | "create_new",
): Promise<CommitMutationStats> {
	let createdCount = 0;
	let updatedCount = 0;
	let skippedCount = 0;

	await db.transaction(async () => {
		for (const item of itemsToCommit) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);
			const statutoryCode =
				item.code804n && item.code804n.trim().length > 0
					? item.code804n.trim()
					: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
			const durationMinutes =
				item.durationMinutes || STATUTORY_CATEGORY_DURATIONS[category] || 30;

			if (
				collisionStrategy === "skip_duplicates" &&
				item.matchedExistingServiceId
			) {
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
						code: statutoryCode,
						title: item.cleanedTitle,
						basePriceRub: item.priceRub,
						category,
						specialty,
						durationMinutes,
					},
				);
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

	await db.transaction(async () => {
		for (const item of items) {
			const category = normalizeCategory(item.category);
			const specialty = normalizeSpecialty(item.specialty);
			const statutoryCode =
				item.order804nCode && item.order804nCode.trim().length > 0
					? item.order804nCode.trim()
					: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
			const durationMinutes =
				item.durationMinutes || STATUTORY_CATEGORY_DURATIONS[category] || 30;

			if (
				collisionStrategy === "skip_duplicates" &&
				item.matchedExistingServiceId
			) {
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
						code: statutoryCode,
						title: item.title,
						basePriceRub: item.priceRub,
						category,
						specialty,
						durationMinutes,
					},
				);
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
