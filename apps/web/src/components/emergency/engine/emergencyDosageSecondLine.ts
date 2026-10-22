/**
 * Second-Line Emergency Dosages (Glucose, Lipid, Suprastin, Atropine, etc.)
 */

import type { EmergencyDosageResult } from '../emergencyModules/emergencyDrugTypes';
export {
	calculateSalbutamolDose,
	calculateNitroglycerinDose,
	calculateCaptoprilDose,
	calculateMoxonidineDose,
	calculateAminophyllineDose
} from './emergencyDosageCardiacAndRespiratory';

export function calculateGlucoseDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const volMl = isPediatric ? Math.min(60, Math.round(safeWeight * 2)) : 40;
	const doseGrams = +(volMl * 0.4).toFixed(1);
	return {
		drugId: 'glucose_dextrose_40',
		drugNameRu: 'Раствор Глюкозы (Декстрозы) 40%',
		concentrationRu: '400 мг/мл (ампулы 10 мл / 20 мл)',
		routeRu: 'в/в струйно',
		calculatedDoseMg: doseGrams * 1000,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: Math.ceil(volMl / 20),
		instructionsRu: `Ввести ${volMl} мл 40% глюкозы (${doseGrams} г) в/в струйно до восстановления сознания.`,
		maxSingleDoseRu: isPediatric ? '2 мл/кг 40% (макс 60 мл)' : '60–100 мл 40%',
		contraindicationsRu: ['Гипергликемическая кома'],
		isPediatricDose: isPediatric
	};
}

export function calculateLipidDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const bolusMl = +(safeWeight * 1.5).toFixed(1);
	return {
		drugId: 'lipid_emulsion_20',
		drugNameRu: 'Липидная эмульсия 20% (Липофундин / Интралипид 20%)',
		concentrationRu: '200 мг/мл (флаконы 100 / 250 / 500 мл)',
		routeRu: 'в/в болюсно за 1–2 мин, затем непрерывная инфузия',
		calculatedDoseMg: bolusMl * 200,
		calculatedVolumeMl: bolusMl,
		numberOfAmpoules: Math.ceil(bolusMl / 100),
		instructionsRu: `БОЛЮС: ввести ${bolusMl} мл в/в за 1–2 мин. Затем инфузия ${(safeWeight * 0.25).toFixed(1)} мл/мин (${Math.round(safeWeight * 15)} мл/час).`,
		maxDailyDoseRu: `Максимум 12 мл/кг (${Math.round(safeWeight * 12)} мл суммарно)`,
		contraindicationsRu: ['Тяжелые нарушения липидного обмена (при LAST жизнеспасающий антидот)'],
		isPediatricDose: isPediatric
	};
}

export function calculateSuprastinDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const volMl = isPediatric ? (safeWeight < 20 ? 0.5 : 1.0) : 1.0;
	const doseMg = volMl * 20;
	return {
		drugId: 'suprastin_2_percent',
		drugNameRu: 'Супрастин (Хлоропирамин) 2%',
		concentrationRu: '20 мг/мл (ампулы 1 мл = 20 мг)',
		routeRu: 'в/м глубоко (или медленно в/в после стабилизации гемодинамики)',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: Math.ceil(volMl),
		instructionsRu: `Ввести ${volMl} мл (${doseMg} мг) глубоко внутримышечно. ВНИМАНИЕ: вводить только ПОСЛЕ адреналина!`,
		maxSingleDoseRu: isPediatric ? '1 мл (20 мг)' : '2 мл (40 мг)',
		contraindicationsRu: ['Острый приступ бронхиальной астмы (сгущает мокроту)'],
		isPediatricDose: isPediatric
	};
}

export function calculateAtropineDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const doseMg = isPediatric ? Math.min(0.5, +(safeWeight * 0.02).toFixed(2)) : 0.5;
	const volMl = +(doseMg / 1.0).toFixed(2);
	return {
		drugId: 'atropine_01',
		drugNameRu: 'Атропина сульфат 0.1%',
		concentrationRu: '1 мг/мл (0.1%, ампулы 1 мл)',
		routeRu: 'в/в струйно или п/к',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: 1,
		instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) в/в струйно при брадикардии (ЧСС < 50).`,
		maxSingleDoseRu: '1.0 мг',
		contraindicationsRu: ['Тахикардия, глаукома'],
		isPediatricDose: isPediatric
	};
}
