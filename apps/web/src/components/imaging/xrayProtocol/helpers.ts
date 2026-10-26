/**
 * helpers.ts — Вспомогательные функции для парсинга находок рентгенодиагностики
 * Mandate 8b: строго <= 120 строк.
 */

import { isValidFdiToothNumber } from "@dental/shared";
import type { ToothState } from "../../odontogram/ToothChart.js";

export function mapFindingToToothState(rawState: string): ToothState {
	const lower = (rawState || "").toLowerCase().trim();
	if (lower.includes("pulpit")) return "Pulpitis";
	if (lower.includes("periodont")) return "Periodontitis";
	if (lower.includes("caries") || lower.includes("treatment")) return "Caries";
	if (lower.includes("missing") || lower.includes("extract")) return "Missing";
	if (lower.includes("crown") || lower.includes("prosthet")) return "Crown";
	if (lower.includes("implant")) return "Implant";
	if (lower.includes("fill") || lower.includes("done")) return "Filled";
	return "Caries";
}

export function parseFdiToothNumber(code: string): number | null {
	const digits = code.replace(/\D/g, "");
	const num = parseInt(digits, 10);
	if (Number.isInteger(num) && isValidFdiToothNumber(num)) {
		return num;
	}
	return null;
}
