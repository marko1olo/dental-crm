/**
 * anesthesiaMrdDoseEval.ts
 * Evaluation of safe active dose, epinephrine gate, and safety zones.
 */

import type { MrdDrugSpecification, LimitingFactor, SafetyZone } from "./anesthesiaMrdCatalog.js";
import { calculateClarkFactor, calculateClarkDose, calculateYoungFactor, calculateYoungDose } from "./anesthesiaMrdFormulas.js";

export interface DoseEvalParams {
	drug: MrdDrugSpecification;
	weight: number;
	age: number | null;
	isPediatric: boolean;
	pediatricFormula?: "clark" | "young" | "direct_mg_kg" | undefined;
	isCardiacRisk: boolean;
	injectedActiveMg: number;
	injectedEpiMg: number;
}

export function evaluateSafeDose(p: DoseEvalParams): {
	maxSafeActiveMg: number;
	limitingFactor: LimitingFactor;
	limitingDesc: string;
} {
	let maxSafeActiveMg = 0;
	let limitingFactor: LimitingFactor = "patient_weight";
	let limitingDesc = `Лимит по массе тела (${p.weight} кг × ${p.drug.maxDoseMgPerKgAdult} мг/кг).`;

	if (p.isPediatric) {
		const formula = p.pediatricFormula ?? (p.age !== null && p.age <= 12 ? "young" : "clark");
		if (formula === "clark") {
			const factor = calculateClarkFactor(p.weight);
			maxSafeActiveMg = Math.min(calculateClarkDose(p.drug.absoluteMaxDoseMgAdult, p.weight), Math.round(p.weight * p.drug.maxDoseMgPerKgPediatric * 10) / 10);
			limitingFactor = "pediatric_clark";
			limitingDesc = `Педиатрический расчет по Кларку (${p.weight} кг / 70 кг = ${Math.round(factor * 100)}%).`;
		} else if (formula === "young" && p.age && p.age > 0) {
			const factor = calculateYoungFactor(p.age);
			maxSafeActiveMg = Math.min(calculateYoungDose(p.drug.absoluteMaxDoseMgAdult, p.age), Math.round(p.weight * p.drug.maxDoseMgPerKgPediatric * 10) / 10);
			limitingFactor = "pediatric_young";
			limitingDesc = `Педиатрический расчет по Янгу (${p.age} лет).`;
		} else {
			maxSafeActiveMg = Math.round(p.weight * p.drug.maxDoseMgPerKgPediatric * 10) / 10;
			limitingFactor = "pediatric_direct_mg_kg";
			limitingDesc = `Педиатрический расчет по весу (${p.weight} кг).`;
		}
	} else {
		const weightBased = Math.round(p.weight * p.drug.maxDoseMgPerKgAdult * 10) / 10;
		if (weightBased > p.drug.absoluteMaxDoseMgAdult) {
			maxSafeActiveMg = p.drug.absoluteMaxDoseMgAdult;
			limitingFactor = "absolute_max_cap";
			limitingDesc = `Лимит ограничен абсолютным максимумом (${p.drug.absoluteMaxDoseMgAdult} мг).`;
		} else {
			maxSafeActiveMg = weightBased;
			limitingFactor = "patient_weight";
			limitingDesc = `Лимит по массе тела (${p.weight} кг × ${p.drug.maxDoseMgPerKgAdult} мг/кг = ${weightBased} мг).`;
		}
	}
	return { maxSafeActiveMg, limitingFactor, limitingDesc };
}

export function evaluateSafetyZone(activePct: number, epiPct: number, isOverdose: boolean, hasContraindications: boolean): { safetyZone: SafetyZone; label: string; color: string } {
	const peak = Math.max(activePct, epiPct);
	if (hasContraindications || isOverdose || peak > 100) return { safetyZone: "red_stop", label: "СТОП / ОПАСНОСТЬ", color: "#ef4444" };
	if (peak > 85) return { safetyZone: "orange_warning", label: "ПРЕДЕЛ ДОЗЫ", color: "#f97316" };
	if (peak > 70) return { safetyZone: "yellow_caution", label: "ВНИМАНИЕ", color: "#eab308" };
	return { safetyZone: "green_safe", label: "БЕЗОПАСНО", color: "#10b981" };
}
