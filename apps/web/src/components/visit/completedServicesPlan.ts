/**
 * completedServicesPlan.ts — Фасад отметки выполненных услуг в открытом приёме
 * (Wave 47 / Architectural Facade <= 250 строк).
 *
 * Декомпозирован на:
 * - completedServicesPricing.ts: математика копеек, парсинг рублей, расчет итога строки
 * - completedServicesAggregator.ts: номенклатура 804н, зубы FDI, парсинг/форматирование строк, каталог
 */

export {
	roundToKopecks,
	parseRubAmount,
	planLineQuantity,
	planLineDiscountRub,
	planLineTotalRub,
	PRICE_UNKNOWN_TEXT,
} from "./completedServicesPricing";

export {
	type ChairsideExpressService,
	CHAIRSIDE_EXPRESS_SERVICES,
	resolveExpressServicesAgainstCatalog,
	FDI_UPPER_TEETH,
	FDI_LOWER_TEETH,
	ALL_FDI_TEETH,
	stripEmojis,
	type FormatCompletedServiceParams,
	formatCompletedServiceLine,
	type ParsedCompletedLine,
	type ParsedCompletedServiceLine,
	parseCompletedServiceLine,
	type FilteredCatalogService,
	filterServiceCatalog,
	type CompletedServicesSummary,
	calculateCompletedServicesSummary,
} from "./completedServicesAggregator";

export interface VisitPlanItemLike {
	readonly id?: string;
	readonly serviceId?: string;
	readonly patientId?: string;
	readonly status?: string;
	readonly name?: string;
	readonly title?: string;
	readonly snapshotServiceName?: string;
	readonly code?: string;
	readonly serviceCode?: string;
	readonly code804n?: string;
	readonly price?: number | string;
	readonly priceRub?: number | string;
	readonly unitPriceRub?: number | string;
	readonly tooth?: string | number | null;
	readonly toothCode?: string | null;
	readonly toothNumber?: number | string | null;
	[key: string]: unknown;
}

/**
 * Позиции плана, которые принадлежат пациенту ОТКРЫТОГО приёма и ещё не
 * отменены. Без идентификатора пациента приёма отмечать нельзя ничего: строка
 * «Выполнено…» уходит в карту конкретного человека, и ошибиться тут нечем
 * оправдать.
 */
export function visitOwnedPlanItems(
	treatmentPlanItems: unknown,
	visitPatientId: string | null,
): VisitPlanItemLike[] {
	if (!visitPatientId) return [];
	if (!Array.isArray(treatmentPlanItems)) return [];
	return treatmentPlanItems.filter(
		(item): item is VisitPlanItemLike =>
			Boolean(
				item &&
				typeof item === "object" &&
				(item as VisitPlanItemLike).patientId === visitPatientId &&
				(item as VisitPlanItemLike).status !== "cancelled",
			),
	);
}
