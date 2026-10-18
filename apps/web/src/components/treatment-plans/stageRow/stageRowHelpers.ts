import type { TreatmentPlanItem } from "../types";

export function checkIsLabOrderEligible(item: TreatmentPlanItem): boolean {
	return (
		item.category === "Ортопедия" ||
		item.category === "Детская ортопедия" ||
		item.stageKind === "stage_3_orthopedics" ||
		/коронк|мост|протез|винир|вкладк|абатмент|бюгел|all-on|onlay|inlay/i.test(item.name) ||
		item.code804n.startsWith("A16.07.003") ||
		item.code804n.startsWith("A16.07.004") ||
		item.code804n.startsWith("A16.07.005") ||
		item.code804n.startsWith("A16.07.006")
	);
}

export function getItemUnitPrice(item: TreatmentPlanItem): number {
	if (Number.isFinite(item.unitPriceRub)) return item.unitPriceRub;
	if (Number.isFinite(item.priceRub)) return item.priceRub;
	return 0;
}
