import type { TreatmentPlanItem } from "../types.js";
import type {
	PlanPriceCatalogItem,
	PriceDriftInfo,
	ArchivedServiceAction,
} from "./planDriftTypes.js";

/**
 * Определение дрейфа цен между утвержденным снимком плана и актуальным каталогом (Мандат 8e, 8n).
 */
export function detectPriceDrift(
	snapshotPriceRub: number,
	catalogItem: PlanPriceCatalogItem | null | undefined,
	_isPlanImmutable = false,
): PriceDriftInfo {
	const safeSnapshotPrice = Number.isFinite(snapshotPriceRub) ? Math.max(0, snapshotPriceRub) : 0;

	if (!catalogItem) {
		return {
			isDrifted: false,
			currentCatalogPriceRub: null,
			snapshotPriceRub: safeSnapshotPrice,
			driftRub: 0,
			isArchived: false,
			isNotFound: true,
			badgeText: "Позиция не найдена в текущем прайс-листе",
		};
	}

	const isArchived = !catalogItem.active;
	const currentCatalogPriceRub = Number.isFinite(catalogItem.basePriceRub)
		? Math.max(0, catalogItem.basePriceRub)
		: safeSnapshotPrice;
	const driftRub = currentCatalogPriceRub - safeSnapshotPrice;
	const isDrifted = Math.abs(driftRub) > 0.001;

	let badgeText = "Цена актуальна";
	if (isArchived) {
		badgeText = "Услуга архивирована в каталоге";
	} else if (isDrifted) {
		const formattedCatalog = Math.round(currentCatalogPriceRub).toLocaleString("ru-RU").replace(/[\u00A0\u202F]/g, " ");
		const formattedSnapshot = Math.round(safeSnapshotPrice).toLocaleString("ru-RU").replace(/[\u00A0\u202F]/g, " ");
		badgeText = `В прайсе: ${formattedCatalog} ₽ · В плане зафиксировано: ${formattedSnapshot} ₽`;
	}

	return {
		isDrifted,
		currentCatalogPriceRub,
		snapshotPriceRub: safeSnapshotPrice,
		driftRub,
		isArchived,
		isNotFound: false,
		badgeText,
	};
}

/**
 * Разрешение ситуации с деактивированной / архивной услугой номенклатуры (Zero Dead-Ends).
 */
export function resolveArchivedPlanItem(
	item: TreatmentPlanItem,
	action: ArchivedServiceAction,
	replacementCatalogItem?: PlanPriceCatalogItem | null,
): TreatmentPlanItem {
	if (action === "keep_agreed_price") {
		return {
			...item,
			isPriceLocked: true,
			isArchivedInCatalog: true,
			archivedResolution: "keep_agreed_price",
			requiresManualPricing: false,
		};
	}

	if (action === "replace_from_catalog" && replacementCatalogItem) {
		const newPrice = Number.isFinite(replacementCatalogItem.basePriceRub)
			? Math.max(0, replacementCatalogItem.basePriceRub)
			: item.priceRub;
		return {
			...item,
			name: replacementCatalogItem.title,
			priceId: replacementCatalogItem.id,
			priceRub: newPrice,
			unitPriceRub: newPrice,
			isArchivedInCatalog: false,
			archivedResolution: "replace_from_catalog",
			requiresManualPricing: false,
		};
	}

	return {
		...item,
		archivedResolution: "replace_from_catalog",
	};
}
