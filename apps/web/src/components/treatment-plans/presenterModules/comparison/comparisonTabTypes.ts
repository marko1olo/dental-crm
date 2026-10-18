import type { TreatmentPlanTier, TreatmentPlanTierId } from "../../types";
import type { ToothData } from "../../../odontogram/ToothChart";

export interface TreatmentPlanPresenterComparisonTabProps {
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly formatRubles: (amount: number | undefined | null) => string;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: (React.Dispatch<React.SetStateAction<boolean>> | ((fn: (prev: boolean) => boolean) => void)) | undefined;
	readonly setActiveTab?: ((tab: "comparison" | "stages" | "finance" | "print" | "aiAudit") => void) | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly onConfirmPatientChoice: (tier?: TreatmentPlanTier) => void;
	readonly isChoiceConfirmed: boolean;
	readonly confirmedTierId: TreatmentPlanTierId | null;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly planId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName?: string | undefined;
}
