import type { Kopecks } from "@dental/shared";

export type TechMapCategory =
	| "ppe"
	| "anesthesia"
	| "caries"
	| "endo"
	| "hygiene"
	| "surgery"
	| "other";

export const TECH_MAP_CATEGORY_LABELS: Record<TechMapCategory, string> = {
	ppe: "СИЗ и расходники",
	anesthesia: "Анестезия",
	caries: "Терапия (кариес)",
	endo: "Эндодонтия",
	hygiene: "Профгигиена",
	surgery: "Хирургия",
	other: "Прочие материалы",
};

export const TECH_MAP_CATEGORY_COLORS: Record<
	TechMapCategory,
	{ bg: string; text: string; border: string }
> = {
	ppe: { bg: "var(--paper-soft)", text: "var(--muted)", border: "var(--line)" },
	anesthesia: { bg: "var(--teal-soft)", text: "var(--teal)", border: "var(--teal)" },
	caries: { bg: "var(--teal-soft)", text: "var(--teal)", border: "var(--teal)" },
	endo: { bg: "var(--teal-soft)", text: "var(--teal)", border: "var(--teal)" },
	hygiene: { bg: "var(--paper-soft)", text: "var(--ink)", border: "var(--line)" },
	surgery: { bg: "var(--teal-soft)", text: "var(--teal)", border: "var(--teal)" },
	other: { bg: "var(--paper-soft)", text: "var(--muted)", border: "var(--line)" },
};

export interface ProcedureTechMapItem {
	readonly id: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	readonly standardQuantity: number;
	readonly defaultUnitCostKopecks: Kopecks;
	readonly lotTrackingRequired?: boolean;
	readonly description?: string;
	readonly order804nCode?: string;
	readonly mandatory?: boolean;
}

export interface ProcedureTechMap {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly specialty: string;
	readonly description: string;
	readonly items: readonly ProcedureTechMapItem[];
}

export interface ClinicalTechMapPackage {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly codes: readonly string[];
}

export interface DeductionLineItem {
	readonly id: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	quantity: number;
	readonly standardQuantity: number;
	unitCostKopecks: Kopecks;
	stockQuantity: number;
	criticalThreshold: number;
	inventoryItemId?: string | undefined;
	lotNumber?: string | undefined;
	expirationDate?: string | undefined;
	lotTrackingRequired?: boolean | undefined;
	source: "tech_map" | "manual" | "preset";
	techMapCode?: string | undefined;
	mandatory?: boolean | undefined;
}

export interface DeductionStockStatus {
	readonly severity: "ok" | "warning" | "critical";
	readonly remainingStock: number;
	readonly deficit: number;
	readonly message: string;
}

export interface DeductionSummary {
	readonly totalLines: number;
	readonly totalQuantity: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly hasDeficit: boolean;
	readonly categoryBreakdown: Record<
		TechMapCategory,
		{ count: number; costKopecks: Kopecks; costFormatted: string }
	>;
}
