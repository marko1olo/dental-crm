/**
 * DENTE Dental CRM — Clinical Outpatient Dosage Calculation & Validation Engine
 * Decomposed from prescriptionEngine.ts per Mandate 8b.
 */

import { normalizeDrugId } from "./prescriptionEngineNormalizer";

export interface DosageCalculationParams {
	readonly drugId: string;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
}

export interface DosageCalculationResult {
	readonly drugNameRu: string;
	readonly recommendedDosageRu: string;
	readonly standardFrequencyRu: string;
	readonly maxDailyDoseRu: string;
	readonly isPediatric: boolean;
	readonly warningRu?: string | undefined;
	readonly isContraindicated?: boolean | undefined;
	readonly contraindicationReason?: string | undefined;
	readonly singleDoseMg?: number | undefined;
	readonly maxDailyDoseMg?: number | undefined;
	readonly maxCarpules?: number | undefined;
}

export function calculateMedicationDosage(
	paramsOrDrugId: DosageCalculationParams | string,
	patientWeightKgArg?: number,
	patientAgeYearsArg?: number,
): DosageCalculationResult | null {
	const params: DosageCalculationParams =
		typeof paramsOrDrugId === "string"
			? {
					drugId: paramsOrDrugId,
					patientWeightKg: patientWeightKgArg,
					patientAgeYears: patientAgeYearsArg,
				}
			: paramsOrDrugId;

	const drugId = normalizeDrugId(params.drugId.toLowerCase());
	const weight = Math.max(5, Math.min(150, params.patientWeightKg || 70));
	const isChild =
		(params.patientAgeYears !== undefined && params.patientAgeYears < 12) ||
		weight < 40;
	const patientAgeYears = params.patientAgeYears;

	if (
		drugId.includes("amoxicillin") ||
		drugId.includes("amoxiclav") ||
		drugId.includes("augmentin")
	) {
		if (isChild) {
			const dailyMg = Math.round(weight * 40);
			const singleMg = Math.round(dailyMg / 2);
			return {
				drugNameRu: "Амоксиклав (суспензия)",
				recommendedDosageRu: `${singleMg} мг (суспензия) 2 раза в день`,
				standardFrequencyRu: "2 раза в сутки каждые 12 часов во время еды",
				maxDailyDoseRu: `${dailyMg} мг/сутки (расчет 40 мг/кг/сут)`,
				isPediatric: true,
				warningRu:
					"Детям до 12 лет (или с массой менее 40 кг) рекомендуется диспергируемая форма или суспензия.",
				singleDoseMg: singleMg,
				maxDailyDoseMg: dailyMg,
			};
		}
		return {
			drugNameRu: "Амоксиклав 875+125 мг",
			recommendedDosageRu: "1 таблетка (875/125 мг) 2 раза в сутки",
			standardFrequencyRu: "Каждые 12 часов во время еды (курс 5–7 дней)",
			maxDailyDoseRu: "1750 мг амоксициллина в сутки",
			isPediatric: false,
			singleDoseMg: 875,
			maxDailyDoseMg: 1750,
		};
	}

	if (drugId.includes("nimesil") || drugId.includes("nimesulide")) {
		if (patientAgeYears !== undefined && patientAgeYears < 12) {
			return {
				drugNameRu: "Нимесил (Нимесулид 100 мг)",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 12 лет (ГРЛС Минздрава РФ)",
				standardFrequencyRu: "Не применять у детей младше 12 лет",
				maxDailyDoseRu: "0 мг (применяйте Ибупрофен или Парацетамол)",
				isPediatric: true,
				isContraindicated: true,
				contraindicationReason:
					"Нимесулид противопоказан детям в возрасте до 12 лет из-за риска гепатотоксичности (Приказ МЗ РФ).",
				warningRu:
					"Нимесулид ПРОТИВОПОКАЗАН детям до 12 лет! Назначьте ибупрофен или парацетамол.",
			};
		}
		return {
			drugNameRu: "Нимесил 100 мг (гранулы)",
			recommendedDosageRu: "1 пакетик (100 мг) 2 раза в сутки после еды",
			standardFrequencyRu: "После еды, растворив в 100 мл теплой воды (макс. 5 дней)",
			maxDailyDoseRu: "200 мг в сутки (2 пакетика)",
			isPediatric: false,
			singleDoseMg: 100,
			maxDailyDoseMg: 200,
		};
	}

	if (drugId.includes("ibuprofen")) {
		if (isChild) {
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
		return {
			drugNameRu: "Ибупрофен 400 мг",
			recommendedDosageRu: "1 таблетка (400 мг) при болях, до 3 раз в день",
			standardFrequencyRu: "Интервал между приемами не менее 6 часов, после еды",
			maxDailyDoseRu: "1200 мг в сутки (3 таблетки)",
			isPediatric: false,
			singleDoseMg: 400,
			maxDailyDoseMg: 1200,
		};
	}

	if (drugId.includes("ketorolac") || drugId.includes("ketorol") || drugId.includes("ketanov")) {
		if (patientAgeYears !== undefined && patientAgeYears < 16) {
			return {
				drugNameRu: "Кеторолак (Кетанов 10 мг)",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 16 лет (ГРЛС Минздрава РФ)",
				standardFrequencyRu: "Не применять у лиц младше 16 лет",
				maxDailyDoseRu: "0 мг (применяйте Ибупрофен)",
				isPediatric: true,
				isContraindicated: true,
				contraindicationReason:
					"Кеторолак противопоказан детям и подросткам до 16 лет из-за риска эрозивно-язвенных поражений ЖКТ и кровотечений.",
				warningRu:
					"Кеторолак противопоказан до 16 лет! Назначьте ибупрофен или парацетамол.",
			};
		}
		return {
			drugNameRu: "Кеторол Экспресс 10 мг (таблетки диспергируемые)",
			recommendedDosageRu: "1 таблетка (10 мг) при острой боли",
			standardFrequencyRu: "Повторно через 4–6 часов только при необходимости (макс. 5 дней)",
			maxDailyDoseRu: "40 мг в сутки (4 таблетки)",
			isPediatric: false,
			singleDoseMg: 10,
			maxDailyDoseMg: 40,
		};
	}

	if (drugId.includes("chlorhexidine")) {
		return {
			drugNameRu: "Хлоргексидина биглюконат 0.05%",
			recommendedDosageRu: "10–15 мл раствора для ротовых ванночек",
			standardFrequencyRu: "3 раза в день по 1 минуте после чистки зубов и еды (7–10 дней)",
			maxDailyDoseRu: "Местно, не глотать",
			isPediatric: isChild,
			warningRu: isChild ? "У детей применять только под контролем взрослых. Не глотать!" : undefined,
		};
	}

	if (drugId.includes("ciprofloxacin") || drugId.includes("ciprolet") || drugId.includes("cifran")) {
		const isUnder18 = patientAgeYears !== undefined && patientAgeYears < 18;
		if (isUnder18) {
			return {
				drugNameRu: "Ципролет (Ципрофлоксацин 500 мг)",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям и подросткам до 18 лет (ГРЛС Минздрава РФ)",
				standardFrequencyRu: "Не назначать лицам младше 18 лет",
				maxDailyDoseRu: "0 мг (применяйте Амоксиклав или Кларитромицин)",
				isPediatric: true,
				isContraindicated: true,
				contraindicationReason:
					"Ципрофлоксацин противопоказан детям и подросткам до 18 лет из-за риска артропатий и поражения суставного хряща.",
				warningRu:
					"Ципрофлоксацин противопоказан детям и подросткам до 18 лет из-за риска артропатий и поражения суставного хряща.",
			};
		}
		return {
			drugNameRu: "Ципролет 500 мг (Ципрофлоксацин)",
			recommendedDosageRu: "1 таблетка (500 мг) 2 раза в сутки за 30 мин до еды",
			standardFrequencyRu: "Каждые 12 часов до еды, запивая водой (курс 5–7 дней)",
			maxDailyDoseRu: "1000 мг в сутки (2 таблетки)",
			isPediatric: false,
		};
	}

	if (drugId.includes("holisal") || drugId.includes("cholisal")) {
		if (patientAgeYears !== undefined && patientAgeYears < 1) {
			return {
				drugNameRu: "Холисал гель",
				recommendedDosageRu: "С осторожностью / по согласованию с педиатром (до 1 года)",
				standardFrequencyRu: "Не применять у детей младше 1 года без назначения педиатра",
				maxDailyDoseRu: "Местно, минимальное количество",
				isPediatric: true,
				warningRu: "Применение у детей первого года жизни только по жизненным показаниям под контролем врача.",
			};
		}
		if (isChild) {
			return {
				drugNameRu: "Холисал гель (детская дозировка)",
				recommendedDosageRu: "Полоска геля 0.5 см на пораженную область десны",
				standardFrequencyRu: "2–3 раза в день чистым пальцем за 15 минут до еды",
				maxDailyDoseRu: "Местно, до 3 раз в день",
				isPediatric: true,
			};
		}
		return {
			drugNameRu: "Холисал гель",
			recommendedDosageRu: "Полоска геля 1 см на пораженную область десны/слизистой",
			standardFrequencyRu: "2–3 раза в день чистым пальцем за 15 минут до еды или на ночь",
			maxDailyDoseRu: "Местно, полоска 1 см 2–3 раза в день",
			isPediatric: false,
		};
	}

	if (drugId.includes("solcoseryl")) {
		return {
			drugNameRu: "Солкосерил дентальная адгезивная паста",
			recommendedDosageRu: "Полоска пасты 0.5 см тонким слоем на высушенную слизистую",
			standardFrequencyRu: "3–5 раз в день после еды и перед сном",
			maxDailyDoseRu: "Местно до эпителизации",
			isPediatric: isChild,
		};
	}

	if (drugId.includes("suprastin")) {
		if (isChild) {
			return {
				drugNameRu: "Супрастин (детская дозировка)",
				recommendedDosageRu: "По 1/4–1/2 таблетки 2 раза в день во время еды",
				standardFrequencyRu: "2 раза в сутки во время еды (курс 3–5 дней)",
				maxDailyDoseRu: "1 таблетка (25 мг) в сутки",
				isPediatric: true,
				singleDoseMg: 12.5,
				maxDailyDoseMg: 25,
			};
		}
		return {
			drugNameRu: "Супрастин 25 мг",
			recommendedDosageRu: "1 таблетка (25 мг) 2 раза в сутки во время еды",
			standardFrequencyRu: "Утром и вечером во время еды (курс 3–5 дней)",
			maxDailyDoseRu: "75–100 мг в сутки (3–4 таблетки)",
			isPediatric: false,
			singleDoseMg: 25,
			maxDailyDoseMg: 75,
		};
	}

	if (drugId.includes("articaine") || drugId.includes("ultracain") || drugId.includes("septanest") || drugId.includes("ubistesin")) {
		if (patientAgeYears !== undefined && patientAgeYears < 4) {
			return {
				drugNameRu: "Артикаин + Эпинефрин 4%",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 4 лет (ГРЛС Минздрава РФ)",
				standardFrequencyRu: "Не применять у детей младше 4 лет",
				maxDailyDoseRu: "0 мг (применяйте общую седацию или разрешенные возрастные препараты)",
				isPediatric: true,
				isContraindicated: true,
				contraindicationReason:
					"Артикаин противопоказан детям в возрасте до 4 лет ввиду отсутствия достаточного клинического опыта (ГРЛС Минздрава РФ).",
				maxCarpules: 0,
				singleDoseMg: 0,
				maxDailyDoseMg: 0,
				warningRu: "Артикаин противопоказан детям в возрасте до 4 лет ввиду отсутствия достаточного клинического опыта.",
			};
		}

		if (isChild) {
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

		const maxAdultMg = Math.min(500, Math.round(weight * 7));
		const adultCarpules = Math.min(7, Math.max(1, Math.floor(maxAdultMg / 68)));
		return {
			drugNameRu: "Артикаин 4% с эпинефрином (взрослая дозировка)",
			recommendedDosageRu: "1–2 карпулы (1.7–3.4 мл) на рутинное вмешательство",
			standardFrequencyRu: "Однократно местно (инфильтрационная/проводниковая анестезия)",
			maxDailyDoseRu: `${maxAdultMg} мг (макс. 7 мг/кг, не более ~${(maxAdultMg / 68).toFixed(1)} карпул по 1.7 мл)`,
			isPediatric: false,
			isContraindicated: false,
			singleDoseMg: 68,
			maxDailyDoseMg: maxAdultMg,
			maxCarpules: adultCarpules,
		};
	}

	return null;
}

export interface DosageValidationParams {
	readonly drugIdOrMnn?: string;
	readonly medicationKey?: string;
	readonly dosageText?: string | undefined;
	readonly singleDoseMg?: number | undefined;
	readonly prescribedDoseMg?: number | undefined;
	readonly dailyDoseMg?: number | undefined;
	readonly carpulesCount?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
}

export interface DosageValidationResult {
	readonly isValid: boolean;
	readonly isPediatric: boolean;
	readonly status: "normal" | "warning" | "contraindicated";
	readonly messageRu: string;
	readonly calculatedMaxDoseRu?: string | undefined;
	readonly errors: readonly string[];
}

export function validatePrescriptionDosage(params: DosageValidationParams): DosageValidationResult {
	const errors: string[] = [];
	const drugId = params.medicationKey || params.drugIdOrMnn || "";
	const prescribedMg = params.prescribedDoseMg ?? params.singleDoseMg;

	const calc = calculateMedicationDosage({
		drugId,
		patientAgeYears: params.patientAgeYears,
		patientWeightKg: params.patientWeightKg,
	});

	if (!calc) {
		return {
			isValid: true,
			isPediatric: params.patientAgeYears !== undefined && params.patientAgeYears < 18,
			status: "normal",
			messageRu: "Дозировка в пределах стандартной клинической практики стоматологии.",
			errors: [],
		};
	}

	if (calc.isContraindicated || (calc.warningRu && /противопоказан/i.test(calc.warningRu))) {
		const reason = calc.contraindicationReason || calc.warningRu || "Препарат противопоказан для данной возрастной группы пациента.";
		errors.push(reason);
		return {
			isValid: false,
			isPediatric: calc.isPediatric,
			status: "contraindicated",
			messageRu: reason,
			calculatedMaxDoseRu: calc.maxDailyDoseRu,
			errors,
		};
	}

	if (prescribedMg !== undefined) {
		if (calc.maxDailyDoseMg !== undefined && prescribedMg > calc.maxDailyDoseMg) {
			errors.push(`Назначенная доза ${prescribedMg} мг превышает максимально допустимую (${calc.maxDailyDoseMg} мг).`);
		}
		if (drugId.includes("amoxicillin") && prescribedMg > 1000) {
			errors.push(`Назначенная доза ${prescribedMg} мг превышает максимально допустимую разовую дозу амоксициллина (1000 мг).`);
		}
	}

	if (params.dailyDoseMg !== undefined) {
		if (drugId.includes("ibuprofen") && params.dailyDoseMg > 1200) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Суточная доза ибупрофена ${params.dailyDoseMg} мг превышает стандартный амбулаторный максимум (1200 мг/сут). Требуется строгий гастропротективный контроль.`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
		if (drugId.includes("nimesulide") && params.dailyDoseMg > 200) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Суточная доза нимесулида ${params.dailyDoseMg} мг превышает допустимый максимум 200 мг/сут (2 пакетика). Риск гепатотоксичности.`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
		if (drugId.includes("ketorolac") && params.dailyDoseMg > 40) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Суточная доза кеторолака ${params.dailyDoseMg} мг превышает максимальную (40 мг/сут). Высокий риск желудочно-кишечных кровотечений.`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
	}

	if (params.carpulesCount !== undefined && (drugId.includes("articaine") || drugId.includes("ultracain"))) {
		const weight = params.patientWeightKg && params.patientWeightKg > 0 ? params.patientWeightKg : 70;
		const maxMg = params.patientAgeYears !== undefined && params.patientAgeYears < 12 ? weight * 5 : Math.min(500, weight * 7);
		const maxCarp = maxMg / 68;
		if (params.carpulesCount > maxCarp) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Количество карпул артикаина (${params.carpulesCount}) превышает расчетную безопасную дозу (~${maxCarp.toFixed(1)} карп. для массы ${weight} кг).`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
	}

	return {
		isValid: errors.length === 0,
		isPediatric: calc.isPediatric,
		status: errors.length > 0 ? "contraindicated" : "normal",
		messageRu: errors.length > 0 ? errors.join("; ") : "Дозировка подтверждена.",
		calculatedMaxDoseRu: calc.maxDailyDoseRu,
		errors,
	};
}
