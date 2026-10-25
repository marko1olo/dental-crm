/**
 * @dental/shared/anesthesia/safetyModules/safetyZoneEvaluator.ts
 * Safety zone classification & clinical diary note synthesis (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaCalculationInput, AnesthesiaDrugSpec, AnesthesiaSafetyZone } from "../types.js";

export function evaluateSafetyZone(
	isBlocked: boolean,
	isOverdose: boolean,
	isEpinephrineOverdose: boolean,
	peakUtilizationPercent: number,
): AnesthesiaSafetyZone {
	if (isBlocked || isOverdose || isEpinephrineOverdose || peakUtilizationPercent > 100) {
		return "overdose_danger";
	}
	if (peakUtilizationPercent > 85) return "warning";
	if (peakUtilizationPercent > 65) return "caution";
	return "safe";
}

export function generateClinicalAdviceRu(safetyZone: AnesthesiaSafetyZone, isBlocked: boolean, percentOfMaxDose: number): string {
	if (safetyZone === "overdose_danger") {
		return isBlocked
			? "Введение противопоказано! Переключите препарат на безопасную альтернативу."
			: "Опасность передозировки! Уменьшите количество карпул.";
	}
	if (safetyZone === "warning") return "Внимание: доза близка к предельной. Повторные инъекции ограничены.";
	if (safetyZone === "caution") return "Умеренная нагрузка. Рекомендуется мониторинг гемодинамики.";
	return `Дозировка безопасна (${percentOfMaxDose}% от МРД).`;
}

export function synthesizeAnesthesiaDiaryText(params: {
	input: AnesthesiaCalculationInput;
	drug: AnesthesiaDrugSpec;
	carpules: number;
	injectedVolumeMl: number;
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	weight: number;
	maxSafeActiveMg: number;
	maxSafeCarpulesCount: number;
	effectiveMaxMgPerKg: number;
	isCardioRestricted: boolean;
	isPediatric: boolean;
}): string {
	const { input, drug, carpules, injectedVolumeMl, injectedActiveMg, injectedEpinephrineMg, weight, maxSafeActiveMg, maxSafeCarpulesCount, effectiveMaxMgPerKg, isCardioRestricted, isPediatric } = params;
	const toothPart = input.targetToothFdi ? ` в области зуба ${input.targetToothFdi}` : "";
	const aspPart = input.aspirationConfirmed === false ? "Аспирационная проба не проводилась." : "Аспирационная проба отрицательна (кровь в карпуле отсутствует).";
	const epiText = !drug.isAdrenalineFree ? `, вазоконстриктор ${drug.vasoconstrictorNameRu} (${injectedEpinephrineMg.toFixed(3)} мг)` : ", без вазоконстриктора";
	const cardioText = isCardioRestricted ? " [Кардиоконтроль: адреналин ≤ 0.04 мг]" : "";
	const pediaText = isPediatric ? ` [Педиатрический расчет: ${effectiveMaxMgPerKg} мг/кг]` : "";
	const batchPart = input.carpuleBatch?.seriesNumber ? ` [Серия: ${input.carpuleBatch.seriesNumber}, Годен до: ${input.carpuleBatch.expirationDate}]` : "";
	const nursePart = input.nurseFullName ? ` Медсестра/ассистент: ${input.nurseFullName}.` : "";
	const vitalsPart = typeof input.bpSystolic === "number" && typeof input.heartRateBpm === "number"
		? ` Исходные гемодинамические показатели: АД ${input.bpSystolic}/${input.bpDiastolic ?? 80} мм рт. ст., ЧСС ${input.heartRateBpm} уд/мин.`
		: "";

	return `Проведена местная анестезия${toothPart}. Препарат: «${drug.tradeNamesRu[0]}» (${drug.activeSubstanceRu})${batchPart}, объем ${injectedVolumeMl} мл (${carpules} карп., ${injectedActiveMg} мг действ. в-ва${epiText}). МРД для пациента ${weight} кг: ${maxSafeActiveMg} мг (${maxSafeCarpulesCount} карп.)${cardioText}${pediaText}.${vitalsPart} ${aspPart} Анестезия наступила через ${drug.onsetMinutes} мин, глубина достаточная, соматических реакций нет.${nursePart}`;
}
