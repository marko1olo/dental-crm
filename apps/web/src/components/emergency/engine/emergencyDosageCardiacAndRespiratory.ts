/**
 * Cardiac & Respiratory Emergency Dosages (Salbutamol, Nitro, Captopril, Moxonidine, Aminophylline)
 */

import type { EmergencyDosageResult } from '../emergencyModules/emergencyDrugTypes';

export function calculateSalbutamolDose(): EmergencyDosageResult {
	return {
		drugId: 'salbutamol_spray',
		drugNameRu: 'Сальбутамол (Вентолин) дозированный аэрозоль',
		concentrationRu: '100 мкг/доза',
		routeRu: 'ингаляционно через рот (желательно со спейсером)',
		calculatedDoseMg: 0.4,
		calculatedVolumeMl: 4,
		numberOfAmpoules: 1,
		instructionsRu: 'Выполнить 2–4 ингаляционные дозы с задержкой дыхания на выдохе на 10 сек. Повтор через 15–20 мин.',
		repeatIntervalMinutes: 15,
		maxSingleDoseRu: '4 дозы (400 мкг)',
		contraindicationsRu: ['Тахиаритмии высокой градации'],
		isPediatricDose: false
	};
}

export function calculateNitroglycerinDose(): EmergencyDosageResult {
	return {
		drugId: 'nitroglycerin_sublingual',
		drugNameRu: 'Нитроглицерин 0.5 мг',
		concentrationRu: '0.5 мг таблетки сублингвальные / спрей 0.4 мг/доза',
		routeRu: 'сублингвально (под язык) до полного рассасывания',
		calculatedDoseMg: 0.5,
		calculatedVolumeMl: 1,
		numberOfAmpoules: 1,
		instructionsRu: 'Положить 1 таб (0.5 мг) под язык. При сохранении боли повторить через 5 мин. Принимать строго сидя!',
		repeatIntervalMinutes: 5,
		maxSingleDoseRu: '0.5 мг (1 таб)',
		contraindicationsRu: ['АД сист < 100 мм рт. ст.', 'Прием ингибиторов ФДЭ-5 в последние 24–48 ч!'],
		isPediatricDose: false
	};
}

export function calculateCaptoprilDose(): EmergencyDosageResult {
	return {
		drugId: 'captopril_sublingual',
		drugNameRu: 'Каптоприл (Капотен) 25 мг',
		concentrationRu: '25 мг таблетки',
		routeRu: 'сублингвально (под язык)',
		calculatedDoseMg: 25,
		calculatedVolumeMl: 1,
		numberOfAmpoules: 1,
		instructionsRu: 'Разжевать или положить под язык 1 таб 25 мг до полного растворения.',
		maxSingleDoseRu: '25–50 мг',
		contraindicationsRu: ['Беременность, ангионевротический отек в анамнезе'],
		isPediatricDose: false
	};
}

export function calculateMoxonidineDose(): EmergencyDosageResult {
	return {
		drugId: 'moxonidine_sublingual',
		drugNameRu: 'Моксонидин (Физиотенз) 0.2 мг',
		concentrationRu: '0.2 мг таблетки',
		routeRu: 'сублингвально (под язык)',
		calculatedDoseMg: 0.2,
		calculatedVolumeMl: 1,
		numberOfAmpoules: 1,
		instructionsRu: 'Положить под язык 1 таб 0.2 мг. При необходимости повторить через 30 мин.',
		maxSingleDoseRu: '0.4 мг',
		contraindicationsRu: ['Выраженная брадикардия (ЧСС < 50)'],
		isPediatricDose: false
	};
}

export function calculateAminophyllineDose(safeWeight: number, isPediatric: boolean): EmergencyDosageResult {
	const doseMg = isPediatric ? Math.min(240, Math.round(safeWeight * 4)) : 120;
	const volMl = +(doseMg / 24).toFixed(1);
	return {
		drugId: 'aminophylline_euphylline',
		drugNameRu: 'Эуфиллин (Аминофиллин) 2.4%',
		concentrationRu: '24 мг/мл (ампулы 5 мл / 10 мл)',
		routeRu: 'в/в медленно за 5–10 минут на 20 мл 0.9% NaCl',
		calculatedDoseMg: doseMg,
		calculatedVolumeMl: volMl,
		numberOfAmpoules: Math.ceil(volMl / 10),
		instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) медленно внутривенно строго за 5–10 минут.`,
		maxSingleDoseRu: isPediatric ? '5 мг/кг (макс 240 мг)' : '240 мг (10 мл 2.4%)',
		contraindicationsRu: ['Тяжелая гипотония, пароксизмальная тахикардия'],
		isPediatricDose: isPediatric
	};
}
