import type { JawScope } from "./labDataTypes";
import { isJawWideConstruction } from "./labConstructionTypes";

export function formatJawScopeLabel(
	jawScope?: JawScope | string | null,
	short = false,
): string {
	if (!jawScope) return "";
	if (jawScope === "upper") return short ? "В/Ч целиком" : "Верхняя челюсть (В/Ч)";
	if (jawScope === "lower") return short ? "Н/Ч целиком" : "Нижняя челюсть (Н/Ч)";
	if (jawScope === "both") return short ? "Обе челюсти" : "Обе челюсти (В/Ч + Н/Ч)";
	return String(jawScope);
}

export function formatLabOrderTeethOrJaw(order?: {
	toothFdi?: string | null;
	selectedTeeth?: number[];
	jawScope?: JawScope | string | null;
	constructionType?: string;
} | null): string {
	if (!order) return "—";

	if (order.jawScope === "upper") return "В/Ч целиком";
	if (order.jawScope === "lower") return "Н/Ч целиком";
	if (order.jawScope === "both") return "Обе челюсти";

	const toothStr = (order.toothFdi || "").trim();
	if (toothStr.includes("Обе челюсти") || toothStr.includes("В/Ч + Н/Ч")) return "Обе челюсти";
	if (toothStr.includes("В/Ч") || toothStr.includes("Верхняя челюсть")) return "В/Ч целиком";
	if (toothStr.includes("Н/Ч") || toothStr.includes("Нижняя челюсть")) return "Н/Ч целиком";

	if (isJawWideConstruction(order.constructionType) && (!order.selectedTeeth || order.selectedTeeth.length === 0)) {
		return "Челюсть целиком";
	}

	if (order.selectedTeeth && order.selectedTeeth.length > 0) {
		return order.selectedTeeth.length === 1
			? `Зуб ${order.selectedTeeth[0]}`
			: `Зубы: ${order.selectedTeeth.join(", ")}`;
	}

	return toothStr || "Общий наряд";
}
