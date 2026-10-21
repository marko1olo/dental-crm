import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanItem } from "../types.js";
import {
	type PlanPriceCatalogItem,
	type PlanItemDriftAudit,
	type PlanDriftAuditResult,
	isPlanPriceImmutable,
} from "./planDriftTypes.js";
import { detectPriceDrift } from "./detectPriceDrift.js";

export function auditTreatmentPlanDrift(
	items: readonly TreatmentPlanItem[],
	catalog: readonly PlanPriceCatalogItem[],
	planStatus?: string,
): PlanDriftAuditResult {
	const isImmutable = isPlanPriceImmutable(planStatus);
	const activeCatalog = catalog;

	let totalSnapshotKopecks: Kopecks = 0;
	let totalCatalogKopecks: Kopecks = 0;
	let driftedItemsCount = 0;
	let archivedItemsCount = 0;

	const auditedItems: PlanItemDriftAudit[] = [];

	for (const item of items) {
		const snapshotKopecks = Math.round(
			(item.unitPriceRub || item.priceRub || 0) * (item.quantity || 1) * 100,
		);
		totalSnapshotKopecks += snapshotKopecks;

		const catalogMatch =
			(item.priceId ? activeCatalog.find((c) => c.id === item.priceId) : undefined) ||
			activeCatalog.find(
				(c) => c.title.trim().toLowerCase() === item.name.trim().toLowerCase(),
			);

		const driftInfo = detectPriceDrift(
			item.unitPriceRub || item.priceRub || 0,
			catalogMatch,
			isImmutable,
		);

		if (driftInfo.isDrifted) driftedItemsCount++;
		if (driftInfo.isArchived) archivedItemsCount++;

		const catPrice = driftInfo.currentCatalogPriceRub ?? (item.unitPriceRub || item.priceRub || 0);
		const catKopecks = Math.round(catPrice * (item.quantity || 1) * 100);
		totalCatalogKopecks += catKopecks;

		auditedItems.push({
			itemId: item.id,
			itemName: item.name,
			code804n: item.code804n,
			snapshotPriceRub: item.unitPriceRub || item.priceRub || 0,
			currentCatalogPriceRub: driftInfo.currentCatalogPriceRub,
			driftRub: driftInfo.driftRub,
			isDrifted: driftInfo.isDrifted,
			isArchived: driftInfo.isArchived,
			isNotFound: driftInfo.isNotFound,
			badgeText: driftInfo.badgeText,
		});
	}

	return {
		isImmutable,
		totalSnapshotKopecks,
		totalCatalogKopecks,
		totalDriftKopecks: totalCatalogKopecks - totalSnapshotKopecks,
		hasDrift: driftedItemsCount > 0 || archivedItemsCount > 0,
		driftedItemsCount,
		archivedItemsCount,
		items: auditedItems,
	};
}
