/**
 * Imaging2dToolbarWrapper.tsx — Обертка тулбара 2D-просмотрщика с логикой сброса
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { ImagingViewerState } from "../types.js";
import { ImagingToolbar } from "../ImagingToolbar.js";
import type { Imaging2dViewerSectionProps } from "./types.js";

export const Imaging2dToolbarWrapper: React.FC<Imaging2dViewerSectionProps> = (p) => {
	const handleReset = () => {
		if (p.defaultImagingViewerState) {
			p.setImagingViewerState({
				...p.defaultImagingViewerState,
				panX: 0,
				panY: 0,
			});
		}
		if (p.setImagingViewerActiveTool) p.setImagingViewerActiveTool("window_level");
		if (p.setCtPlanningActiveQuickActionId) p.setCtPlanningActiveQuickActionId(null);
		if (p.setCtPlanningImplantPlan) p.setCtPlanningImplantPlan(null);
		p.setIsRulerActive(false);
		p.setIsPanActive(false);
		p.setRulerMeasurements([]);
	};

	const handleSetEnhancementOn: React.Dispatch<React.SetStateAction<boolean>> = (action) => {
		const next = typeof action === "function" ? action(p.enhancementOn) : action;
		p.setEnhancementOn(next);
	};

	const handleSetIsRulerActive: React.Dispatch<React.SetStateAction<boolean>> = (action) => {
		const next = typeof action === "function" ? action(p.isRulerActive) : action;
		p.setIsRulerActive(next);
	};

	const handleSetIsPanActive: React.Dispatch<React.SetStateAction<boolean>> = (action) => {
		const next = typeof action === "function" ? action(p.isPanActive) : action;
		p.setIsPanActive(next);
	};

	const handleSetImagingViewerState: React.Dispatch<React.SetStateAction<ImagingViewerState>> = (action) => {
		if (typeof action === "function") {
			const current = p.imagingViewerState ?? p.defaultImagingViewerState;
			if (current) {
				p.setImagingViewerState(action(current));
			}
		} else {
			p.setImagingViewerState(action);
		}
	};

	const currentViewerState = p.imagingViewerState ?? p.defaultImagingViewerState;
	if (!currentViewerState) return null;

	return (
		<ImagingToolbar
			selectedImagingStudy={p.selectedImagingStudy}
			imagingViewerState={currentViewerState}
			setImagingViewerState={handleSetImagingViewerState}
			enhancementOn={p.enhancementOn}
			setEnhancementOn={handleSetEnhancementOn}
			isRulerActive={p.isRulerActive}
			setIsRulerActive={handleSetIsRulerActive}
			isPanActive={p.isPanActive}
			setIsPanActive={handleSetIsPanActive}
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
			formatShortDate={p.formatShortDate ? (d) => p.formatShortDate?.(d) ?? "" : undefined}
			activeAppointment={p.activeAppointment}
			activePatient={p.activePatient}
			effectivePreviewUrl={p.effectivePreviewUrl}
			showNotes={false}
			{...(p.onAttachToTooth ? { onAttachToTooth: p.onAttachToTooth } : {})}
			{...(p.onAttachToVisit ? { onAttachToVisit: p.onAttachToVisit } : {})}
		/>
	);
};
