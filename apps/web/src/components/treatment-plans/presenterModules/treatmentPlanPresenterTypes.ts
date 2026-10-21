/**
 * treatmentPlanPresenterTypes.ts — Канонические типы презентера планов лечения (DENTE CRM).
 */

import type {
	PatientCasePresentation,
	PatientCasePresenterInput,
	RawPlanItem,
	RoadmapStage,
} from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanWorkflowStatus,
} from "../types";

export type {
	NdflDeductionResult,
	PatientCasePresentation,
	PatientCasePresenterInput,
	RawPlanItem,
	RoadmapStage,
	ToothData,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanWorkflowStatus,
};

export * from "./types/presenterTierAndScheduleTypes.js";

/** Пропсы для модального окна презентации */
export interface TreatmentPlanPresenterBaseProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientId?: string | undefined;
	patientPhone?: string | undefined;
	patientBirthDate?: string | undefined;
	doctorFullName?: string | undefined;
	doctorSpecialty?: string | undefined;
	clinicName?: string | undefined;
	clinicLegalName?: string | undefined;
	clinicInn?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
	clinicLicense?: string | undefined;
	contractNumber?: string | undefined;
	teeth?: readonly ToothData[] | undefined;
	tiers?: readonly TreatmentPlanTier[] | undefined;
	initialSelectedTierId?: TreatmentPlanTierId | undefined;
	onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	onConfirmSelection?: ((tier: TreatmentPlanTier) => void) | undefined;
	onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	onUpdateItemPrice?:
		| ((itemId: string, newPriceRub: number) => void)
		| undefined;
	onSendStageToVisit?: ((stage: TreatmentPlanStage) => void) | undefined;
	onSendStageToInvoice?: ((stage: TreatmentPlanStage) => void) | undefined;
	onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	planCreatedAtIso?: string | undefined;
	isClosed?: boolean | undefined;
	isDraft?: boolean | undefined;
	isSigned?: boolean | undefined;
	status?: string | undefined;
	planId?: string | undefined;
	workflowStatus?: TreatmentPlanWorkflowStatus | undefined;
	watermarkText?: string | undefined;
	showAiAudit?: boolean | undefined;
	isDemoMode?: boolean | undefined;
	className?: string | undefined;
}

export type TreatmentPlanPresenterModalProps = TreatmentPlanPresenterBaseProps;
