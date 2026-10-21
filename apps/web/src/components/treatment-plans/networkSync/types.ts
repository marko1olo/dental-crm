import type { Kopecks } from "@dental/shared";
import type {
	CashierInvoiceExportData,
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
} from "../types";

export interface LoadedPlanResult {
	planId: string;
	status: "draft" | "agreed" | "in_progress" | "completed";
	rebuiltStages: TreatmentPlanStage[] | null;
}

export interface ExportCashierParams {
	patientId: string;
	patientName: string;
	patientPhone?: string | undefined;
	doctorName?: string | undefined;
	currentPlanId?: string | null | undefined;
	stages: readonly TreatmentPlanStage[];
	currentTier: TreatmentPlanTier;
	loyaltyDeduction: {
		appliedBonusRub: number;
		appliedBonusKopecks: Kopecks;
		netPayableRub: number;
		netPayableKopecks: Kopecks;
	};
	onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	onPlanSaved?: ((planId: string) => void) | undefined;
}

export interface SavePlanParams {
	patientId: string;
	currentPlanId: string | null;
	currentTier: TreatmentPlanTier;
	planStatus: TreatmentPlanStatus;
	signedAgreement: DigitalSignatureAgreementData | null;
	stages: readonly TreatmentPlanStage[];
	grandTotalRub: number;
	totalItemsCount: number;
	onPlanSaved?: ((planId: string) => void) | undefined;
}

export interface LabOrderCreationParams {
	patientId: string;
	doctorId: string | null;
	targetTeeth: readonly number[];
	currentTierTitle: string;
}
