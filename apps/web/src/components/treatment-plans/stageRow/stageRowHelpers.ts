import type { TreatmentPlanItem } from "../types";

export function checkIsLabOrderEligible(item: TreatmentPlanItem): boolean {
	const code = item.code804n || "";
	return (
		item.category === "Ортопедия" ||
		item.category === "Детская ортопедия" ||
		item.stageKind === "stage_3_orthopedics" ||
		/коронк|мост|протез|винир|вкладк|абатмент|бюгел|all-on|onlay|inlay/i.test(item.name) ||
		code.startsWith("A16.07.003") ||
		code.startsWith("A16.07.004") ||
		code.startsWith("A16.07.005") ||
		code.startsWith("A16.07.006")
	);
}

export function getItemUnitPrice(item: TreatmentPlanItem): number {
	if (typeof item.unitPriceRub === "number" && Number.isFinite(item.unitPriceRub)) return item.unitPriceRub;
	if (typeof item.priceRub === "number" && Number.isFinite(item.priceRub)) return item.priceRub;
	return 0;
}
