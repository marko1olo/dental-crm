import { type Kopecks, parseKopecks, sumKopecks } from "@dental/shared";
import type { TreatmentPlanItem } from "../types.js";

export function computeStageItemsTotalKopecks(items: readonly TreatmentPlanItem[]): Kopecks {
	return sumKopecks(items.map((it) => parseKopecks(it.priceRub || 0)));
}
