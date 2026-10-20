/**
 * apps/web/src/components/visit/emkTabModules/emkTabTypes.ts
 *
 * Типы для секций дневника ЭМК: жалобы, анамнез, объективный статус,
 * диагноз МКБ-10, проведённое лечение, рекомендации и пресеты.
 */

import type {
	CanonicalClinicalDiagnosis,
	ClinicalDiagnosisCategory,
	SomaticQuickChip,
} from "@dental/shared";
export type ClinicalDiagnosisSsotEntry = CanonicalClinicalDiagnosis;
import type { VisitEmkTabProps } from "../emkTab/types";

export type {
	ActivePatientRecord,
	VisitDashboardSlice,
	VisitEmkCanvasProps,
	VisitEmkCompletionSectionProps,
	VisitEmkModalsProps,
	VisitEmkServicesBillingProps,
	VisitEmkTabProps,
	VisitNoteFormValues,
	VisitNoteSaveHandler,
} from "../emkTab/types";

export type EmkDiaryFieldKey =
	| "complaint"
	| "anamnesis"
	| "objectiveStatus"
	| "diagnosis"
	| "treatmentPlan"
	| "recommendations";

export interface EmkDiarySectionState {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentPlan: string;
	readonly recommendations: string;
	readonly status?: string;
}

export interface EmkComplaintsNormResult {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly isHealthyNorm: boolean;
}

export interface EmkComplaintsAndAnamnesisSectionProps {
	readonly visitNoteForm: VisitEmkTabProps["visitNoteForm"];
	readonly updateVisitNoteField: VisitEmkTabProps["updateVisitNoteField"];
	readonly isLocked: boolean;
	readonly onApplyHealthyNorm?: () => void;
}

export interface EmkAppliedDiagnosisProtocol {
	readonly diagnosisEntry: CanonicalClinicalDiagnosis;
	readonly formattedDiagnosis: string;
	readonly complaints: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly treatmentPlan: string;
	readonly recommendations: string;
	readonly order804nServices?: readonly any[];
}

export interface EmkDiagnosisAndProtocolSectionProps {
	readonly visitNoteForm: VisitEmkTabProps["visitNoteForm"];
	readonly updateVisitNoteField: VisitEmkTabProps["updateVisitNoteField"];
	readonly isLocked: boolean;
	readonly activeTooth?: number | string | null;
	readonly onOpenTemplatesModal?: () => void;
}

export type { ClinicalDiagnosisCategory, SomaticQuickChip };
