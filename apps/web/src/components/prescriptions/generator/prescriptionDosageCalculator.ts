/**
 * prescriptionDosageCalculator.ts — Adult & General Dosage Calculation Engine
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import { normalizeDrugId } from "./prescriptionEngineNormalizer";
import {
	getArticaineChildDosage,
	getCiprofloxacinChildContraindication,
	getKetorolacChildContraindication,
	getNimesulideChildContraindication,
	getPediatricAmoxiclavDosage,
	getPediatricIbuprofenDosage,
} from "./prescriptionDosagePediatricRules";
import type { DosageCalculationParams, DosageCalculationResult } from "./prescriptionDosageTypes";

export function calculateMedicationDosage(
	paramsOrDrugId: DosageCalculationParams | string,
	patientWeightKgArg?: number,
	patientAgeYearsArg?: number,
): DosageCalculationResult | null {
	const params: DosageCalculationParams = typeof paramsOrDrugId === "string"
		? { drugId: paramsOrDrugId, patientWeightKg: patientWeightKgArg, patientAgeYears: patientAgeYearsArg }
		: paramsOrDrugId;

	const drugId = normalizeDrugId(params.drugId.toLowerCase());
	const weight = Math.max(5, Math.min(150, params.patientWeightKg || 70));
	const isChild = (params.patientAgeYears !== undefined && params.patientAgeYears < 12) || weight < 40;
	const age = params.patientAgeYears;

	if (drugId.includes("amoxicillin") || drugId.includes("amoxiclav") || drugId.includes("augmentin")) {
		if (isChild) return getPediatricAmoxiclavDosage(weight);
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
		if (age !== undefined && age < 12) return getNimesulideChildContraindication();
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
		if (isChild) return getPediatricIbuprofenDosage(weight);
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
		if (age !== undefined && age < 16) return getKetorolacChildContraindication();
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
		if (age !== undefined && age < 18) return getCiprofloxacinChildContraindication();
		return {
			drugNameRu: "Ципролет 500 мг (Ципрофлоксацин)",
			recommendedDosageRu: "1 таблетка (500 мг) 2 раза в сутки за 30 мин до еды",
			standardFrequencyRu: "Каждые 12 часов до еды, запивая водой (курс 5–7 дней)",
			maxDailyDoseRu: "1000 мг в сутки (2 таблетки)",
			isPediatric: false,
		};
	}

	if (drugId.includes("articaine") || drugId.includes("ultracain") || drugId.includes("septanest") || drugId.includes("ubistesin")) {
		if (isChild || (age !== undefined && age < 12)) return getArticaineChildDosage(weight, age);
		const maxAdultMg = Math.min(500, Math.round(weight * 7));
		return {
			drugNameRu: "Артикаин 4% с эпинефрином (взрослая дозировка)",
			recommendedDosageRu: "1–2 карпулы (1.7–3.4 мл) на рутинное вмешательство",
			standardFrequencyRu: "Однократно местно (инфильтрационная/проводниковая анестезия)",
			maxDailyDoseRu: `${maxAdultMg} мг (макс. 7 мг/кг, не более ~${(maxAdultMg / 68).toFixed(1)} карпул по 1.7 мл)`,
			isPediatric: false,
			isContraindicated: false,
			singleDoseMg: 68,
			maxDailyDoseMg: maxAdultMg,
			maxCarpules: Math.min(7, Math.max(1, Math.floor(maxAdultMg / 68))),
		};
	}

	return null;
}
