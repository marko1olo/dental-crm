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

/**
 * Позиции плана, которые принадлежат пациенту ОТКРЫТОГО приёма и ещё не
 * отменены. Без идентификатора пациента приёма отмечать нельзя ничего: строка
 * «Выполнено…» уходит в карту конкретного человека, и ошибиться тут нечем
 * оправдать.
 */
export function visitOwnedPlanItems(
	treatmentPlanItems: unknown,
	visitPatientId: string | null,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
): any[] {
	if (!visitPatientId) return [];
	if (!Array.isArray(treatmentPlanItems)) return [];
	return treatmentPlanItems.filter(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(item: any) =>
			item?.patientId === visitPatientId && item?.status !== "cancelled",
	);
}
