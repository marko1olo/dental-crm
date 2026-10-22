/**
 * Lipid Rescue Kinematics & Calculations (Layer 2)
 * ASRA Lipid Rescue 20% protocol for local anesthetic systemic toxicity.
 */

import type { LipidRescueDoseCalculation } from '../emergencyModules/emergencyDrugTypes';

export function calculateLipidRescueDoses(weightKg: number): LipidRescueDoseCalculation {
	const safeWeight = Math.max(10, Math.min(200, weightKg));
	const bolusMl = +(safeWeight * 1.5).toFixed(1);
	const infusionRateMin = +(safeWeight * 0.25).toFixed(1);
	const infusionRateHour = Math.round(safeWeight * 15);
	const maxTotalMl = Math.round(safeWeight * 12);

	return {
		weightKg: safeWeight,
		bolusVolumeMl: bolusMl,
		bolusDurationMinutes: 2,
		repeatBolusVolumeMl: bolusMl,
		maxRepeatBoluses: 2,
		infusionRateMlPerMin: infusionRateMin,
		infusionRateMlPerHour: infusionRateHour,
		maxTotalDoseMl: maxTotalMl,
		protocolInstructionsRu:
			`1. НАЧАЛЬНЫЙ БОЛЮС: Ввести ${bolusMl} мл 20% липидной эмульсии (Липофундин 20%) в/в за 1–2 мин.\n` +
			`2. ПОСТОЯННАЯ ИНФУЗИЯ: Сразу начать инфузию со скоростью ${infusionRateMin} мл/мин (${infusionRateHour} мл/час).\n` +
			`3. ПОВТОРНЫЙ БОЛЮС: При сохранении нестабильности повторить болюс ${bolusMl} мл через 5 мин (до 2 раз) и удвоить скорость инфузии до ${(infusionRateMin * 2).toFixed(1)} мл/мин.\n` +
			`4. МАКСИМАЛЬНАЯ ДОЗА: Не превышать ${maxTotalMl} мл суммарно (12 мл/кг). Продолжать инфузию не менее 15 мин после стабилизации гемодинамики.`
	};
}
