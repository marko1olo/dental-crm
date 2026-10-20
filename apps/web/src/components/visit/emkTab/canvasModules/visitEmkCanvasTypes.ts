import type { VisitEmkCanvasProps } from "../types";
import type { LastVisitSoapSnapshot } from "../../../../lib/clinicalProtocols043";

export type { VisitEmkCanvasProps };

export interface VisitEmkInteractiveStageProps {
	activeEmkTab: string;
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (field: string, value: any) => void;
	isLocked: boolean;
	effectiveActiveTooth: number;
	activePatient?: any;
	dashboard?: any;
	openVisitId: string;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	onApplySoapPreset?: ((preset: any, targetTooth?: number | null) => void) | undefined;
	activeToothEndoSnapshot?: LastVisitSoapSnapshot | null | undefined;
	handleContinueEndoStage: (snapshot: LastVisitSoapSnapshot) => void;
}

export interface VisitEmkSomaticSummaryBarProps {
	handleCompleteVisitAndGenerateReceipt: () => Promise<void> | void;
	isCompletingVisit?: boolean | undefined;
}
