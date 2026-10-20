import type { RecallCycleType } from "./recallCycleTypes";

export function evaluateClinicalCycleSuggestion(clinicalData: {
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly monthsSinceImplantSurgery?: number | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasAligners?: boolean | undefined;
	readonly hasBracesOrAligners?: boolean | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly hasDeepCaries?: boolean | undefined;
	readonly decayedTeethCount?: number | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
	readonly hasActiveRetention?: boolean | undefined;
}): {
	readonly suggestedCycle: RecallCycleType;
	readonly reason: string;
	readonly recommendedIntervalValue: number;
	readonly recommendedIntervalMonths: number;
	readonly intervalUnit: "months" | "weeks";
} {
	if ((clinicalData.maxPocketDepthMm && clinicalData.maxPocketDepthMm >= 4) || clinicalData.hasBleedingOnProbing) {
		const pocketReason = clinicalData.maxPocketDepthMm ? ` (глубина ПК ${clinicalData.maxPocketDepthMm} мм)` : "";
		return { suggestedCycle: "periodontal_maintenance", reason: `Пародонтит${pocketReason}: поддерживающая терапия раз в 3–4 месяца.`, recommendedIntervalValue: 3, recommendedIntervalMonths: 3, intervalUnit: "months" };
	}
	if (clinicalData.hasImplants) {
		const months = clinicalData.monthsSinceImplantSurgery ?? 6;
		const val = months > 12 ? 6 : (months > 3 ? 4 : 3);
		return { suggestedCycle: "implant_monitoring", reason: "Контроль остеоинтеграции имплантатов.", recommendedIntervalValue: val, recommendedIntervalMonths: val, intervalUnit: "months" };
	}
	if (clinicalData.hasBraces) {
		return { suggestedCycle: "orthodontic_braces", reason: "Брекет-система: активация каждые 4 недели (28 дней).", recommendedIntervalValue: 4, recommendedIntervalMonths: 1, intervalUnit: "weeks" };
	}
	if (clinicalData.hasAligners) {
		return { suggestedCycle: "orthodontic_aligners", reason: "Элайнеры: ревизия трекинга каждые 6–8 недель.", recommendedIntervalValue: 6, recommendedIntervalMonths: 2, intervalUnit: "weeks" };
	}
	if (clinicalData.hasActiveRetention) {
		return { suggestedCycle: "orthodontic_retention", reason: "Ретенционный период: контроль фиксации ретейнеров каждые 3–6 месяцев.", recommendedIntervalValue: 3, recommendedIntervalMonths: 3, intervalUnit: "months" };
	}
	if (clinicalData.isChildUnder14) {
		return { suggestedCycle: "pediatric_fluoridation", reason: "Детский возраст: минерализация эмали каждые 3–4 месяца.", recommendedIntervalValue: 3, recommendedIntervalMonths: 3, intervalUnit: "months" };
	}
	if (clinicalData.hasDeepCaries || (clinicalData.decayedTeethCount ?? 0) >= 3) {
		return { suggestedCycle: "caries_high_risk", reason: `Высокий КПУ (${clinicalData.decayedTeethCount ?? "множественный"}). Ремотерапия и ревизия пломб каждые 3 месяца.`, recommendedIntervalValue: 3, recommendedIntervalMonths: 3, intervalUnit: "months" };
	}
	if (clinicalData.hasCrownsOrVeneers) {
		return { suggestedCycle: "prosthetic_check", reason: "Контроль окклюзии и краевого прилегания коронок/виниров каждые 6 месяцев.", recommendedIntervalValue: 6, recommendedIntervalMonths: 6, intervalUnit: "months" };
	}
	return { suggestedCycle: "standard_prophylaxis", reason: "Плановый профосмотр и гигиена каждые 6 месяцев.", recommendedIntervalValue: 6, recommendedIntervalMonths: 6, intervalUnit: "months" };
}
