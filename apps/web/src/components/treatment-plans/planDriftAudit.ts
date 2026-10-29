/**
 * planDriftAudit.ts — Канонический сервис аудита цен плана лечения и каталога.
 * Обеспечивает честное сопоставление сметных цен с прейскурантом клиники (Мандаты 8b, 8e, 8n).
 */

import type {
	PlanPriceCatalogItem,
	TreatmentPlanStatus,
} from "./treatmentPlanTypes.js";
import { isPlanPriceImmutable } from "./treatmentPlanTypes.js";
import { formatPlanPriceRub } from "./pricingEngine/pricingFormatters.js";

export type { PlanPriceCatalogItem, TreatmentPlanStatus };
export { isPlanPriceImmutable };

export interface PriceDriftInfo {
	readonly isDrifted: boolean;
	readonly currentCatalogPriceRub: number | null;
	readonly snapshotPriceRub: number;
	readonly driftRub: number;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly badgeText: string;
}

export function detectPriceDrift(
	snapshotPriceRub: number,
	catalogItem?: { basePriceRub: number; active?: boolean | undefined } | null | undefined,
	_isPlanImmutable = false,
): PriceDriftInfo {
	if (!catalogItem) {
		return {
			isDrifted: false,
			currentCatalogPriceRub: null,
			snapshotPriceRub,
			driftRub: 0,
			isArchived: false,
			isNotFound: true,
			badgeText: "Позиция не найдена в текущем прайс-листе",
		};
	}

	const isArchived = catalogItem.active === false;
	const currentCatalogPriceRub = catalogItem.basePriceRub;
	const driftRub = currentCatalogPriceRub - snapshotPriceRub;
	const isDrifted = driftRub !== 0;

	let badgeText = "Цена актуальна";
	if (isArchived) {
		badgeText = "Услуга архивирована в каталоге";
	} else if (isDrifted) {
		badgeText = `В прайсе: ${formatPlanPriceRub(currentCatalogPriceRub)} · В плане зафиксировано: ${formatPlanPriceRub(snapshotPriceRub)}`;
	}

	return {
		isDrifted,
		currentCatalogPriceRub,
		snapshotPriceRub,
		driftRub,
		isArchived,
		isNotFound: false,
		badgeText,
	};
}

export function resolveArchivedPlanItem<T extends Record<string, any>>(
	item: T,
	resolution: "keep_agreed_price" | "replace_from_catalog",
	replacementCatalogItem?: PlanPriceCatalogItem,
): T & {
	isPriceLocked: boolean;
	isArchivedInCatalog: boolean;
	archivedResolution: "keep_agreed_price" | "replace_from_catalog";
	priceRub: number;
	unitPriceRub: number;
	requiresManualPricing: boolean;
	priceId?: string;
	name?: string;
} {
	if (resolution === "keep_agreed_price") {
		return {
			...item,
			isPriceLocked: true,
			isArchivedInCatalog: true,
			archivedResolution: "keep_agreed_price",
			priceRub: Number(item.priceRub ?? item.unitPriceRub ?? 0),
			unitPriceRub: Number(item.unitPriceRub ?? item.priceRub ?? 0),
			requiresManualPricing: false,
		};
	}

	const newPrice = replacementCatalogItem?.basePriceRub ?? Number(item.priceRub ?? 0);
	return {
		...item,
		priceId: replacementCatalogItem?.id ?? item.priceId,
		name: replacementCatalogItem?.title ?? item.name,
		priceRub: newPrice,
		unitPriceRub: newPrice,
		isArchivedInCatalog: false,
		archivedResolution: "replace_from_catalog",
		isPriceLocked: false,
		requiresManualPricing: false,
	};
}

export interface PlanItemForDriftAudit {
	readonly id: string;
	readonly name: string;
	readonly priceId?: string | null | undefined;
	readonly priceRub?: number | undefined;
	readonly unitPriceRub: number;
	readonly quantity: number;
	readonly discountRub?: number | undefined;
}

export interface PlanDriftAuditResult {
	readonly isImmutable: boolean;
	readonly totalSnapshotKopecks: number;
	readonly totalCatalogKopecks: number;
	readonly totalDriftKopecks: number;
	readonly hasDrift: boolean;
	readonly driftedItemsCount: number;
	readonly archivedItemsCount: number;
	readonly items: ReadonlyArray<PlanItemForDriftAudit & { drift: PriceDriftInfo }>;
}

export function auditTreatmentPlanDrift(
	items: readonly PlanItemForDriftAudit[],
	catalog: readonly PlanPriceCatalogItem[],
	planStatus?: TreatmentPlanStatus | string,
): PlanDriftAuditResult {
	const isImmutable = isPlanPriceImmutable(planStatus as TreatmentPlanStatus);

	let totalSnapshotKopecks = 0;
	let totalCatalogKopecks = 0;
	let totalDriftKopecks = 0;
	let driftedItemsCount = 0;
	let archivedItemsCount = 0;

	const auditedItems = items.map((item) => {
		const matched = catalog.find(
			(c) => c.id === item.priceId || c.title.trim().toLowerCase() === item.name.trim().toLowerCase(),
		);

		const drift = detectPriceDrift(item.unitPriceRub, matched, isImmutable);
		const qty = Math.max(1, item.quantity || 1);
		const snapshotLineKopecks = Math.round(item.unitPriceRub * 100) * qty;
		const catalogUnitPrice = drift.currentCatalogPriceRub ?? item.unitPriceRub;
		const catalogLineKopecks = Math.round(catalogUnitPrice * 100) * qty;
		const lineDriftKopecks = catalogLineKopecks - snapshotLineKopecks;

		totalSnapshotKopecks += snapshotLineKopecks;
		totalCatalogKopecks += catalogLineKopecks;
		totalDriftKopecks += lineDriftKopecks;

		if (drift.isDrifted) driftedItemsCount += 1;
		if (drift.isArchived) archivedItemsCount += 1;

		return {
			...item,
			drift,
		};
	});

	const hasDrift = totalDriftKopecks !== 0 || driftedItemsCount > 0;

	return {
		isImmutable,
		totalSnapshotKopecks,
		totalCatalogKopecks,
		totalDriftKopecks,
		hasDrift,
		driftedItemsCount,
		archivedItemsCount,
		items: auditedItems,
	};
}
