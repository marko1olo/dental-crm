import React from "react";

if (typeof document !== "undefined") {
	void import("../mobileRadiology.css");
}

import { MobileDrawersAndModals } from "./MobileDrawersAndModals.js";
import { MobileRadiologyTopBar } from "./MobileRadiologyTopBar.js";
import { MobileViewerMainSection } from "./MobileViewerMainSection.js";
import type { MobileChairsideRadiologyViewerProps } from "./types.js";
import { useMobileRadiologyController } from "./useMobileRadiologyController.js";

export * from "./MobileGestureViewport.js";
export * from "./MobilePatientShowcaseOverlay.js";
export * from "./MobileRadiologyCarousel.js";
export * from "./MobileRadiologyFilterToolbar.js";
export * from "./MobileRadiologyTopBar.js";
export * from "./MobileStudiesDrawer.js";
export * from "./MobileViewerMainSection.js";
export * from "./types.js";
export * from "./useMobileRadiologyController.js";

export const MobileChairsideRadiologyViewer: React.FC<
	MobileChairsideRadiologyViewerProps
> = (props) => {
	const {
		selectedImagingStudy,
		activeImagingStudies = [],
		activePatient,
		onSelectStudy,
		effectivePreviewUrl,
		imagingKindLabels = {},
		onCaptureCamera,
		onPickFiles,
		onClose,
	} = props;

	const c = useMobileRadiologyController(
		selectedImagingStudy,
		activeImagingStudies,
		imagingKindLabels,
	);

	return (
		<div
			className="mobile-radiology-container"
			data-testid="mobile-chairside-radiology-container"
		>
			<MobileRadiologyTopBar
				activeStudiesCount={activeImagingStudies.length}
				toothBadge={c.toothBadge}
				studyDateStr={c.studyDateStr}
				modalityTitle={c.modalityTitle}
				onOpenStudiesSheet={() => {
					c.triggerHaptic();
					c.setIsStudiesSheetOpen(true);
				}}
				onOpenShowcase={() => {
					c.triggerHaptic();
					c.setIsShowcaseOpen(true);
				}}
				onResetTransform={c.handleResetTransform}
				onCaptureCamera={onCaptureCamera}
				onClose={onClose}
			/>

			<MobileViewerMainSection props={props} c={c} />

			<MobileDrawersAndModals
				isStudiesSheetOpen={c.isStudiesSheetOpen}
				onCloseStudiesSheet={() => c.setIsStudiesSheetOpen(false)}
				studies={activeImagingStudies}
				selectedStudy={selectedImagingStudy}
				activePatient={activePatient}
				imagingKindLabels={imagingKindLabels}
				onSelectStudy={onSelectStudy}
				onCaptureCamera={onCaptureCamera}
				onPickFiles={onPickFiles}
				triggerHaptic={c.triggerHaptic}
				isShowcaseOpen={c.isShowcaseOpen}
				onCloseShowcase={() => c.setIsShowcaseOpen(false)}
				effectivePreviewUrl={effectivePreviewUrl}
				computedFilter={c.computedFilter}
				modalityTitle={c.modalityTitle}
				toothBadge={c.toothBadge}
				studyDateStr={c.studyDateStr}
				comparisonStudy={c.comparisonStudy}
				isProtocol043Attached={c.isProtocol043Attached}
				onToggleProtocol043Attach={() =>
					c.setIsProtocol043Attached((prev) => !prev)
				}
			/>
		</div>
	);
};
