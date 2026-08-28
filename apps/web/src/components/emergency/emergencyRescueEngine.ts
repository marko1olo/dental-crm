/**
 * Russian Dental Resuscitation & Emergency Pharmacology Engine (Минздрав РФ / ФАР / ERC / AHA)
 * Weight-adjusted dosage calculations, Lipid rescue kinematics, CPR Metronome (30:2),
 * Adrenaline re-injection timer, Form 043/u & SMP Handover protocol generator.
 */

import { EmergencyScenarioId, EMERGENCY_SCENARIOS } from './emergencyRescuePresets';

export type EmergencyDrugId =
	| 'adrenaline_epi_01'
	| 'prednisolone_30mg'
	| 'dexamethasone_4mg'
	| 'diazepam_relanium'
	| 'glucose_dextrose_40'
	| 'lipid_emulsion_20'
	| 'salbutamol_spray'
	| 'nitroglycerin_sublingual'
	| 'captopril_sublingual'
	| 'moxonidine_sublingual'
	| 'aminophylline_euphylline'
	| 'suprastin_2_percent'
	| 'atropine_01';

export interface EmergencyDosageResult {
	drugId: EmergencyDrugId;
	drugNameRu: string;
	concentrationRu: string;
	routeRu: string;
	calculatedDoseMg: number;
	calculatedVolumeMl: number;
	numberOfAmpoules: number;
	instructionsRu: string;
	repeatIntervalMinutes?: number | undefined;
	maxSingleDoseRu?: string | undefined;
	maxDailyDoseRu?: string | undefined;
	contraindicationsRu: string[];
	isPediatricDose: boolean;
}

export interface LipidRescueDoseCalculation {
	weightKg: number;
	bolusVolumeMl: number;
	bolusDurationMinutes: number;
	repeatBolusVolumeMl: number;
	maxRepeatBoluses: number;
	infusionRateMlPerMin: number;
	infusionRateMlPerHour: number;
	maxTotalDoseMl: number;
	protocolInstructionsRu: string;
}

export interface StatutoryEmergencyKitItem {
	readonly drugId: EmergencyDrugId;
	readonly tradeNameRu: string;
	readonly dosageStandardRu: string;
	readonly routeRu: string;
	readonly indicationsRu: string;
	readonly statutoryOrderRu: string;
}

export const STATUTORY_EMERGENCY_KIT_MEMO: readonly StatutoryEmergencyKitItem[] = [
	{
		drugId: 'adrenaline_epi_01',
		tradeNameRu: 'Адреналин (Эпинефрин) 0.1% (1 мг/мл)',
		dosageStandardRu: 'Взрослые: 0.5 мл (0.5 мг) в/м; Дети: 0.01 мг/кг (макс 0.3 мг)',
		routeRu: 'В/м в среднюю треть переднебоковой поверхности бедра',
		indicationsRu: 'Анафилактический шок, ангионевротический отек гортани, асистолия при СЛР',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11), КР345',
	},
	{
		drugId: 'prednisolone_30mg',
		tradeNameRu: 'Преднизолон 30 мг/мл (ампулы 1 мл)',
		dosageStandardRu: 'Взрослые: 90–120 мг (3–4 амп.) в/в или в/м; Дети: 2–3 мг/кг',
		routeRu: 'В/в струйно медленно на 10 мл 0.9% NaCl или в/м',
		indicationsRu: 'Анафилаксия (2-я линия), тяжелый бронхоспазм, токсико-аллергические реакции',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н, 1144н',
	},
	{
		drugId: 'suprastin_2_percent',
		tradeNameRu: 'Супрастин (Хлоропирамин) 2% (20 мг/мл)',
		dosageStandardRu: 'Взрослые: 20 мг (1 мл) в/в или в/м; Дети: 0.25–0.5 мл',
		routeRu: 'В/в медленно или в/м глубоко',
		indicationsRu: 'Генерализованная крапивница, отек Квинке, зудящий дерматоз',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11)',
	},
];

