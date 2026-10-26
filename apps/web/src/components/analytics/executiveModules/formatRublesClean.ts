import { formatRubles } from "../../../utils/formatters.js";

/**
 * Нормализует любое рублевое значение или строку, гарантируя отсутствие копеек (,00).
 * Соответствует мандату 8e и каноническому формату валюты DENTE («142 500 ₽»).
 */
export function formatRublesClean(
	val: string | number | null | undefined,
): string {
	if (val === null || val === undefined || val === "") return "0 ₽";
	if (typeof val === "number") {
		return formatRubles(Math.round(val));
	}
	const cleaned = String(val)
		.replace(/,00(\s*|\u00A0*)₽?/, "")
		.replace(/(\s*|\u00A0*)₽?$/, "")
		.trim();
	const parsed = parseFloat(
		cleaned.replace(/\s+/g, "").replace(/[^\d.-]/g, ""),
	);
	if (Number.isFinite(parsed)) {
		return formatRubles(Math.round(parsed));
	}
	return String(val);
}
