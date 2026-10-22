import React from "react";
import { MobileGestureViewport } from "./MobileGestureViewport.js";
import { MobileRadiologyCarousel } from "./MobileRadiologyCarousel.js";
import { MobileViewerToolbarSection } from "./MobileViewerToolbarSection.js";
import type { MobileChairsideRadiologyViewerProps } from "./types.js";
import type { useMobileRadiologyController } from "./useMobileRadiologyController.js";

export const MobileViewerMainSection: React.FC<{
	props: MobileChairsideRadiologyViewerProps;
	c: ReturnType<typeof useMobileRadiologyController>;
}> = ({ props, c }) => {
	return (
		<>
			<MobileGestureViewport
				{...props}
				zoom={c.zoom}
				pan={c.pan}
				rotationDeg={c.rotationDeg}
				computedFilter={c.computedFilter}
				computedTransform={c.computedTransform}
				isRulerActive={c.isRulerActive}
				rulerStart={c.rulerStart}
				rulerCurrent={c.rulerCurrent}
				savedRulerDistanceMm={c.savedRulerDistanceMm}
				pixelSpacingMm={c.pixelSpacingMm}
				viewportRef={c.viewportRef}
				touchStartRef={c.touchStartRef}
				setZoom={c.setZoom}
				setPan={c.setPan}
				setRulerStart={c.setRulerStart}
				setRulerCurrent={c.setRulerCurrent}
				setSavedRulerDistanceMm={c.setSavedRulerDistanceMm}
				triggerHaptic={c.triggerHaptic}
			/>

			<MobileRadiologyCarousel
				activeImagingStudies={props.activeImagingStudies}
				selectedStudyId={props.selectedImagingStudy?.id}
				onSelectStudy={props.onSelectStudy}
				triggerHaptic={c.triggerHaptic}
			/>

			<MobileViewerToolbarSection c={c} />
		</>
	);
};
