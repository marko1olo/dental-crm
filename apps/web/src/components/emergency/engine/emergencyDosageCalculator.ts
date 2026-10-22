/**
 * Weight-Adjusted Dosage Calculator (Layer 2)
 */

import type { EmergencyDrugId, EmergencyDosageResult } from '../emergencyModules/emergencyDrugTypes';
import {
	calculateAdrenalineDose,
	calculatePrednisoloneDose,
	calculateDexamethasoneDose,
	calculateDiazepamDose,
} from './emergencyDosageFirstLine';
import {
	calculateGlucoseDose,
	calculateLipidDose,
	calculateSalbutamolDose,
	calculateNitroglycerinDose,
	calculateCaptoprilDose,
	calculateMoxonidineDose,
	calculateAminophyllineDose,
	calculateSuprastinDose,
	calculateAtropineDose,
} from './emergencyDosageSecondLine';

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
		case 'adrenaline_epi_01':
			return calculateAdrenalineDose(safeWeight, safeAge, isPediatric, isCardiacArrest);
		case 'prednisolone_30mg':
			return calculatePrednisoloneDose(safeWeight, isPediatric);
		case 'dexamethasone_4mg':
			return calculateDexamethasoneDose(safeWeight, isPediatric);
		case 'diazepam_relanium':
			return calculateDiazepamDose(safeWeight, isPediatric);
		case 'glucose_dextrose_40':
			return calculateGlucoseDose(safeWeight, isPediatric);
		case 'lipid_emulsion_20':
			return calculateLipidDose(safeWeight, isPediatric);
		case 'salbutamol_spray':
			return calculateSalbutamolDose();
		case 'nitroglycerin_sublingual':
			return calculateNitroglycerinDose();
		case 'captopril_sublingual':
			return calculateCaptoprilDose();
		case 'moxonidine_sublingual':
			return calculateMoxonidineDose();
		case 'aminophylline_euphylline':
			return calculateAminophyllineDose(safeWeight, isPediatric);
		case 'suprastin_2_percent':
			return calculateSuprastinDose(safeWeight, isPediatric);
		case 'atropine_01':
			return calculateAtropineDose(safeWeight, isPediatric);
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
