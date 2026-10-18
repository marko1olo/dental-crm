/**
 * apps/web/src/components/visit/intakeCockpitModules/intakeCockpitTypes.ts
 *
 * Типы для пульта первичного приёма (VisitIntakeCockpit):
 * анкета здоровья, аллергостатус, соматические стоп-факторы,
 * витальные показатели (АД, пульс, температура) и очередь приёма.
 */

import type {
	CanonicalHealthySomaticProfile,
	SomaticQuickChip,
	Patient,
	Dashboard,
} from "@dental/shared";

export type CanonicalSomaticProfile = CanonicalHealthySomaticProfile;
export type DentalAllergenEntry = any;
export type DentalSomaticStopFactorEntry = any;

export interface IntakePatientExtended extends Omit<Partial<Patient>, "fullName"> {
	readonly id: string;
	readonly fullName?: string | null;
	readonly name?: string | null;
	readonly phone?: string | null;
	readonly birthDate?: string | null;
	readonly allergies?: string | string[] | null;
	readonly medicalFlags?: string | string[] | null;
	readonly chronicDiseases?: string | string[] | null;
	readonly isVip?: boolean;
	readonly balance?: number;
	readonly debt?: number;
}

export interface IntakeDoctorInfo {
	readonly id?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly specialty?: string | null | undefined;
}

export interface VisitIntakeCockpitProps {
	readonly dashboard?: Dashboard | any;
	readonly activeDoctor?: IntakeDoctorInfo | null | undefined;
	readonly onSelectPatient: (patientId: string, appointmentId?: string) => void;
	readonly onEmergencyIntake: () => void;
}

export interface IntakeVitalSignsState {
	readonly systolicBp: number;
	readonly diastolicBp: number;
	readonly pulseBpm: number;
	readonly temperatureC: number;
}

export interface IntakeAdrenalineAssessment {
	readonly isAdrenalineContraindicated: boolean;
	readonly isHighBpCrisis: boolean;
	readonly recommendedAnestheticHintRu: string;
	readonly warningReasonRu: string | null;
}

export interface IntakeSomaticQuestionnaireState {
	readonly isHealthyNorm: boolean;
	readonly selectedAllergenIds: readonly string[];
	readonly selectedStopFactorIds: readonly string[];
	readonly selectedQuickChipIds: readonly string[];
	readonly customAllergyNote: string;
	readonly summaryAnamnesisTextRu: string;
}

export interface IntakeSomaticCheckboxesGridProps {
	readonly state: IntakeSomaticQuestionnaireState;
	readonly onToggleQuickChip: (chipId: string) => void;
	readonly onToggleAllergen: (allergenId: string) => void;
	readonly onToggleStopFactor: (factorId: string) => void;
	readonly onApplyHealthyNorm: () => void;
}

export interface IntakeVitalSignsBarProps {
	readonly vitals: IntakeVitalSignsState;
	readonly hasCardiovascularStopFactor: boolean;
	readonly onUpdateVitals: (patch: Partial<IntakeVitalSignsState>) => void;
	readonly onApplyNormalVitals: () => void;
}

export type {
	SomaticQuickChip,
};

