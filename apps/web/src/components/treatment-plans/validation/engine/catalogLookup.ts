import type { CatalogServiceItem } from "../planPriceValidationPresets";

/**
 * Расчет разницы в днях между двумя ISO датами (с округлением вниз).
 */
export function calculateDaysBetween(
	startDateIso: string,
	endDateIso: string = new Date().toISOString(),
): number {
	const start = new Date(startDateIso).getTime();
	const end = new Date(endDateIso).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return 0;
	const diffMs = end - start;
	return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Поиск услуги в текущем каталоге клиники: сначала по точному ID, затем по коду Минздрава 804н.
 */
export function findCatalogService(
	code804n: string,
	serviceId?: string | undefined,
	catalog: readonly CatalogServiceItem[] = [],
): CatalogServiceItem | null {
	if (serviceId) {
		const byId = catalog.find((c) => c.id === serviceId);
		if (byId) return byId;
	}
	const byCode = catalog.find(
		(c) => c.code804n.trim().toUpperCase() === code804n.trim().toUpperCase(),
	);
	return byCode || null;
}
