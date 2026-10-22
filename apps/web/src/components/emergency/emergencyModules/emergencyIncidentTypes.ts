/**
 * Emergency Incident Types (Layer 0)
 * Data structures for vitals, executed resuscitation steps and incident act input.
 */

import type { EmergencyScenarioId } from './emergencyScenarioTypes';

export interface EmergencyVitals {
	bpSystolic: number;
	bpDiastolic: number;
	hr: number;
	spo2: number;
	rr: number;
	consciousnessRu: string;
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
	floorNumber?: string | number | null | undefined;
	entranceNumber?: string | number | null | undefined;
	intercomCode?: string | null | undefined;
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
