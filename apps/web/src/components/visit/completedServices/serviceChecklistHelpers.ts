import { money } from "../../../AppHelpers";
import {
	PRICE_UNKNOWN_TEXT,
	type ParsedCompletedServiceLine,
	parseCompletedServiceLine,
	planLineQuantity,
	planLineTotalRub,
	type VisitPlanItemLike,
} from "../completedServicesPlan";

export function serviceTitleOf(item: VisitPlanItemLike | null | undefined): string {
	const title =
		typeof item?.snapshotServiceName === "string"
			? item.snapshotServiceName.trim()
			: typeof item?.title === "string"
				? item.title.trim()
				: typeof item?.name === "string"
					? item.name.trim()
					: "";
	if (title) return title;
	const serviceId =
		typeof item?.serviceId === "string" ? item.serviceId.trim() : "";
	return serviceId || "Услуга без названия";
}

export function toothSuffixOf(item: VisitPlanItemLike | null | undefined): string {
	const tooth =
		typeof item?.toothCode === "string"
			? item.toothCode.trim()
			: item?.toothNumber !== undefined && item?.toothNumber !== null
				? String(item.toothNumber).trim()
				: "";
	return tooth ? ` (зуб ${tooth})` : "";
}

/**
 * Строка, которой отметка записывается в поле «План» карты приёма.
 * Формат фиксированный: по нему же отметка потом находится и снимается.
 */
export function completedLineOf(item: VisitPlanItemLike | null | undefined): string {
	const quantity = planLineQuantity(item);
	const quantityPart =
		quantity !== null && quantity > 1 ? `, ${quantity} шт.` : "";
	const total = planLineTotalRub(item);
	const priceText = total === null ? PRICE_UNKNOWN_TEXT : money(total);
	return `Выполнено: ${serviceTitleOf(item)}${toothSuffixOf(item)}${quantityPart} — ${priceText}`;
}

export function extractParsedCompletedLines(
	planLines: string[],
): ParsedCompletedServiceLine[] {
	return planLines
		.filter((l) => l.toLowerCase().startsWith("выполнено:"))
		.map((l) => parseCompletedServiceLine(l))
		.filter((item): item is ParsedCompletedServiceLine => Boolean(item));
}
