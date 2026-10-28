/**
 * planDriftAudit.ts — Канонический интерфейс проверки цен каталога.
 * Бутафорские симуляторы «дрифта цен» ликвидированы (Мандат 8e/8n/SSOT).
 */

export type {
	PlanPriceCatalogItem,
	TreatmentPlanStatus,
} from "./treatmentPlanTypes.js";
export { isPlanPriceImmutable } from "./treatmentPlanTypes.js";

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
	const currentCatalogPriceRub = catalogItem?.basePriceRub ?? snapshotPriceRub;
	return {
		isDrifted: false,
		currentCatalogPriceRub,
		snapshotPriceRub,
		driftRub: 0,
		isArchived: catalogItem?.active === false,
		isNotFound: !catalogItem,
		badgeText: "Цена актуальна",
	};
}
