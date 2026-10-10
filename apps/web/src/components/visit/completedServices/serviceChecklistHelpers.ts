import { money } from "../../../AppHelpers";
import {
	PRICE_UNKNOWN_TEXT,
	type ParsedCompletedServiceLine,
	parseCompletedServiceLine,
	planLineQuantity,
	planLineTotalRub,
} from "../completedServicesPlan";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function serviceTitleOf(item: any): string {
	const title =
		typeof item?.snapshotServiceName === "string"
			? item.snapshotServiceName.trim()
			: "";
	if (title) return title;
	const serviceId =
		typeof item?.serviceId === "string" ? item.serviceId.trim() : "";
	return serviceId || "Услуга без названия";
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function toothSuffixOf(item: any): string {
	const tooth =
		typeof item?.toothCode === "string" ? item.toothCode.trim() : "";
	return tooth ? ` (зуб ${tooth})` : "";
}

/**
 * Строка, которой отметка записывается в поле «План» карты приёма.
 * Формат фиксированный: по нему же отметка потом находится и снимается.
 */
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function completedLineOf(item: any): string {
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
