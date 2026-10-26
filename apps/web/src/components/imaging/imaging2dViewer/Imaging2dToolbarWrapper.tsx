/**
 * Imaging2dToolbarWrapper.tsx — Обертка тулбара 2D-просмотрщика с логикой сброса
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { ImagingToolbar } from "../ImagingToolbar.js";
import type { Imaging2dViewerSectionProps } from "./types.js";

export const Imaging2dToolbarWrapper: React.FC<Imaging2dViewerSectionProps> = (p) => {
	const handleReset = () => {
		p.setImagingViewerState({
			...p.defaultImagingViewerState,
			pan: { x: 0, y: 0 },
		});
		if (p.setImagingViewerActiveTool) p.setImagingViewerActiveTool("window_level");
		if (p.setCtPlanningActiveQuickActionId) p.setCtPlanningActiveQuickActionId(null);
		if (p.setCtPlanningImplantPlan) p.setCtPlanningImplantPlan(null);
		p.setIsRulerActive(false);
		p.setIsPanActive(false);
		p.setRulerMeasurements([]);
	};

	return (
		<ImagingToolbar
			selectedImagingStudy={p.selectedImagingStudy}
			imagingViewerState={p.imagingViewerState}
			setImagingViewerState={p.setImagingViewerState}
			enhancementOn={p.enhancementOn}
			setEnhancementOn={p.setEnhancementOn}
			isRulerActive={p.isRulerActive}
			setIsRulerActive={p.setIsRulerActive}
			isPanActive={p.isPanActive}
			setIsPanActive={p.setIsPanActive}
			rulerMeasurements={p.rulerMeasurements}
			setRulerMeasurements={p.setRulerMeasurements}
			onReset={handleReset}
			imagingViewerNote={p.imagingViewerNote ?? ""}
			setImagingViewerNote={p.setImagingViewerNote ?? (() => {})}
			imagingViewerSaveState={p.imagingViewerSaveState ?? "saved"}
			imagingViewerSaveTitle={p.imagingViewerSaveTitle ?? {}}
			imagingViewerSaveDetail={p.imagingViewerSaveDetail ?? ""}
			imagingViewerNoteReady={Boolean(p.imagingViewerNoteReady)}
			imagingViewerSessionReady={Boolean(p.imagingViewerSessionReady)}
			canRetryImagingViewerSave={p.canRetryImagingViewerSave}
			retryImagingViewerSessionSave={p.retryImagingViewerSessionSave}
			addImagingViewerNoteAnnotation={p.addImagingViewerNoteAnnotation}
			imagingViewerAnnotations={p.imagingViewerAnnotations}
			formatShortDate={p.formatShortDate}
			activeAppointment={p.activeAppointment}
			activePatient={p.activePatient}
			effectivePreviewUrl={p.effectivePreviewUrl}
			showNotes={false}
			{...(p.onAttachToTooth ? { onAttachToTooth: p.onAttachToTooth } : {})}
			{...(p.onAttachToVisit ? { onAttachToVisit: p.onAttachToVisit } : {})}
		/>
	);
};