export interface EmergencyVitals {
	bpSystolic: number;
	bpDiastolic: number;
	hr: number;
	spo2: number;
	rr: number; // Respiratory rate
	consciousnessRu: string; // e.g. "В сознании", "Спутанное", "Сопор", "Кома"
	glucoseMmolL?: number | undefined;
}

export interface ExecutedEmergencyStep {
	stepId: string;
	stepTitleRu: string;
	timestamp: string;
	administeredMedicationRu?: string | undefined;
	doseDetailsRu?: string | undefined;
}

export interface EmergencyIncidentInput {
	clinicName: string;
	clinicAddress: string;
	cabinetNumber: string;
	doctorFullName: string;
	assistantFullName?: string | undefined;
	patientFullName: string;
	patientAgeYears: number;
	patientWeightKg: number;
	patientGender: 'male' | 'female';
	medCardNumber: string;
	scenarioId: EmergencyScenarioId;
	incidentStartTime: Date | string;
	incidentEndTime?: Date | string | undefined;
	smpCallTime?: Date | string | undefined;
	smpArrivalTime?: Date | string | undefined;
	smpBrigadeNumber?: string | undefined;
	initialVitals: EmergencyVitals;
	finalVitals?: EmergencyVitals | undefined;
	completedSteps: ExecutedEmergencyStep[];
	patientOutcomeRu: string;
	handoverNotesRu?: string | undefined;
}

// ---------------------------------------------------------------------------
// 1. Weight-Adjusted Dosage Calculations
// ---------------------------------------------------------------------------

