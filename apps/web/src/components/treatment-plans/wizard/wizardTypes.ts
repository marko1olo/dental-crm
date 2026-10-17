import type { ToothData } from "../../odontogram/ToothChart";
import type { LiveInvoiceItem } from "../../odontogram/OdontogramLiveInvoice";

export interface TreatmentPlanWizardProps {
	isOpen: boolean;
	onClose: () => void;
	teethData: readonly ToothData[];
	patientId?: string | undefined;
	patientName?: string | undefined;
	onPlanCreated?: ((planId: string, totalRub: number) => void) | undefined;
	initialDiscountPercent?: number | undefined;
	className?: string | undefined;
}

export interface WizardStageGroup {
	stageNumber: 1 | 2 | 3;
	stageTitle: string;
	stageKind: "therapy" | "surgery" | "orthopedics";
	items: LiveInvoiceItem[];
	totalRub: number;
	totalKopecks: number;
}
