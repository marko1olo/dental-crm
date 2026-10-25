/**
 * @dental/shared/anesthesia/calculator/mrdDosageModules/patientMrdCalculator.ts
 * Patient Maximum Recommended Dose (MRD) Calculations (Mandate 8b, <= 120 lines)
 */

import {
	ANESTHESIA_DRUGS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
} from "../drugCatalog.js";
import { resolveClinicalDefaultWeightKg } from "../somaticRiskAdjuster.js";
import type {
	AnesthesiaDrugKey,
	PatientMrdCalculation,
} from "../types.js";

export function calculatePatientMrd(params: {
	drugKey: AnesthesiaDrugKey;
	patientWeightKg?: number | null | undefined;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
	isCardioRestricted?: boolean | undefined;
	isEpinephrineBlocked?: boolean | undefined;
}): PatientMrdCalculation {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const weight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		isPediatric,
	);
	const maxDoseMgPerKg =
		isPediatric && drug.maxDoseMgPerKgPediatric
			? drug.maxDoseMgPerKgPediatric
			: drug.maxDoseMgPerKg;

	const weightLimitMg = Math.round(weight * maxDoseMgPerKg * 10) / 10;
	let mrdDoseMg = isPediatric ? weightLimitMg : Math.min(weightLimitMg, drug.absoluteMaxDoseMg);
	const isCappedByAbsoluteMax = !isPediatric && weightLimitMg > drug.absoluteMaxDoseMg;
	let mrdCarpules = drug.mgPerCarpule > 0 ? Math.round((mrdDoseMg / drug.mgPerCarpule) * 10) / 10 : 0;
	let isCappedByCardio = false;
	let maxSafeEpinephrineMg = HEALTHY_MAX_EPINEPHRINE_MG;

	if (params.isEpinephrineBlocked && !drug.isAdrenalineFree) {
		maxSafeEpinephrineMg = 0.0;
		mrdCarpules = 0;
		mrdDoseMg = 0;
		isCappedByCardio = true;
	} else if (params.isCardioRestricted && !drug.isAdrenalineFree && drug.epinephrineMgPerCarpule > 0) {
		maxSafeEpinephrineMg = CARDIO_MAX_EPINEPHRINE_MG;
		const maxCardioCarp =
			drug.vasoconstrictorRatio === "1:100000"
				? 2.0
				: drug.vasoconstrictorRatio === "1:200000"
					? 4.0
					: Math.floor((CARDIO_MAX_EPINEPHRINE_MG / drug.epinephrineMgPerCarpule) * 10) / 10;

		if (maxCardioCarp < mrdCarpules) {
			mrdCarpules = maxCardioCarp;
			mrdDoseMg = Math.min(mrdDoseMg, Math.round(mrdCarpules * drug.mgPerCarpule * 10) / 10);
			isCappedByCardio = true;
		}
	}

	const mrdVolumeMl = Math.round(mrdCarpules * drug.volumeMlPerCarpule * 100) / 100;
	const formattedNoteRu =
		params.isEpinephrineBlocked && !drug.isAdrenalineFree
			? `МРД (${drug.commercialName}): 0 мг / 0 карп. [${EPINEPHRINE_BLOCKED_BADGE_TEXT}]`
			: `МРД (${drug.commercialName}, ${weight} кг${isPediatric ? ", дети" : ""}): ${mrdDoseMg} мг (${mrdVolumeMl} мл / ${mrdCarpules} карп.)${isCappedByCardio ? ` [${CARDIO_LIMIT_BADGE_TEXT}: <= 0.04 мг адреналина]` : ""}`;

	return {
		drugKey: drug.key,
		commercialName: drug.commercialName,
		activeSubstance: drug.activeSubstance,
		patientWeightKg: weight,
		isPediatric,
		maxDoseMgPerKg,
		mrdDoseMg,
		mrdVolumeMl,
		mrdCarpules,
		isCappedByAbsoluteMax,
		isCappedByCardio,
		maxSafeEpinephrineMg,
		cardioLimitBadgeText:
			params.isEpinephrineBlocked && !drug.isAdrenalineFree
				? EPINEPHRINE_BLOCKED_BADGE_TEXT
				: isCappedByCardio
					? CARDIO_LIMIT_BADGE_TEXT
					: null,
		formattedNoteRu,
		status: "OK",
		requiresWeightInput: false,
	};
}