export function calculateWeightAdjustedDose(
	drugId: EmergencyDrugId,
	weightKg: number,
	ageYears: number,
	isCardiacArrest = false
): EmergencyDosageResult {
	const safeWeight = Math.max(5, Math.min(250, weightKg));
	const safeAge = Math.max(1, Math.min(120, ageYears));
	const isPediatric = safeAge < 18 || safeWeight < 40;

	switch (drugId) {
		case 'adrenaline_epi_01': {
			// Solution: 0.1% (1 mg/ml)
			if (isCardiacArrest) {
				const doseMg = isPediatric ? Math.min(1.0, +(safeWeight * 0.01).toFixed(2)) : 1.0;
				const volMl = doseMg; // 1 mg/ml
				return {
					drugId,
					drugNameRu: 'Адреналина гидрохлорид (Эпинефрин) 0.1%',
					concentrationRu: '1 мг/мл (0.1%)',
					routeRu: 'в/в болюсно (развести в 10 мл 0.9% NaCl) или внутрикостно',
					calculatedDoseMg: doseMg,
					calculatedVolumeMl: +volMl.toFixed(2),
					numberOfAmpoules: Math.ceil(volMl),
					instructionsRu: isPediatric
						? `СЛР у детей: 0.01 мг/кг (${volMl.toFixed(2)} мл) в/в каждые 3–5 минут СЛР.`
						: 'СЛР у взрослых: 1 мг (1 мл) в/в каждые 3–5 минут СЛР с промыванием 20 мл 0.9% NaCl.',
					repeatIntervalMinutes: 3,
					maxSingleDoseRu: isPediatric ? '1 мг' : '1 мг',
					contraindicationsRu: ['При остановке кровообращения абсолютных противопоказаний нет!'],
					isPediatricDose: isPediatric
				};
			}

			// Anaphylaxis intramuscular dose
			let doseMg: number;
			let volMl: number;
			if (safeAge < 6 || safeWeight < 25) {
				doseMg = 0.15;
				volMl = 0.15;
			} else if (safeAge < 12 || safeWeight < 45) {
				doseMg = 0.3;
				volMl = 0.3;
			} else {
				doseMg = 0.5;
				volMl = 0.5;
			}

			return {
				drugId,
				drugNameRu: 'Адреналина гидрохлорид (Эпинефрин) 0.1%',
				concentrationRu: '1 мг/мл (0.1%)',
				routeRu: 'в/м в среднюю треть передне-боковой поверхности бедра',
				calculatedDoseMg: doseMg,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: 1,
				instructionsRu: `Ввести ${volMl} мл (${doseMg} мг) строго внутримышечно в среднюю треть бедра. При отсутствии эффекта повторить через 5–15 минут.`,
				repeatIntervalMinutes: 5,
				maxSingleDoseRu: isPediatric ? '0.3 мг (0.3 мл)' : '0.5 мг (0.5 мл)',
				maxDailyDoseRu: 'До 1.5–2.0 мг при анафилаксии',
				contraindicationsRu: ['Не вводить в/в струйно неразведенный адреналин при сохраненном кровообращении!'],
				isPediatricDose: isPediatric
			};
		}

		case 'prednisolone_30mg': {
			// Concentration: 30 mg/ml (ampoules 1 ml = 30 mg)
			let doseMg: number;
			if (isPediatric) {
				doseMg = Math.min(120, Math.round(safeWeight * 2.5)); // 2–3 mg/kg
			} else if (safeWeight > 90) {
				doseMg = 150;
			} else {
				doseMg = 120;
			}
			const volMl = +(doseMg / 30).toFixed(1);
			const ampoules = Math.ceil(volMl);

			return {
				drugId,
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

		case 'dexamethasone_4mg': {
			// Concentration: 4 mg/ml (ampoules 1 ml = 4 mg)
			let doseMg: number;
			if (isPediatric) {
				doseMg = Math.min(16, +(safeWeight * 0.4).toFixed(1)); // 0.3-0.5 mg/kg
			} else {
				doseMg = 12; // 8-16 mg
			}
			const volMl = +(doseMg / 4).toFixed(1);
			const ampoules = Math.ceil(volMl);

			return {
				drugId,
				drugNameRu: 'Дексаметазон 4 мг/мл',
				concentrationRu: '4 мг/мл (ампулы 1 мл / 2 мл)',
				routeRu: 'в/в струйно или в/м',
				calculatedDoseMg: doseMg,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: ampoules,
				instructionsRu: `Ввести ${doseMg} мг (${volMl} мл, ${ampoules} амп.) в/в струйно или в/м.`,
				maxSingleDoseRu: isPediatric ? '0.6 мг/кг (макс 16 мг)' : '20 мг',
				contraindicationsRu: ['При анафилаксии и шоке противопоказаний нет'],
				isPediatricDose: isPediatric
			};
		}

		case 'diazepam_relanium': {
			// Concentration: 5 mg/ml (0.5%, ampoules 2 ml = 10 mg)
			let doseMg: number;
			if (isPediatric) {
				doseMg = Math.min(10, +(safeWeight * 0.25).toFixed(1)); // 0.2-0.3 mg/kg
			} else {
				doseMg = 10;
			}
			const volMl = +(doseMg / 5).toFixed(1);
			const ampoules = Math.ceil(volMl / 2);

			return {
				drugId,
				drugNameRu: 'Диазепам (Реланиум / Сибазон) 0.5%',
				concentrationRu: '5 мг/мл (ампулы 2 мл = 10 мг)',
				routeRu: 'в/в медленно со скоростью не более 2.5 мг/мин',
				calculatedDoseMg: doseMg,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: ampoules,
				instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) в/в медленно за 2–3 минуты под контролем дыхания. Готовность к ИВЛ мешком Амбу при угнетении дыхания.`,
				maxSingleDoseRu: isPediatric ? '0.3 мг/кг (макс 10 мг)' : '10–20 мг',
				contraindicationsRu: ['Острая дыхательная недостаточность, миастения (кроме жизнеугрожающих судорог)'],
				isPediatricDose: isPediatric
			};
		}

		case 'glucose_dextrose_40': {
			// 40% glucose (400 mg/ml)
			let volMl: number;
			let doseGrams: number;
			if (isPediatric) {
				volMl = Math.min(60, Math.round(safeWeight * 2)); // 2 ml/kg 40% or 4 ml/kg 20%
				doseGrams = +(volMl * 0.4).toFixed(1);
			} else {
				volMl = 40; // 20-60 ml
				doseGrams = 16;
			}

			return {
				drugId,
				drugNameRu: 'Раствор Глюкозы (Декстрозы) 40%',
				concentrationRu: '400 мг/мл (ампулы 10 мл / 20 мл)',
				routeRu: 'в/в струйно',
				calculatedDoseMg: doseGrams * 1000,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: Math.ceil(volMl / 20),
				instructionsRu: `Ввести ${volMl} мл 40% глюкозы (${doseGrams} г глюкозы) внутривенно струйно до восстановления ясного сознания.`,
				maxSingleDoseRu: isPediatric ? '2 мл/кг 40% (макс 60 мл)' : '60–100 мл 40%',
				contraindicationsRu: ['Гипергликемическая кома (проверить экспресс-глюкометром перед введением!)'],
				isPediatricDose: isPediatric
			};
		}

		case 'lipid_emulsion_20': {
			// 20% lipid emulsion (Lipofundin / Intralipid 200 mg/ml)
			const bolusMl = +(safeWeight * 1.5).toFixed(1);
			return {
				drugId,
				drugNameRu: 'Липидная эмульсия 20% (Липофундин / Интралипид 20%)',
				concentrationRu: '200 мг/мл (флаконы 100 / 250 / 500 мл)',
				routeRu: 'в/в болюсно за 1–2 мин, затем непрерывная инфузия',
				calculatedDoseMg: bolusMl * 200,
				calculatedVolumeMl: bolusMl,
				numberOfAmpoules: Math.ceil(bolusMl / 100),
				instructionsRu: `БОЛЮС: ввести ${bolusMl} мл в/в за 1–2 мин. Затем инфузия ${(safeWeight * 0.25).toFixed(1)} мл/мин (${Math.round(safeWeight * 15)} мл/час). При нестабильности повторить болюс через 5 мин.`,
				maxDailyDoseRu: `Максимум 12 мл/кг (${Math.round(safeWeight * 12)} мл суммарно)`,
				contraindicationsRu: ['Тяжелые нарушения липидного обмена (при LAST жизнеспасающий антидот, противопоказаний нет)'],
				isPediatricDose: isPediatric
			};
		}

		case 'salbutamol_spray': {
			return {
				drugId,
				drugNameRu: 'Сальбутамол (Вентолин) дозированный аэрозоль',
				concentrationRu: '100 мкг/доза',
				routeRu: 'ингаляционно через рот (желательно со спейсером)',
				calculatedDoseMg: 0.4,
				calculatedVolumeMl: 4, // 4 doses
				numberOfAmpoules: 1,
				instructionsRu: 'Выполнить 2–4 ингаляционные дозы с задержкой дыхания на выдохе на 10 сек. При необходимости повторить через 15–20 минут.',
				repeatIntervalMinutes: 15,
				maxSingleDoseRu: '4 дозы (400 мкг)',
				maxDailyDoseRu: '8–12 доз в сутки',
				contraindicationsRu: ['Тахиаритмии высокой градации, гиперчувствительность'],
				isPediatricDose: false
			};
		}

		case 'nitroglycerin_sublingual': {
			return {
				drugId,
				drugNameRu: 'Нитроглицерин 0.5 мг',
				concentrationRu: '0.5 мг таблетки сублингвальные / спрей 0.4 мг/доза',
				routeRu: 'сублингвально (под язык) до полного рассасывания',
				calculatedDoseMg: 0.5,
				calculatedVolumeMl: 1, // 1 tab
				numberOfAmpoules: 1,
				instructionsRu: 'Положить 1 таб (0.5 мг) под язык. При сохранении боли повторить через 5 мин (макс 3 дозы за 15 мин). Принимать строго сидя!',
				repeatIntervalMinutes: 5,
				maxSingleDoseRu: '0.5 мг (1 таб)',
				maxDailyDoseRu: '3 таблетки суммарно за приступ',
				contraindicationsRu: [
					'Систолическое АД < 90–100 мм рт. ст.',
					'Прием ингибиторов ФДЭ-5 (Силденафил, Тадалафил, Варденафил) в течение последних 24–48 часов (смертельный риск рефрактерного коллапса!)',
					'Инфаркт миокарда правого желудочка'
				],
				isPediatricDose: false
			};
		}

		case 'captopril_sublingual': {
			return {
				drugId,
				drugNameRu: 'Каптоприл (Капотен) 25 мг',
				concentrationRu: '25 мг таблетки',
				routeRu: 'сублингвально (под язык)',
				calculatedDoseMg: 25,
				calculatedVolumeMl: 1, // 1 tab
				numberOfAmpoules: 1,
				instructionsRu: 'Разжевать или положить под язык 1 таб 25 мг до полного растворения. Контроль АД каждые 10 мин.',
				maxSingleDoseRu: '25–50 мг',
				maxDailyDoseRu: '100 мг',
				contraindicationsRu: ['Беременность, двусторонний стеноз почечных артерий, ангионевротический отек в анамнезе'],
				isPediatricDose: false
			};
		}

		case 'moxonidine_sublingual': {
			return {
				drugId,
				drugNameRu: 'Моксонидин (Физиотенз) 0.2 мг',
				concentrationRu: '0.2 мг таблетки',
				routeRu: 'сублингвально (под язык)',
				calculatedDoseMg: 0.2,
				calculatedVolumeMl: 1, // 1 tab
				numberOfAmpoules: 1,
				instructionsRu: 'Положить под язык 1 таб 0.2 мг. При недостаточном эффекте через 30 мин принять еще 0.2 мг.',
				maxSingleDoseRu: '0.4 мг',
				maxDailyDoseRu: '0.6 мг',
				contraindicationsRu: ['Выраженная брадикардия (ЧСС < 50 уд/мин), синдром слабости синусового узла, AV-блокада II-III степени'],
				isPediatricDose: false
			};
		}

		case 'aminophylline_euphylline': {
			// 2.4% (24 mg/ml)
			let doseMg: number;
			if (isPediatric) {
				doseMg = Math.min(240, Math.round(safeWeight * 4)); // 3-5 mg/kg
			} else {
				doseMg = 120; // 5-10 ml = 120-240 mg
			}
			const volMl = +(doseMg / 24).toFixed(1);

			return {
				drugId,
				drugNameRu: 'Эуфиллин (Аминофиллин) 2.4%',
				concentrationRu: '24 мг/мл (ампулы 5 мл / 10 мл)',
				routeRu: 'в/в медленно капельно или струйно за 5–10 минут на 20 мл 0.9% NaCl',
				calculatedDoseMg: doseMg,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: Math.ceil(volMl / 10),
				instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) медленно внутривенно на 10–20 мл 0.9% NaCl строго за 5–10 минут под контролем пульса и АД.`,
				maxSingleDoseRu: isPediatric ? '5 мг/кг (макс 240 мг)' : '240 мг (10 мл 2.4%)',
				contraindicationsRu: ['Тяжелая артериальная гипотония, пароксизмальная тахикардия, частая экстрасистолия, инфаркт миокарда'],
				isPediatricDose: isPediatric
			};
		}

		case 'suprastin_2_percent': {
			// 2% (20 mg/ml)
			let volMl: number;
			let doseMg: number;
			if (isPediatric) {
				volMl = safeWeight < 20 ? 0.5 : 1.0;
				doseMg = volMl * 20;
			} else {
				volMl = 1.0; // 1-2 ml
				doseMg = 20;
			}

			return {
				drugId,
				drugNameRu: 'Супрастин (Хлоропирамин) 2%',
				concentrationRu: '20 мг/мл (ампулы 1 мл = 20 мг)',
				routeRu: 'в/м глубоко (или медленно в/в после стабилизации гемодинамики)',
				calculatedDoseMg: doseMg,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: Math.ceil(volMl),
				instructionsRu: `Ввести ${volMl} мл (${doseMg} мг) глубоко внутримышечно. ВНИМАНИЕ: вводить только ПОСЛЕ адреналина и стабилизации АД!`,
				maxSingleDoseRu: isPediatric ? '1 мл (20 мг)' : '2 мл (40 мг)',
				contraindicationsRu: ['Острый приступ бронхиальной астмы (сгущает мокроту), закрытоугольная глаукома, задержка мочи'],
				isPediatricDose: isPediatric
			};
		}

		case 'atropine_01': {
			// 0.1% (1 mg/ml)
			let doseMg: number;
			if (isPediatric) {
				doseMg = Math.min(0.5, +(safeWeight * 0.02).toFixed(2));
			} else {
				doseMg = 0.5; // 0.5-1.0 mg
			}
			const volMl = +(doseMg / 1.0).toFixed(2);

			return {
				drugId,
				drugNameRu: 'Атропина сульфат 0.1%',
				concentrationRu: '1 мг/мл (0.1%, ампулы 1 мл)',
				routeRu: 'в/в струйно или п/к',
				calculatedDoseMg: doseMg,
				calculatedVolumeMl: volMl,
				numberOfAmpoules: 1,
				instructionsRu: `Ввести ${doseMg} мг (${volMl} мл) в/в струйно при гемодинамически значимой брадикардии (ЧСС < 45–50 уд/мин).`,
				maxSingleDoseRu: '1.0 мг',
				maxDailyDoseRu: '3.0 мг суммарно',
				contraindicationsRu: ['Тахикардия, фибрилляция предсердий, закрытоугольная глаукома'],
				isPediatricDose: isPediatric
			};
		}
	}
}

export function calculateAllEmergencyDosages(
	weightKg: number,
	ageYears: number
): Record<EmergencyDrugId, EmergencyDosageResult> {
	const drugIds: EmergencyDrugId[] = [
		'adrenaline_epi_01',
		'prednisolone_30mg',
		'dexamethasone_4mg',
		'diazepam_relanium',
		'glucose_dextrose_40',
		'lipid_emulsion_20',
		'salbutamol_spray',
		'nitroglycerin_sublingual',
		'captopril_sublingual',
		'moxonidine_sublingual',
		'aminophylline_euphylline',
		'suprastin_2_percent',
		'atropine_01'
	];

	const result = {} as Record<EmergencyDrugId, EmergencyDosageResult>;
	for (const id of drugIds) {
		result[id] = calculateWeightAdjustedDose(id, weightKg, ageYears, false);
	}
	return result;
}

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

// ---------------------------------------------------------------------------
// 2. Action Step Timing & Format Utilities
// ---------------------------------------------------------------------------

export function formatTimerSeconds(seconds: number): string {
	const safeSec = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(safeSec / 60);
	const secs = safeSec % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 3. Emergency Incident Act & SMP Dispatch Protocol Generator
// ---------------------------------------------------------------------------

export function generateEmergencyIncidentAct(input: EmergencyIncidentInput): string {
	const scenario = EMERGENCY_SCENARIOS[input.scenarioId];
	const startDate = typeof input.incidentStartTime === 'string'
		? new Date(input.incidentStartTime)
		: input.incidentStartTime;
	const formattedDate = startDate.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	const formattedTime = startDate.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});

	const vitalsInit = input.initialVitals;
	const vitalsFinal = input.finalVitals || input.initialVitals;

	let actText = `АКТ ОКАЗАНИЯ ЭКСТРЕННОЙ МЕДИЦИНСКОЙ ПОМОЩИ ПРИ НЕОТЛОЖНОМ СОСТОЯНИИ\n`;
	actText += `(Вкладыш в медицинскую карту стоматологического пациента 043/у)\n`;
	actText += `================================================================================\n\n`;

	actText += `1. ОБЩИЕ СВЕДЕНИЯ:\n`;
	actText += `   - Медицинская организация: ${input.clinicName || 'Стоматологическая клиника'}\n`;
	actText += `   - Адрес клиники: ${input.clinicAddress || 'г. Москва, ул. Клиническая, д. 10'}\n`;
	actText += `   - Стоматологический кабинет №: ${input.cabinetNumber || '1'}\n`;
	actText += `   - Дата и точное время происшествия: ${formattedDate} в ${formattedTime}\n`;
	actText += `   - Врач-стоматолог: ${input.doctorFullName || 'Врач-стоматолог'}\n`;
	if (input.assistantFullName) {
		actText += `   - Ассистент врача: ${input.assistantFullName}\n`;
	}
	actText += `   - Пациент: ${input.patientFullName || 'Ф.И.О. пациента'}, ${input.patientAgeYears} лет, пол: ${input.patientGender === 'male' ? 'мужской' : 'женский'}, вес: ${input.patientWeightKg} кг\n`;
	actText += `   - Номер амбулаторной карты: ${input.medCardNumber || '043/у-б/н'}\n\n`;

	actText += `2. ДИАГНОЗ НЕОТЛОЖНОГО СОСТОЯНИЯ:\n`;
	actText += `   - Клинический диагноз: ${scenario.nameRu} (${scenario.subtitleRu})\n`;
	actText += `   - Код по МКБ-10: ${scenario.icd10Code} (${scenario.icd10NameRu})\n`;
	actText += `   - Законодательное основание: ${scenario.statutoryLegalBasisRu}\n\n`;

	actText += `3. ИСХОДНЫЙ ВИТАЛЬНЫЙ СТАТУС В МОМЕНТ НАЧАЛА РЕАКЦИИ:\n`;
	actText += `   - Артериальное давление: ${vitalsInit.bpSystolic}/${vitalsInit.bpDiastolic} мм рт. ст.\n`;
	actText += `   - Частота сердечных сокращений (ЧСС): ${vitalsInit.hr} уд/мин\n`;
	actText += `   - Сатурация кислорода (SpO2): ${vitalsInit.spo2}%\n`;
	actText += `   - Частота дыхательных движений (ЧДД): ${vitalsInit.rr} в мин\n`;
	actText += `   - Уровень сознания: ${vitalsInit.consciousnessRu}\n`;
	if (vitalsInit.glucoseMmolL !== undefined) {
		actText += `   - Глюкоза капиллярной крови: ${vitalsInit.glucoseMmolL} ммоль/л\n`;
	}
	actText += `\n`;

	actText += `4. ПРОТОКОЛ ПРОВЕДЕННЫХ РЕАНИМАЦИОННЫХ И НЕОТЛОЖНЫХ МЕРОПРИЯТИЙ:\n`;
	if (input.completedSteps && input.completedSteps.length > 0) {
		input.completedSteps.forEach((step, idx) => {
			actText += `   ${idx + 1}. [${step.timestamp}] ${step.stepTitleRu}\n`;
			if (step.administeredMedicationRu) {
				actText += `      Введено: ${step.administeredMedicationRu}\n`;
			}
			if (step.doseDetailsRu) {
				actText += `      Дозировка/путь: ${step.doseDetailsRu}\n`;
			}
		});
	} else {
		actText += `   - Реанимационные мероприятия проведены в полном объеме согласно протоколу.\n`;
	}
	actText += `\n`;

	actText += `5. СВЯЗЬ СО СЛУЖБОЙ СКОРОЙ МЕДИЦИНСКОЙ ПОМОЩИ (СМП):\n`;
	const smpCallStr = input.smpCallTime ? (typeof input.smpCallTime === 'string' ? input.smpCallTime : input.smpCallTime.toLocaleTimeString('ru-RU')) : '103/112 вызвана';
	const smpArrStr = input.smpArrivalTime ? (typeof input.smpArrivalTime === 'string' ? input.smpArrivalTime : input.smpArrivalTime.toLocaleTimeString('ru-RU')) : 'Прибыла';
	actText += `   - Время вызова бригады СМП: ${smpCallStr}\n`;
	actText += `   - Время прибытия бригады СМП: ${smpArrStr}\n`;
	actText += `   - Номер наряда / бригады СМП: ${input.smpBrigadeNumber || 'Наряд СМП № ___'}\n\n`;

	actText += `6. ВИТАЛЬНЫЙ СТАТУС ПРИ ПЕРЕДАЧЕ БРИГАДЕ СМП / ЗАВЕРШЕНИИ:\n`;
	actText += `   - Артериальное давление: ${vitalsFinal.bpSystolic}/${vitalsFinal.bpDiastolic} мм рт. ст.\n`;
	actText += `   - Частота сердечных сокращений: ${vitalsFinal.hr} уд/мин\n`;
	actText += `   - SpO2: ${vitalsFinal.spo2}%\n`;
	actText += `   - ЧДД: ${vitalsFinal.rr} в мин\n`;
	actText += `   - Состояние сознания: ${vitalsFinal.consciousnessRu}\n`;
	actText += `   - Исход / Решение: ${input.patientOutcomeRu}\n`;
	if (input.handoverNotesRu) {
		actText += `   - Особые отметки врача: ${input.handoverNotesRu}\n`;
	}
	actText += `\n`;

	actText += `ПОДПИСИ:\n`;
	actText += `Врач-стоматолог: ____________________ / ${input.doctorFullName || 'Ф.И.О.'} /\n`;
	if (input.assistantFullName) {
		actText += `Ассистент врача: ____________________ / ${input.assistantFullName} /\n`;
	}
	actText += `Врач бригады СМП: ____________________ / Ф.И.О., роспись /\n`;
	actText += `Главный врач клиники: ____________________ / Подпись, печать /\n`;

	return actText;
}

