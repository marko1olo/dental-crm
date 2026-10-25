/**
 * prescriptionDosageValidator.ts — Dosage Verification & Contraindication Guard
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import { calculateMedicationDosage } from "./prescriptionDosageCalculator";
import type {
	DosageValidationParams,
	DosageValidationResult,
} from "./prescriptionDosageTypes";

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
