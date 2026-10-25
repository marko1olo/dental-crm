/**
 * patientAutonomyActions.ts — Фасад клинической автономии и действий с карточкой пациента.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 * Mandates 8e & 8n: Doctor Autonomy, 1-click Somatic Norm, Non-blocking Save.
 */

export {
	executePatientCoreSaveAutonomy,
	executePatientAdministrativeProfileSaveAutonomy,
	executePatientSomaticNormAutonomy,
} from "./patientAutonomy/patientSaveAutonomy";

export {
	executeOpenPatientVisitAutonomy,
	executeBookPatientAppointmentAutonomy,
} from "./patientAutonomy/patientNavigationAutonomy";

export {
	mapPatientToGeneralInfo,
	resolveInitialSafetyProfile,
} from "./patientAutonomy/patientSafetyMapping";

export {
	persistPatientCardModalToApi,
	executePatientCardModalSaveAutonomy,
} from "./patientAutonomy/patientModalApiPersistence";