export function generateSmpDispatchCheatSheet(input: EmergencyIncidentInput): string {
	const scenario = EMERGENCY_SCENARIOS[input.scenarioId];
	return (
		`🚨 ТЕКСТ ДЛЯ ДИСПЕТЧЕРА СКОРОЙ ПОМОЩИ (103 / 112):\n\n` +
		`1. АДРЕС: ${input.clinicAddress}, Кабинет № ${input.cabinetNumber || '1'}.\n` +
		`2. КТО ВЫЗЫВАЕТ: Врач-стоматолог ${input.doctorFullName}, клиника «${input.clinicName}».\n` +
		`3. ПАЦИЕНТ: ${input.patientFullName}, ${input.patientAgeYears} лет (${input.patientGender === 'male' ? 'мужчина' : 'женщина'}), вес ${input.patientWeightKg} кг.\n` +
		`4. ЧТО СЛУЧИЛОСЬ: ${scenario.nameRu} (${scenario.icd10Code}).\n` +
		`5. СОСТОЯНИЕ: АД ${input.initialVitals.bpSystolic}/${input.initialVitals.bpDiastolic} мм рт. ст., Пульс ${input.initialVitals.hr} уд/мин, SpO2 ${input.initialVitals.spo2}%, Сознание: ${input.initialVitals.consciousnessRu}.\n` +
		`6. ЧТО УЖЕ ВВЕДЕНО: ${scenario.actionSteps[2]?.dosageHintRu || 'Начата реанимационная терапия по приказу МЗ РФ'}.\n` +
		`7. ТРЕБУЕТСЯ: Экстренная реанимационная бригада!`
	);
}
