import type { Dashboard } from "@dental/shared";
import type { VisitPatientEntity } from "../../view/VisitViewProps";
import type { ClinicalSoapPreset } from "../../clinicalSoapPresets";
import type { VisitEmkCanvasProps } from "../types";
import type { LastVisitSoapSnapshot } from "../../../../lib/clinicalProtocols";

export type { VisitEmkCanvasProps };

export interface VisitEmkInteractiveStageProps {
	activeEmkTab: string;
	visitNoteForm: Record<string, unknown>;
	updateVisitNoteField: (field: string, value: unknown) => void;
	isLocked: boolean;
	effectiveActiveTooth: number | null;
	activePatient?: VisitPatientEntity | null | undefined;
	dashboard?: Dashboard | null | undefined;
	openVisitId: string;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset, targetTooth?: number | null) => void) | undefined;
	activeToothEndoSnapshot?: LastVisitSoapSnapshot | null | undefined;
	handleContinueEndoStage: (snapshot: LastVisitSoapSnapshot) => void;
}

export interface VisitEmkSomaticSummaryBarProps {
	handleCompleteVisitAndGenerateReceipt: () => Promise<void> | void;
	isCompletingVisit?: boolean | undefined;
}
