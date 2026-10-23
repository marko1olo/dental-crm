/**
 * CLINICAL DENTAL WARRANTY ENGINE — RISK & RECOMMENDATION EVALUATION
 * Клиническая оценка соматики и гигиены полости рта (Закон РФ № 2300-1 и СтАР)
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import type { AppliedRiskFactor, WarrantyRiskFactors } from "./warrantyEngineTypes.js";
import type { WarrantyCategory } from "./warrantyPresets.js";

export interface EvaluatedRiskData {
	appliedFactors: AppliedRiskFactor[];
	clinicalRationale: string[];
	specialProvisions: string[];
	riskLevel: "low" | "moderate" | "high" | "critical";
	warrantyStatus: "full" | "conditional" | "reduced" | "void_risk";
	checkupIntervalMonths: number;
	totalRiskMultiplier: number;
}

export function evaluateClinicalRiskFactors(
	category: WarrantyCategory,
	standardInterval: number,
	rf?: WarrantyRiskFactors | undefined,
): EvaluatedRiskData {
	const appliedFactors: AppliedRiskFactor[] = [];
	const clinicalRationale: string[] = [];
	const specialProvisions: string[] = [];
	let totalMultiplier = 1.0;
	let checkupIntervalMonths = standardInterval;

	if (!rf) {
		return { appliedFactors, clinicalRationale, specialProvisions, riskLevel: "low", warrantyStatus: "full", checkupIntervalMonths, totalRiskMultiplier: 1.0 };
	}

	if (rf.hygieneScore <= 0.6) {
		appliedFactors.push({ factor: "Индекс OHI-S <= 0.6 (Отличная гигиена)", multiplier: 1.0, description: "Отличный уровень ухода. Риск кариеса минимален.", severity: "info" });
	} else if (rf.hygieneScore <= 1.2) {
		appliedFactors.push({ factor: "Индекс OHI-S 0.7–1.2 (Хорошая гигиена)", multiplier: 1.0, description: "Хорошая индивидуальная гигиена.", severity: "info" });
	} else if (rf.hygieneScore <= 1.8) {
		totalMultiplier *= 0.85;
		appliedFactors.push({ factor: "Индекс OHI-S 1.3–1.8 (Удовлетворительная)", multiplier: 0.85, description: "Умеренный налет. Риск краевой пигментации (-15%).", severity: "warning" });
		checkupIntervalMonths = Math.min(checkupIntervalMonths, 4);
	} else if (rf.hygieneScore <= 2.5) {
		totalMultiplier *= 0.65;
		appliedFactors.push({ factor: "Индекс OHI-S 1.9–2.5 (Неудовлетворительная)", multiplier: 0.65, description: "Обильный налет и камень. Высокий риск кариеса (-35%).", severity: "danger" });
		checkupIntervalMonths = Math.min(checkupIntervalMonths, 3);
	} else {
		totalMultiplier *= 0.5;
		appliedFactors.push({ factor: "Индекс OHI-S > 2.5 (Плохая гигиена)", multiplier: 0.5, description: "Критический уровень отложений. Условная гарантия (-50%).", severity: "danger" });
		checkupIntervalMonths = Math.min(checkupIntervalMonths, 3);
		specialProvisions.push("Условная гарантия: сохраняется только при нормализации гигиены.");
	}

	if (rf.bruxism) {
		if (rf.nightGuardUsed) {
			totalMultiplier *= 0.9;
			appliedFactors.push({ factor: "Бруксизм (с регулярным ношением ночной каппы)", multiplier: 0.9, description: "Гипертонус компенсируется каппой (-10%).", severity: "info" });
		} else {
			const m = category === "implant_fixture" || category === "removable_prosthesis" ? 0.75 : 0.6;
			totalMultiplier *= m;
			appliedFactors.push({ factor: "Бруксизм (без защитной ночной каппы)", multiplier: m, description: "Критическая ночная перегрузка конструкций (-40%).", severity: "danger" });
			specialProvisions.push("Настоятельно предписано ношение окклюзионного сплинт-аппарата.");
		}
	}

	if (rf.smoking === "light") {
		const m = category === "implant_fixture" || category === "periodontal_splinting" ? 0.85 : 0.95;
		totalMultiplier *= m;
		appliedFactors.push({ factor: "Курение табака (до 10 сигарет в день)", multiplier: m, description: "Умеренная вазоконстрикция слизистой.", severity: "warning" });
	} else if (rf.smoking === "heavy") {
		const m = category === "implant_fixture" ? 0.65 : 0.8;
		totalMultiplier *= m;
		appliedFactors.push({ factor: "Интенсивное курение (> 10 сигарет в день)", multiplier: m, description: "Риск периимплантита (-35%).", severity: "danger" });
		checkupIntervalMonths = Math.min(checkupIntervalMonths, 3);
	}

	if (rf.diabetes === "compensated") {
		totalMultiplier *= 0.9;
		appliedFactors.push({ factor: "Сахарный диабет (компенсированный)", multiplier: 0.9, description: "Удовлетворительный метаболический контроль (-10%).", severity: "info" });
	} else if (rf.diabetes === "decompensated") {
		const m = category === "implant_fixture" || category === "periodontal_splinting" ? 0.5 : 0.7;
		totalMultiplier *= m;
		appliedFactors.push({ factor: "Сахарный диабет (декомпенсированный)", multiplier: m, description: "Критический фактор риска остеоинтеграции (-50%).", severity: "danger" });
	}

	if (rf.periodontitis === "mild") {
		totalMultiplier *= 0.95;
		appliedFactors.push({ factor: "Хронический пародонтит легкой степени", multiplier: 0.95, description: "Начальная резорбция кости.", severity: "info" });
	} else if (rf.periodontitis === "moderate" || rf.periodontitis === "severe") {
		const m = rf.periodontitis === "severe" ? 0.55 : 0.8;
		totalMultiplier *= m;
		appliedFactors.push({ factor: `Хронический пародонтит ${rf.periodontitis === "severe" ? "тяжелой" : "средней"} степени`, multiplier: m, description: "Деструкция кости и подвижность зубов.", severity: "danger" });
		checkupIntervalMonths = 3;
		specialProvisions.push("Поддерживающее пародонтологическое наблюдение раз в 3 месяца.");
	}

	if (rf.osteoporosis && category === "implant_fixture") {
		totalMultiplier *= 0.75;
		appliedFactors.push({ factor: "Системный остеопороз / прием антирезорбтивных препаратов", multiplier: 0.75, description: "Снижение плотности трабекулярной кости (-25%).", severity: "warning" });
		specialProvisions.push("Динамический рентген-контроль зоны имплантации.");
	}

	const clampedMultiplier = Math.max(0.25, Math.min(1.2, totalMultiplier));
	const roundedMultiplier = Math.round(clampedMultiplier * 100) / 100;

	let riskLevel: "low" | "moderate" | "high" | "critical" = "low";
	let warrantyStatus: "full" | "conditional" | "reduced" | "void_risk" = "full";
	if (roundedMultiplier >= 0.9) { riskLevel = "low"; warrantyStatus = "full"; }
	else if (roundedMultiplier >= 0.7) { riskLevel = "moderate"; warrantyStatus = "conditional"; }
	else if (roundedMultiplier >= 0.5) { riskLevel = "high"; warrantyStatus = "reduced"; }
	else { riskLevel = "critical"; warrantyStatus = "void_risk"; }

	return { appliedFactors, clinicalRationale, specialProvisions, riskLevel, warrantyStatus, checkupIntervalMonths, totalRiskMultiplier: roundedMultiplier };
}
