/**
 * usePanoramicRenderer.ts — хук панорамной реконструкции, срезов и экспорта ОПТГ.
 * Mandate 8b: Модульность, строго <= 120 строк.
 */

import { useRef, useEffect } from "react";
import { VISIOGRAPH_WINDOW_PRESETS } from "../../visiograph/VisiographWindowPresets";
import {
	type UsePanoramicRendererProps,
	usePanoramicToolState,
	usePanoramicArchCrossSections,
	usePanoramicExporter,
	usePanoramicWorker,
	usePanoramicPainting,
} from "./renderer";

export type { UsePanoramicRendererProps };

export function usePanoramicRenderer({
	splinePoints, volume, thickness = 0, blendMode = "mip",
	zStartWorld, zEndWorld, zStepWorld = 0.5, patientId = null, authHeaders = {},
}: UsePanoramicRendererProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);
	const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const repaintCrossSectionRef = useRef<() => void>(() => {});

	const toolState = usePanoramicToolState(thickness);
	const currentPreset = VISIOGRAPH_WINDOW_PRESETS[toolState.activePreset];

	const archState = usePanoramicArchCrossSections(
		splinePoints, volume, toolState.crossSectionStepMm,
		toolState.sliceThicknessMm, toolState.activeCrossSectionIdx, toolState.probedHU,
	);

	const workerState = usePanoramicWorker({
		volume, effectiveControlPoints: archState.effectiveControlPoints,
		sliceThicknessMm: toolState.sliceThicknessMm, blendMode,
		zStartWorld, zEndWorld, zStepWorld, currentPreset,
		canvasRef, onRepaintCrossSection: () => repaintCrossSectionRef.current(),
	});

	const painting = usePanoramicPainting({
		volume, currentPreset, canvasRef, crossSectionCanvasRef, offscreenCanvasRef,
		rawPixelsRef: workerState.rawPixelsRef,
		activeSlice: archState.activeSlice, crossSections: archState.crossSections,
		effectiveControlPoints: archState.effectiveControlPoints,
		sliceThicknessMm: toolState.sliceThicknessMm,
		setProbedHU: toolState.setProbedHU, setCursorPos: toolState.setCursorPos,
	});
	repaintCrossSectionRef.current = painting.repaintCrossSection;

	useEffect(() => {
		painting.repaint();
		painting.repaintCrossSection();
	}, [painting.repaint, painting.repaintCrossSection]);

	const exporter = usePanoramicExporter({
		canvasRef, patientId, authHeaders, sliceThicknessMm: toolState.sliceThicknessMm,
		blendMode, probedHU: toolState.probedHU, currentPreset,
		boneRecommendation: archState.boneRecommendation, activePreset: toolState.activePreset,
	});

	return {
		canvasRef, crossSectionCanvasRef, loading: workerState.loading, error: workerState.error,
		activePreset: toolState.activePreset, setActivePreset: toolState.setActivePreset,
		isExporting: exporter.isExporting, viewMode: toolState.viewMode, setViewMode: toolState.setViewMode,
		crossSectionStepMm: toolState.crossSectionStepMm, setCrossSectionStepMm: toolState.setCrossSectionStepMm,
		sliceThicknessMm: toolState.sliceThicknessMm, setSliceThicknessMm: toolState.setSliceThicknessMm,
		activeCrossSectionIdx: toolState.activeCrossSectionIdx, setActiveCrossSectionIdx: toolState.setActiveCrossSectionIdx,
		isSharpenActive: toolState.isSharpenActive, setIsSharpenActive: toolState.setIsSharpenActive,
		isInvertColors: toolState.isInvertColors, setIsInvertColors: toolState.setIsInvertColors,
		activeTool: toolState.activeTool, setActiveTool: toolState.setActiveTool,
		rulers: toolState.rulers, setRulers: toolState.setRulers, angles: toolState.angles, setAngles: toolState.setAngles,
		probedHU: toolState.probedHU, cursorPos: toolState.cursorPos, crossSections: archState.crossSections,
		activeSlice: archState.activeSlice, proximityAudit: archState.proximityAudit,
		boneRecommendation: archState.boneRecommendation, handleReset: toolState.handleReset,
		handleAutoDetectArch: archState.handleAutoDetectArch,
		handleCanvasMouseEnter: painting.handleCanvasMouseEnter,
		handleCanvasMouseLeave: painting.handleCanvasMouseLeave,
		handleCanvasMouseMove: painting.handleCanvasMouseMove,
		handleExportToClinicalRecord: exporter.handleExportToClinicalRecord,
		handleExportTo043: exporter.handleExportToClinicalRecord,
		handleLocalDownload: exporter.handleLocalDownload,
	};
}
