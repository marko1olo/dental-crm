/**
 * First-Line Emergency Dosages (Adrenaline, Prednisolone, Dexamethasone, Diazepam)
 */

import type { EmergencyDosageResult } from '../emergencyModules/emergencyDrugTypes';

export function calculateAdrenalineDose(safeWeight: number, safeAge: number, isPediatric: boolean, isCardiacArrest: boolean): EmergencyDosageResult {
	if (isCardiacArrest) {
		const doseMg = isPediatric ? Math.min(1.0, +(safeWeight * 0.01).toFixed(2)) : 1.0;
		return {
			drugId: 'adrenaline_epi_01',
			drugNameRu: 'Адреналина гидрохлорид (Эпинефрин) 0.1%',
			concentrationRu: '1 мг/мл (0.1%)',
			routeRu: 'в/в болюсно (развести в 10 мл 0.9% NaCl) или в/м в бедро до венозного доступа',
			calculatedDoseMg: doseMg,
			calculatedVolumeMl: +doseMg.toFixed(2),
			numberOfAmpoules: Math.ceil(doseMg),
			instructionsRu: isPediatric
				? `СЛР у детей: 0.01 мг/кг (${doseMg.toFixed(2)} мл) в/в болюсно или в/м каждые 3–5 минут СЛР.`
				: 'СЛР у взрослых: 1 мг (1 мл) в/в каждые 3–5 минут СЛР с промыванием 20 мл 0.9% NaCl (или в/м в бедро).',
			repeatIntervalMinutes: 3,
			maxSingleDoseRu: '1 мг',
			contraindicationsRu: ['При остановке кровообращения абсолютных противопоказаний нет!'],
			isPediatricDose: isPediatric
		};
	}

	let doseMg: number;
	if (safeAge < 6 || safeWeight < 25) doseMg = 0.15;
	else if (safeAge < 12 || safeWeight < 45) doseMg = 0.3;
	else doseMg = 0.5;

	return {
		drugId: 'adrenaline_epi_01',
		drugNameRu: 'Адреналина гидрохлорид (Эпинефрин) 0.1%',
		concentrationRu: '1 мг/мл (0.1%)',
		routeRu: 'в/м в среднюю треть передне-боковой поверхности бедра',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: doseMg,
		numberOfAmpoules: 1,
		instructionsRu: `Ввести ${doseMg} мл (${doseMg} мг) строго внутримышечно в среднюю треть бедра. При отсутствии эффекта повторить через 5–15 минут.`,
		repeatIntervalMinutes: 5,
		maxSingleDoseRu: isPediatric ? '0.3 мг (0.3 мл)' : '0.5 мг (0.5 мл)',
		maxDailyDoseRu: 'До 1.5–2.0 мг при анафилаксии',
		contraindicationsRu: ['Не вводить в/в струйно неразведенный адреналин при сохраненном кровообращении!'],
		isPediatricDose: isPediatric
	};
}

export function calculatePrednisoloneDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const doseMg = isPediatric ? Math.min(120, Math.round(safeWeight * 2.5)) : safeWeight > 90 ? 150 : 120;
	const volMl = +(doseMg / 30).toFixed(1);
	const ampoules = Math.ceil(volMl);
	return {
		drugId: 'prednisolone_30mg',
		drugNameRu: 'Преднизолон 30 мг/мл',
		concentrationRu: '30 мг/мл (ампулы 1 мл)',
		routeRu: 'в/в струйно медленно или в/м',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: ampoules,
		instructionsRu: `Ввести ${doseMg} мг (${volMl} мл, ${ampoules} амп.) в/в струйно медленно (за 2–3 мин) на 10 мл 0.9% NaCl.`,
		maxSingleDoseRu: isPediatric ? '3 мг/кг (макс 120 мг)' : '150–200 мг',
		contraindicationsRu: ['При жизнеугрожающих состояниях противопоказаний нет'],
		isPediatricDose: isPediatric
	};
}

export function calculateDexamethasoneDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const doseMg = isPediatric ? Math.min(16, +(safeWeight * 0.4).toFixed(1)) : 12;
	const volMl = +(doseMg / 4).toFixed(1);
	return {
		drugId: 'dexamethasone_4mg',
		drugNameRu: 'Дексаметазон 4 мг/мл',
		concentrationRu: '4 мг/мл (ампулы 1 мл / 2 мл)',
		routeRu: 'в/в струйно или в/м',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: Math.ceil(volMl),
		instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) в/в струйно или в/м.`,
		maxSingleDoseRu: isPediatric ? '0.6 мг/кг (макс 16 мг)' : '20 мг',
		contraindicationsRu: ['При анафилаксии и шоке противопоказаний нет'],
		isPediatricDose: isPediatric
	};
}

export function calculateDiazepamDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const doseMg = isPediatric ? Math.min(10, +(safeWeight * 0.25).toFixed(1)) : 10;
	const volMl = +(doseMg / 5).toFixed(1);
	return {
		drugId: 'diazepam_relanium',
		drugNameRu: 'Диазепам (Реланиум / Сибазон) 0.5%',
		concentrationRu: '5 мг/мл (ампулы 2 мл = 10 мг)',
		routeRu: 'в/в медленно со скоростью не более 2.5 мг/мин',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: Math.ceil(volMl / 2),
		instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) в/в медленно за 2–3 минуты под контролем дыхания.`,
		maxSingleDoseRu: isPediatric ? '0.3 мг/кг (макс 10 мг)' : '10–20 мг',
		contraindicationsRu: ['Острая дыхательная недостаточность, миастения (кроме судорог)'],
		isPediatricDose: isPediatric
	};
}
