import type { PanelSubject } from "../../../lib/panelStateText";
import type { ToothData } from "../ToothChart";
import type {
	EstimatorContract,
	GhostToothConflict,
	PlanItem,
	PlanItemCollision,
} from "../treatmentEstimatorPricing";

export type PlannerTab = "comprehensive_804n" | "manual_lines";

export interface PlanLoadState {
	phase: "loading" | "ready" | "failed";
	status?: number | null;
}

export interface EstimatorTopBarProps {
	readonly plannerTab: PlannerTab;
	readonly setPlannerTab: (t: PlannerTab) => void;
	readonly signatureUrl: string | null;
	readonly onPaperConfirm: () => void;
	readonly onDirectPrint: () => void;
	readonly onOpenSignModal: () => void;
	readonly onSavePlan: () => void;
	readonly isSaving: boolean;
	readonly planLoadPhase: "loading" | "ready" | "failed";
	readonly unpricedWarning: string | null;
}

export interface EstimatorBottomBarProps {
	readonly onDirectPrint: () => void;
	readonly onOpenCashier: () => void;
	readonly payableKopecks: number;
	readonly pricedRows: number;
	readonly incompleteRows: number;
}
