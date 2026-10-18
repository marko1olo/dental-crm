import { roundToKopecks, parseRubAmount } from "../completedServicesPlan";
import type {
	ProcedureCategory,
	ClinicalEstimateItem,
	ClinicalVisitCompletionInput,
} from "./clinicalWorkflowTypes";
import { extractProceduresFromDiary } from "./clinicalDiaryProcedureExtractor";

export function collectWorkflowEstimateItems(input: ClinicalVisitCompletionInput): ClinicalEstimateItem[] {
	const extractedItems = extractProceduresFromDiary(input.diary);
	const planItems: ClinicalEstimateItem[] = [];

	if (Array.isArray(input.completedPlanItems)) {
		for (const p of input.completedPlanItems) {
			const price = parseRubAmount(p.unitPriceRub ?? p.price ?? 0) ?? 0;
			const qty = Number(p.quantity) > 0 ? Number(p.quantity) : 1;
			if (Number.isFinite(price) && price >= 0) {
				planItems.push({
					id: p.id || `plan-item-${planItems.length + 1}`,
					code: p.code || "A16.07.002",
					name: p.title || p.name || "Стоматологическая услуга",
					quantity: qty,
					priceRub: price,
					totalRub: roundToKopecks(price * qty),
					category: "therapy",
					toothNumber: p.toothNumber,
				});
			}
		}
	}

	const additional = input.additionalServices || [];
	const additionalCodes = new Set(additional.map((s) => s.code).filter(Boolean));
	const additionalCategories = new Set<ProcedureCategory>(
		additional.map((s) => s.category).filter((c): c is ProcedureCategory => Boolean(c) && c !== "other"),
	);
	const deduplicatedExtracted =
		additional.length > 0
			? extractedItems.filter(
					(item) =>
						!(item.code && additionalCodes.has(item.code)) &&
						!(item.category && additionalCategories.has(item.category)),
				)
			: extractedItems;

	const allItems: ClinicalEstimateItem[] = [
		...(planItems.length > 0 ? planItems : deduplicatedExtracted),
		...additional,
	];

	const isAborted =
		input.completionMode === "aborted" ||
		input.completionMode === "rescheduled" ||
		input.completionMode === "emergency_interrupted";

	if (allItems.length === 0 && !isAborted) {
		allItems.push({
			id: `est-cons-${Date.now()}`,
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога первичный",
			quantity: 1,
			priceRub: 1500,
			totalRub: 1500,
			category: "therapy",
		});
	}
	return allItems;
}
