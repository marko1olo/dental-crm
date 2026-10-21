import type React from "react";
import type { TreatmentPlanTier } from "../types";
import type { ToothData } from "../../odontogram/ToothChart";
import type { CopilotCommandType } from "../../../services/ai/treatmentPlanCopilot";
import type { ClinicalBundleId } from "../treatmentPlanBundlesEngine";

export interface TreatmentPlanPresenterToolsStripProps {
	readonly activeToolsPanel: "copilot" | "bundles" | "doctorDiscount" | null;
	readonly setActiveToolsPanel: React.Dispatch<
		React.SetStateAction<"copilot" | "bundles" | "doctorDiscount" | null>
	>;
	readonly isCopilotExecuting: boolean;
	readonly onExecuteCopilot: (cmdOrText: CopilotCommandType | string) => void;
	readonly onApplyClinicalBundle: (bundleId: ClinicalBundleId, toothNumber?: number) => void;
	readonly copilotFeedback: string | null;
	readonly setCopilotFeedback: (feedback: string | null) => void;
	readonly doctorDiscountPercent: number;
	readonly setDoctorDiscountPercent: (val: number) => void;
	readonly onApplyDoctorDiscount: (pct: number, stageNum?: number) => void;
	readonly doctorDiscountRub?: number | undefined;
	readonly setDoctorDiscountRub?: ((val: number) => void) | undefined;
	readonly doctorDiscountMode?: ("percent" | "fixed") | undefined;
	readonly setDoctorDiscountMode?: ((mode: "percent" | "fixed") => void) | undefined;
	readonly doctorDiscountTargetStage?: number | undefined;
	readonly setDoctorDiscountTargetStage?: ((stageNum: number) => void) | undefined;
	readonly onApplyDoctorFixedDiscount?: ((rub: number, stageNum?: number) => void) | undefined;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: (val: boolean) => void;
	readonly selectedTier: TreatmentPlanTier;
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly patientChoiceBtnText: string;
	readonly choiceConfirmedBtnText: string;
	readonly isChoiceConfirmed: boolean;
	readonly confirmedNotice?: string | null;
	readonly onConfirmPatientChoice: () => void;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly hideButtonsBar?: boolean | undefined;
}
