import type {
	PediatricAnestheticSpec,
	PediatricAnesthesiaCalculationResult,
	PediatricAnestheticDrugId,
} from "./pediatricAnesthesiaSpecs";

export interface CalculatePediatricAnesthesiaParams {
	readonly drug: PediatricAnestheticSpec;
	readonly selectedDrugId: PediatricAnestheticDrugId;
	readonly weightKg: number;
	readonly carpules: number;
	readonly patientAgeYears: number;
	readonly articaineContraindicated: boolean;
	readonly mepivacaineContraindicated: boolean;
}

export function calculatePediatricAnesthesia({
	drug,
	selectedDrugId,
	weightKg,
	carpules,
	patientAgeYears,
	articaineContraindicated,
	mepivacaineContraindicated,
}: CalculatePediatricAnesthesiaParams): PediatricAnesthesiaCalculationResult {
	const safeWeight = Math.max(5, Math.min(100, weightKg));
	const mrdPerKg = drug.maxDoseMgPerKg;
	const maxAllowedTotalDoseMg = Number(Math.min(drug.absoluteMaxDoseMg, safeWeight * mrdPerKg).toFixed(1));

	const singleCarpuleDoseMg = drug.mgPerCarpule;
	const totalVolumeMl = Number((carpules * drug.standardCarpuleVolumeMl).toFixed(2));
	const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));

	const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / singleCarpuleDoseMg).toFixed(2));
	const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));

	const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;
	const isUnderAge = patientAgeYears < drug.minAgeYears;

	const isContraindicated =
		(selectedDrugId === "articaine_4" && articaineContraindicated) ||
		(selectedDrugId === "mepivacaine_3" && mepivacaineContraindicated);

	const contraindicationReasonRu =
		selectedDrugId === "articaine_4" && articaineContraindicated
			? "ПРОТИВОПОКАЗАНИЕ: В анамнезе указана аллергия на артикаин/сульфиты или астма/тиреотоксикоз! Рекомендуется Мепивакаин 3% без вазоконстриктора."
			: selectedDrugId === "mepivacaine_3" && mepivacaineContraindicated
				? "ПРОТИВОПОКАЗАНИЕ: В анамнезе указана аллергия на мепивакаин (скандонест)!"
				: undefined;

	let alertMessageRu: string | undefined;
	if (isContraindicated) {
		alertMessageRu = contraindicationReasonRu;
	} else if (isOverdose) {
		alertMessageRu = `ВНИМАНИЕ: ТОКСИЧЕСКАЯ ДОЗА! Введено ${totalDoseAdministeredMg} мг при допустимом максимуме ${maxAllowedTotalDoseMg} мг на вес ${safeWeight} кг. Риск системной интоксикации! Превышение заблокировано!`;
	} else if (isUnderAge) {
		alertMessageRu = `Препарат противопоказан детям в возрасте до ${drug.minAgeYears} лет.`;
	}

	const safetyWarningLine = isContraindicated
		? `\n• ВНИМАНИЕ: Противопоказание по соматическому анамнезу (${contraindicationReasonRu}). Введено по решению лечащего врача под личную ответственность.`
		: isOverdose
			? `\n• ВНИМАНИЕ: Превышение расчетной дозы (${totalDoseAdministeredMg} мг > МРД ${maxAllowedTotalDoseMg} мг на ${safeWeight} кг). Введено по клиническим показаниям под личную ответственность врача.`
			: "";

	const formattedClinicalNote = [
		`Анестезиологическое пособие: ${drug.nameRu}.`,
		`• Введено: ${carpules} карп. (${totalVolumeMl} мл / ${totalDoseAdministeredMg} мг активного вещества).`,
		`• Вес ребенка: ${safeWeight} кг. Предельно допустимая доза (MRD): ${maxAllowedTotalDoseMg} мг (${mrdPerKg} мг/кг).`,
		`• Расход дозы: ${doseUtilizationPercent}% (макс. ${maxSafeCarpulesCount} карп.) ${isOverdose ? "— ПРЕВЫШЕНИЕ МРД" : "— ДОЗА БЕЗОПАСНА"}.`,
		`• Вазоконстриктор: ${drug.vasoconstrictorRu}.${safetyWarningLine}`,
	].join("\n");

	return {
		drug,
		patientWeightKg: safeWeight,
		carpulesAdministered: carpules,
		totalVolumeMl,
		maxAllowedTotalDoseMg,
		totalDoseAdministeredMg,
		maxSafeCarpulesCount,
		doseUtilizationPercent,
		isSafe: !isOverdose && !isUnderAge && !isContraindicated,
		isOverdose,
		isUnderAge,
		isContraindicated,
		contraindicationReasonRu,
		...(alertMessageRu ? { alertMessageRu } : {}),
		formattedClinicalNote,
		formattedText043: formattedClinicalNote,
	};
}
