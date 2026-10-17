/**
 * chairsideToothColors.ts
 * Status badge colors for FDI teeth in Chairside workspace.
 */

import type { ToothState } from "../../store/visitStore";

export function getToothBadgeColor(state: ToothState | undefined): string | null {
	switch (state) {
		case "done":
			return "#16a34a"; // Зеленый: вылечен / пломба
		case "crown":
			return "#ca8a04"; // Золотистый: коронка
		case "treatment":
		case "pulpitis":
			return "#ef4444"; // Красный: лечение / пульпит
		case "caries":
			return "#ea580c"; // Оранжевый: кариес
		case "watch":
			return "#d97706"; // Янтарный: наблюдение
		case "missing":
			return "#64748b"; // Серый: удален
		case "planned":
			return "#0284c7"; // Голубой: запланирован
		default:
			return null;
	}
}
