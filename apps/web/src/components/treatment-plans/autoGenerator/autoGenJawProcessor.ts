import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { buildAllOn4Items } from "./autoGenAllOn4";
import { buildMissingSpanItems } from "./autoGenMissingTeethSpans";

/**
 * Обрабатывает отсутствующие зубы на одной челюсти (All-on-4 или одиночные/мостовидные имплантаты).
 */
export function processJawMissingTeeth(
	jawTeethSeq: readonly number[],
	missingList: number[],
	jawName: "верхней" | "нижней",
	effectiveTeeth: readonly ToothData[],
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): { stage2Items: TreatmentPlanItem[]; stage3Items: TreatmentPlanItem[]; hasImplants: boolean } {
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];
	let hasImplants = false;

	const missingSet = new Set(missingList);
	if (missingSet.size === 0) {
		return { stage2Items, stage3Items, hasImplants };
	}

	// Тотальная адентия (> 10 отсутствующих зубов) -> All-on-4
	if (missingSet.size > 10) {
		hasImplants = true;
		const allOn4 = buildAllOn4Items(jawName, catalog, validDiscountPct, isDemo);
		return {
			stage2Items: allOn4.stage2,
			stage3Items: allOn4.stage3,
			hasImplants: true,
		};
	}

	const handledTeeth = new Set<number>();
	let i = 0;
	while (i < jawTeethSeq.length) {
		const tNum = jawTeethSeq[i]!;
		if (missingSet.has(tNum) && !handledTeeth.has(tNum)) {
			const currentSpan: number[] = [tNum];
			let j = i + 1;
			while (j < jawTeethSeq.length && missingSet.has(jawTeethSeq[j]!) && !handledTeeth.has(jawTeethSeq[j]!)) {
				currentSpan.push(jawTeethSeq[j]!);
				j++;
			}

			for (const t of currentSpan) handledTeeth.add(t);
			hasImplants = true;

			const spanRes = buildMissingSpanItems(currentSpan, effectiveTeeth, catalog, validDiscountPct, isDemo);
			stage2Items.push(...spanRes.stage2);
			stage3Items.push(...spanRes.stage3);
			i = j;
			continue;
		}
		i++;
	}

	return { stage2Items, stage3Items, hasImplants };
}
