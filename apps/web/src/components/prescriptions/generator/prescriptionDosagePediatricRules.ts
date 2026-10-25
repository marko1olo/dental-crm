/**
 * prescriptionDosagePediatricRules.ts — Pediatric Dosing & Age Contraindication Rules
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { DosageCalculationResult } from "./prescriptionDosageTypes";

export function getPediatricAmoxiclavDosage(weight: number): DosageCalculationResult {
	const dailyMg = Math.round(weight * 30);
	const singleMg = Math.round(dailyMg / 2);
	return {
		drugNameRu: "Амоксиклав (суспензия)",
		recommendedDosageRu: `${singleMg} мг (суспензия) 2 раза в день`,
		standardFrequencyRu: "2 раза в сутки каждые 12 часов во время еды",
		maxDailyDoseRu: `${dailyMg} мг/сутки (расчет 30–40 мг/кг/сут)`,
		isPediatric: true,
		warningRu: "Детям до 12 лет (или с массой менее 40 кг) рекомендуется диспергируемая форма или суспензия.",
		singleDoseMg: singleMg,
		maxDailyDoseMg: dailyMg,
	};
}

export function getPediatricIbuprofenDosage(weight: number): DosageCalculationResult {
	const singleMg = Math.round(weight * 10);
	const maxDailyMg = singleMg * 3;
	const singleMl = Number((weight / 2).toFixed(1));
	return {
		drugNameRu: "Ибупрофен (суспензия 100 мг / 5 мл)",
		recommendedDosageRu: `${singleMl} мл (${singleMg} мг) 3 раза в день`,
		standardFrequencyRu: "Каждые 6–8 часов после еды (макс. 3 раза в сутки)",
		maxDailyDoseRu: `${maxDailyMg} мг/сутки (расчет 30 мг/кг/сут)`,
		isPediatric: true,
		singleDoseMg: singleMg,
		maxDailyDoseMg: maxDailyMg,
	};
}

export function getNimesulideChildContraindication(): DosageCalculationResult {
	return {
		drugNameRu: "Нимесил (Нимесулид 100 мг)",
		recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 12 лет (ГРЛС Минздрава РФ)",
		standardFrequencyRu: "Не применять у детей младше 12 лет",
		maxDailyDoseRu: "0 мг (применяйте Ибупрофен или Парацетамол)",
		isPediatric: true,
		isContraindicated: true,
		contraindicationReason: "Нимесулид противопоказан детям в возрасте до 12 лет из-за риска гепатотоксичности (Приказ МЗ РФ).",
		warningRu: "Нимесулид ПРОТИВОПОКАЗАН детям до 12 лет! Назначьте ибупрофен или парацетамол.",
	};
}

export function getKetorolacChildContraindication(): DosageCalculationResult {
	return {
		drugNameRu: "Кеторолак (Кетанов 10 мг)",
		recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 16 лет (ГРЛС Минздрава РФ)",
		standardFrequencyRu: "Не применять у лиц младше 16 лет",
		maxDailyDoseRu: "0 мг (применяйте Ибупрофен)",
		isPediatric: true,
		isContraindicated: true,
		contraindicationReason: "Кеторолак противопоказан детям и подросткам до 16 лет из-за риска эрозивно-язвенных поражений ЖКТ и кровотечений.",
		warningRu: "Кеторолак противопоказан до 16 лет! Назначьте ибупрофен или парацетамол.",
	};
}

export function getCiprofloxacinChildContraindication(): DosageCalculationResult {
	return {
		drugNameRu: "Ципролет (Ципрофлоксацин 500 мг)",
		recommendedDosageRu: "ПРОТИВОПОКАЗАН детям и подросткам до 18 лет (ГРЛС Минздрава РФ)",
		standardFrequencyRu: "Не назначать лицам младше 18 лет",
		maxDailyDoseRu: "0 мг (применяйте Амоксиклав или Кларитромицин)",
		isPediatric: true,
		isContraindicated: true,
		contraindicationReason: "Ципрофлоксацин противопоказан детям и подросткам до 18 лет из-за риска артропатий и поражения суставного хряща.",
		warningRu: "Ципрофлоксацин противопоказан детям и подросткам до 18 лет из-за риска артропатий и поражения суставного хряща.",
	};
}

export function getArticaineChildDosage(weight: number, age?: number): DosageCalculationResult {
	if (age !== undefined && age < 4) {
		return {
			drugNameRu: "Артикаин + Эпинефрин 4%",
			recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 4 лет (ГРЛС Минздрава РФ)",
			standardFrequencyRu: "Не применять у детей младше 4 лет",
			maxDailyDoseRu: "0 мг (применяйте общую седацию или разрешенные возрастные препараты)",
			isPediatric: true,
			isContraindicated: true,
			contraindicationReason: "Артикаин противопоказан детям в возрасте до 4 лет ввиду отсутствия достаточного клинического опыта (ГРЛС Минздрава РФ).",
			maxCarpules: 0,
			singleDoseMg: 0,
			maxDailyDoseMg: 0,
			warningRu: "Артикаин противопоказан детям в возрасте до 4 лет ввиду отсутствия достаточного клинического опыта.",
		};
	}
	const maxMg = Math.round(weight * 5);
	const carpules = Math.max(1, Math.floor(maxMg / 68));
	return {
		drugNameRu: "Артикаин 4% с эпинефрином (детская дозировка)",
		recommendedDosageRu: `Инфильтрация/проводниковая: 0.5–1 карпула (макс. доза ${maxMg} мг, ~${(maxMg / 68).toFixed(1)} карп. по 1.7 мл при массе ${weight} кг)`,
		standardFrequencyRu: "Однократно местно при стоматологическом вмешательстве",
		maxDailyDoseRu: `${maxMg} мг (макс. 5 мг/кг)`,
		isPediatric: true,
		isContraindicated: false,
		singleDoseMg: 68,
		maxDailyDoseMg: maxMg,
		maxCarpules: carpules,
		warningRu: "Рекомендуется использовать раствор с пониженной концентрацией вазоконстриктора 1:200 000 (Ультракаин Д-С). Обязательна аспирационная проба.",
	};
}
