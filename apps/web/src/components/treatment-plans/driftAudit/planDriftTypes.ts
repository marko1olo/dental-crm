import type { Kopecks } from "@dental/shared";

/**
 * Услуга прайса в том виде, в каком она нужна расчёту.
 * Структурное подмножество ServiceCatalogItem.
 */
export interface PlanPriceCatalogItem {
	readonly id: string;
	readonly title: string;
	readonly category: string;
	readonly basePath?: string | undefined;
	readonly basePriceRub: number;
	readonly active?: boolean | undefined;
	readonly code?: string | undefined;
	readonly order804nCode?: string | undefined;
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

export type ArchivedServiceAction = "keep_agreed_price" | "replace_from_catalog";

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
