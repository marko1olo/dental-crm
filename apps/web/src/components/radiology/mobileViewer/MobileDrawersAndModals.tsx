import type React from "react";
import type { ImagingStudy, Patient } from "../../../types.js";
import { MobilePatientShowcaseOverlay } from "./MobilePatientShowcaseOverlay.js";
import { MobileStudiesDrawer } from "./MobileStudiesDrawer.js";

export interface MobileDrawersAndModalsProps {
	isStudiesSheetOpen: boolean;
	onCloseStudiesSheet: () => void;
	studies: ImagingStudy[];
	selectedStudy?: ImagingStudy | null;
	activePatient?: Patient | null;
	imagingKindLabels?: Record<string, string>;
	onSelectStudy: (id: string) => void;
	onCaptureCamera?: () => void;
	onPickFiles?: () => void;
	triggerHaptic: () => void;
	isShowcaseOpen: boolean;
	onCloseShowcase: () => void;
	effectivePreviewUrl?: string | null;
	computedFilter: string;
	modalityTitle: string;
	toothBadge: string;
	studyDateStr: string;
	comparisonStudy: ImagingStudy | null;
	isProtocol043Attached: boolean;
	onToggleProtocol043Attach: () => void;
}

export const MobileDrawersAndModals: React.FC<MobileDrawersAndModalsProps> = (
	p,
) => {
	return (
		<>
			<MobileStudiesDrawer
				isOpen={p.isStudiesSheetOpen}
				onClose={p.onCloseStudiesSheet}
				studies={p.studies}
				selectedStudyId={p.selectedStudy?.id}
				activePatient={p.activePatient}
				imagingKindLabels={p.imagingKindLabels}
				onSelectStudy={p.onSelectStudy}
				onCaptureCamera={p.onCaptureCamera}
				onPickFiles={p.onPickFiles}
				triggerHaptic={p.triggerHaptic}
			/>
			<MobilePatientShowcaseOverlay
				isOpen={p.isShowcaseOpen}
				onClose={p.onCloseShowcase}
				selectedStudy={p.selectedStudy}
				activePatient={p.activePatient}
				effectivePreviewUrl={p.effectivePreviewUrl}
				computedFilter={p.computedFilter}
				modalityTitle={p.modalityTitle}
				toothBadge={p.toothBadge}
				studyDateStr={p.studyDateStr}
				comparisonStudy={p.comparisonStudy}
				allStudies={p.studies}
				isProtocol043Attached={p.isProtocol043Attached}
				onToggleProtocol043Attach={p.onToggleProtocol043Attach}
				triggerHaptic={p.triggerHaptic}
			/>
		</>
	);
};
