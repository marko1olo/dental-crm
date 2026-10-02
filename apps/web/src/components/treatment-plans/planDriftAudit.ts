/**
 * planDriftAudit.ts — Аудит расхождений и дрейфа цен между сметой и каталогом (DENTE CRM).
 *
 * Принципы (Мандаты 8e, 8n):
 * 1. Заморозка цен утвержденных планов: при изменении цен в каталоге смета не ломается.
 * 2. Информативное предупреждение о дрейфе цен для врача.
 * 3. 1-Click разрешение архивных услуг (сохранить согласованную цену или заменить из прайса).
 */

import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanItem } from "./types";

/**
 * Услуга прайса в том виде, в каком она нужна расчёту.
 * Структурное подмножество ServiceCatalogItem.
 */
export interface PlanPriceCatalogItem {
	id: string;
	title: string;
	category: string;
	basePriceRub: number;
	active: boolean;
}

/**
 * Статусы утвержденности плана лечения.
 * Согласно Мандату 8e и 8n, утвержденные планы имеют НАМЕРТВО замороженные цены услуг и общую сумму.
 */
export type TreatmentPlanStatus =
	| "draft"
	| "presented"
	| "approved"
	| "in_progress"
	| "active"
	| "agreed"
	| "accepted"
	| "signed"
	| "completed"
	| "rejected";

export function isPlanPriceImmutable(
	status: TreatmentPlanStatus | string | null | undefined,
): boolean {
	if (!status) return false;
	const s = status.trim().toLowerCase();
	return (
		s === "approved" ||
		s === "in_progress" ||
		s === "active" ||
		s === "agreed" ||
		s === "accepted" ||
		s === "signed" ||
		s === "completed"
	);
}

export interface PriceDriftInfo {
	readonly isDrifted: boolean;
	readonly currentCatalogPriceRub: number | null;
	readonly snapshotPriceRub: number;
	readonly driftRub: number;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly badgeText: string;
}

/**
 * Определение дрейфа цен между утвержденным снимком плана и актуальным каталогом (Мандат 8e, 8n).
 * При изменении цен в прайс-листе замороженные цены утвержденного плана НЕ пересчитываются,
 * а врачу показывается спокойный информативный бейдж.
 */
export function detectPriceDrift(
	snapshotPriceRub: number,
	catalogItem: PlanPriceCatalogItem | null | undefined,
	_isPlanImmutable = false,
): PriceDriftInfo {
	const safeSnapshotPrice = Number.isFinite(snapshotPriceRub)
		? Math.max(0, snapshotPriceRub)
		: 0;

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
		const formattedCatalog = Math.round(currentCatalogPriceRub)
			.toLocaleString("ru-RU")
			.replace(/[\u00A0\u202F]/g, " ");
		const formattedSnapshot = Math.round(safeSnapshotPrice)
			.toLocaleString("ru-RU")
			.replace(/[\u00A0\u202F]/g, " ");
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

export type ArchivedServiceAction = "keep_agreed_price" | "replace_from_catalog";

/**
 * Разрешение ситуации с деактивированной / архивной услугой номенклатуры (Zero Dead-Ends).
 * 2 чистых действия в 1 клик для врача:
 * 1. «Выполнить по согласованной цене» — цена плана фиксируется, услуга разблокируется.
 * 2. «Заменить на актуальную из прайса» — подставляется активная позиция каталога с новой ценой.
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

export interface PlanItemDriftAudit {
	readonly itemId: string;
	readonly itemName: string;
	readonly code804n: string;
	readonly snapshotPriceRub: number;
	readonly currentCatalogPriceRub: number | null;
	readonly driftRub: number;
	readonly isDrifted: boolean;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly badgeText: string;
}

export interface PlanDriftAuditResult {
	readonly isImmutable: boolean;
	readonly totalSnapshotKopecks: Kopecks;
	readonly totalCatalogKopecks: Kopecks;
	readonly totalDriftKopecks: Kopecks;
	readonly hasDrift: boolean;
	readonly driftedItemsCount: number;
	readonly archivedItemsCount: number;
	readonly items: readonly PlanItemDriftAudit[];
}

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

		// Match in catalog by priceId or title
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

		const catPrice =
			driftInfo.currentCatalogPriceRub ?? (item.unitPriceRub || item.priceRub || 0);
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
