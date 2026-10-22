/**
 * Russian Dental Resuscitation & Emergency Pharmacology Engine (Layer 2 Facade)
 * Conforms to Order 786n / 1079n / 1144n / 138n / ERC / AHA.
 */

export type {
	EmergencyDrugId,
	EmergencyDosageResult,
	LipidRescueDoseCalculation,
	StatutoryEmergencyKitItem,
} from './emergencyModules/emergencyDrugTypes';

export type {
	EmergencyVitals,
	ExecutedEmergencyStep,
	EmergencyIncidentInput,
} from './emergencyModules/emergencyIncidentTypes';

export { STATUTORY_EMERGENCY_KIT_MEMO } from './engine/emergencyStatutoryKitMemo';
export {
	calculateWeightAdjustedDose,
	calculateAllEmergencyDosages,
} from './engine/emergencyDosageCalculator';
export { calculateLipidRescueDoses } from './engine/emergencyLipidRescueEngine';
export { formatTimerSeconds } from './engine/emergencyFormatters';
export { generateEmergencyIncidentAct } from './engine/emergencyIncidentActGenerator';
export { generateSmpDispatchCheatSheet } from './engine/emergencyCheatSheetGenerator';
export { cprMetronomeAudio } from './engine/emergencyCprMetronomeEngine';
