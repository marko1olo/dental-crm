/**
 * useCbctStudioController.ts — контроллер взаимодействия, рендеринга срезов, горячих клавиш и экспорта 3D КЛКТ.
 * Mandate 8b: Модульность, строго < 400 строк.
 */

import React, { useCallback, useEffect, useState } from "react";
import type { CbctVoxelVolume, CbctViewportType } from "../cbctMprMath";
import {
	CBCT_HOUNSFIELD_PRESETS,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
} from "../cbctMprMath";
import { showToast } from "../../GlobalToast";
import { exportEndoToDiary, exportEndoToTreatmentPlan } from "../endoClinicalIntegrationBridge";
import { useCbctStudioExports } from "../mpr/useCbctStudioExports";
import type { StudioMode } from "../mpr/cbctStudioTypes";
import { getDefaultViewportTransforms } from "../mpr/cbctStudioTypes";
import { CbctNerveTracingHud } from "../CbctNerveTracingHud";
import { useCbctSliceRenderer } from "../mpr/useCbctSliceRenderer";
import { useCbctInteractionHandlers } from "../mpr/useCbctInteractionHandlers";
import { useCbctDicomLoader } from "../mpr/useCbctDicomLoader";
import { useCbctClipboardSnapshot } from "../mpr/useCbctClipboardSnapshot";
import { CLINICAL_RADIOLOGY_PRESETS } from "../cbctLutMath";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal";
import type { useCbctStudioModalState } from "./useCbctStudioModalState";
import type { RadiologyStudy } from "../types";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { useCbctStudioLifecycle } from "./useCbctStudioLifecycle";
import { useCbctStudioArchReconstruction } from "./useCbctStudioArchReconstruction";
import { useCbctStudioHotkeys } from "./useCbctStudioHotkeys";

export interface UseCbctStudioControllerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly onApplyToDiary043?: ((diaryText: string) => void) | undefined;
	readonly onApplyToPlan?: ((item: TreatmentPlanItem) => void) | undefined;
	readonly initialVolume?: CbctVoxelVolume | null | undefined;
	readonly initialImageIds?: readonly string[] | undefined;
	readonly autoLoadDemo?: boolean | undefined;
	readonly state: ReturnType<typeof useCbctStudioModalState>;
	readonly modalContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useCbctStudioController({
	isOpen,
	onClose,
	study,
	patientName,
	patientId,
	onApplyToDiary043,
	onApplyToPlan,
	initialVolume,
	initialImageIds,
	autoLoadDemo,
	state,
	modalContainerRef,
}: UseCbctStudioControllerProps) {
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [labOrderDraft, setLabOrderDraft] = useState<DentalLabOrderData | null>(null);

	const handleOpenLabOrder = useCallback((draft: DentalLabOrderData) => {
		setLabOrderDraft(draft);
		setIsLabOrderModalOpen(true);
	}, []);

	const handleToggleMaximize = useCallback((type: CbctViewportType) => {
		state.setMaximizedViewport((prev) => (prev === type ? null : type));
	}, [state]);

	const handleSelectStudioMode = useCallback((mode: StudioMode) => {
		state.setStudioMode(mode);
		if (mode === "panoramic") state.setShowDentalArch(true);
		else if (mode === "diagnostic") state.setShowDentalArch(false);
	}, [state]);

	const { handleAutoDetectArch, handleSwitchJaw } = useCbctStudioArchReconstruction({
		isOpen,
		state,
		onSelectStudioMode: handleSelectStudioMode,
	});

	const clipboardSnapshot = useCbctClipboardSnapshot({
		activeViewport: state.activeViewport,
		patientDisplayName: state.patientDisplayName,
		crossSectionBaseCanvasRef: state.crossSectionBaseCanvasRef,
		crossSectionOverlayCanvasRef: state.crossSectionOverlayCanvasRef,
		panoBaseCanvasRef: state.panoBaseCanvasRef,
		panoOverlayCanvasRef: state.panoOverlayCanvasRef,
		axialBaseCanvasRef: state.axialBaseCanvasRef,
		axialOverlayCanvasRef: state.axialOverlayCanvasRef,
		coronalBaseCanvasRef: state.coronalBaseCanvasRef,
		coronalOverlayCanvasRef: state.coronalOverlayCanvasRef,
		sagittalBaseCanvasRef: state.sagittalBaseCanvasRef,
		sagittalOverlayCanvasRef: state.sagittalOverlayCanvasRef,
		isEnabled: isOpen,
	});

	const handleResetAll = useCallback(() => {
		if (state.volume) state.setCrosshairMm({ x: 0, y: 0, z: 0 });
		state.setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
		state.setTransforms(getDefaultViewportTransforms());
		state.setRulers([]);
		state.setAngles([]);
		state.setProbeMarkers([]);
		state.setActiveTool("crosshair");
		state.setSelectedMeasurement(null);
		state.setWindowWidth(4400);
		state.setWindowLevel(1300);
		state.setSlabMode("single");
		state.setSlabThicknessMm(1.0);
		state.setPanoThicknessMm(3.0);
		state.setPanoProjectionMode("ray_sum");
		state.setActivePreset("standard");
		showToast("Виджеты и проекции КТ сброшены", "info");
	}, [state]);

	const handleFullResetViewport = useCallback((viewport: CbctViewportType) => {
		state.setTransforms((prev) => ({ ...prev, [viewport]: { ...DEFAULT_VIEWPORT_TRANSFORM } }));
		showToast(`Масштаб ${viewport} сброшен`, "info");
	}, [state]);

	const handleClearRulers = useCallback((plane?: CbctViewportType) => {
		state.setRulers((prev) => (plane ? prev.filter((r) => r.plane !== plane) : []));
		showToast(plane ? `Замеры ${plane} очищены` : "Все экранные замеры очищены", "info");
	}, [state]);

	const handleClearAngles = useCallback((plane?: CbctViewportType) => {
		state.setAngles((prev) => (plane ? prev.filter((a) => a.plane !== plane) : []));
		showToast(plane ? `Замеры углов ${plane} очищены` : "Все замеры углов очищены", "info");
	}, [state]);

	const handleSelectQuickWlPreset = useCallback((preset: { windowWidth: number; windowLevel: number }) => {
		state.setWindowWidth(preset.windowWidth);
		state.setWindowLevel(preset.windowLevel);
	}, [state]);

	const dicomLoader = useCbctDicomLoader({
		jawType: state.jawType,
		resolvedPatientName: state.patientDisplayName,
		setVolume: state.setVolume,
		setLoadedSliceCount: state.setLoadedSliceCount,
		setPatientDisplayName: state.setPatientDisplayName,
		setWindowWidth: state.setWindowWidth,
		setWindowLevel: state.setWindowLevel,
		setArchCurve: state.setArchCurve,
		setShowDentalArch: state.setShowDentalArch,
		setCrosshairMm: state.setCrosshairMm,
	});

	useEffect(() => {
		if (isOpen && !state.volume && initialImageIds && initialImageIds.length > 0) {
			dicomLoader.handleLoadImageIds(initialImageIds);
		}
	}, [isOpen, state.volume, initialImageIds, dicomLoader.handleLoadImageIds]);

	const { handleCloseStudio, handleOpenPopoutWindow } = useCbctStudioLifecycle({
		isOpen,
		onClose,
		study,
		patientName,
		patientId,
		initialVolume,
		autoLoadDemo,
		state,
		modalContainerRef,
		handleLoadDemoVolume: dicomLoader.handleLoadDemoVolume,
	});

	const { handleToggleUnsharp } = useCbctStudioHotkeys({
		isOpen,
		state,
		onToggleMaximize: handleToggleMaximize,
		onFullResetViewport: handleFullResetViewport,
		onCloseStudio: handleCloseStudio,
	});

	const interactions = useCbctInteractionHandlers({
		volume: state.volume,
		crosshairMm: state.crosshairMm,
		setCrosshairMm: state.setCrosshairMm,
		obliqueAngles: state.obliqueAngles,
		setObliqueAngles: state.setObliqueAngles,
		activeTool: state.activeTool,
		studioMode: state.studioMode,
		windowWidth: state.windowWidth,
		setWindowWidth: state.setWindowWidth,
		windowLevel: state.windowLevel,
		setWindowLevel: state.setWindowLevel,
		transforms: state.transforms,
		setTransforms: state.setTransforms,
		rulers: state.rulers,
		setRulers: state.setRulers,
		activeRuler: state.activeRuler,
		setActiveRuler: state.setActiveRuler,
		angles: state.angles,
		setAngles: state.setAngles,
		activeAngle: state.activeAngle,
		setActiveAngle: state.setActiveAngle,
		probeMarkers: state.probeMarkers,
		setProbeMarkers: state.setProbeMarkers,
		activeProbe: state.activeProbe,
		setActiveProbe: state.setActiveProbe,
		selectedMeasurement: state.selectedMeasurement,
		setSelectedMeasurement: state.setSelectedMeasurement,
		hoveredMeasurementHandle: state.hoveredMeasurementHandle,
		setHoveredMeasurementHandle: state.setHoveredMeasurementHandle,
		draggingMeasurementHandle: state.draggingMeasurementHandle,
		setDraggingMeasurementHandle: state.setDraggingMeasurementHandle,
		nervePoints: state.nervePoints,
		setNervePoints: state.setNervePoints,
		selectedNerveNodeIdx: state.selectedNerveNodeIdx,
		setSelectedNerveNodeIdx: state.setSelectedNerveNodeIdx,
		showDentalArch: state.showDentalArch,
		archCurve: state.archCurve,
		setArchCurve: state.setArchCurve,
		panoramicData: state.panoramicData,
		crossSections: state.crossSections,
		activeCrossSection: state.activeCrossSection,
		activeCrossSectionIdx: state.activeCrossSectionIdx,
		setActiveCrossSectionIdx: state.setActiveCrossSectionIdx,
		currentImplantSpec: state.currentImplantSpec,
		implantEntryXOffsetMm: state.implantEntryXOffsetMm,
		setImplantEntryXOffsetMm: state.setImplantEntryXOffsetMm,
		implantEntryDepthMm: state.implantEntryDepthMm,
		setImplantEntryDepthMm: state.setImplantEntryDepthMm,
		implantAngulationDeg: state.implantAngulationDeg,
		setImplantAngulationDeg: state.setImplantAngulationDeg,
		hoveredImplantPart: state.hoveredImplantPart,
		setHoveredImplantPart: state.setHoveredImplantPart,
		dragImplantPart: state.dragImplantPart,
		setDragImplantPart: state.setDragImplantPart,
		crossSectionDragStart: state.crossSectionDragStart,
		setCrossSectionDragStart: state.setCrossSectionDragStart,
		handleToggleMaximize,
		panoCanvasRef: state.panoBaseCanvasRef,
		crossSectionCanvasRef: state.crossSectionBaseCanvasRef,
		axialCanvasRef: state.axialBaseCanvasRef,
		coronalCanvasRef: state.coronalBaseCanvasRef,
		sagittalCanvasRef: state.sagittalBaseCanvasRef,
		jawType: state.jawType,
		onSwitchJaw: handleSwitchJaw,
	});

	useCbctSliceRenderer({
		isOpen,
		volume: state.volume,
		crosshairMm: state.crosshairMm,
		obliqueAngles: state.obliqueAngles,
		windowWidth: state.windowWidth,
		windowLevel: state.windowLevel,
		invertColors: state.invertColors,
		slabMode: state.slabMode,
		slabThicknessMm: state.slabThicknessMm,
		transforms: state.transforms,
		maximizedViewport: state.maximizedViewport,
		viewLayout: state.viewLayout,
		layoutBurstCount: 0,
		activeTool: state.activeTool,
		studioMode: state.studioMode,
		rulers: state.rulers,
		activeRuler: state.activeRuler,
		angles: state.angles,
		activeAngle: state.activeAngle,
		probeMarkers: state.probeMarkers,
		activeProbe: state.activeProbe,
		selectedMeasurement: state.selectedMeasurement,
		hoveredMeasurementHandle: state.hoveredMeasurementHandle,
		draggingMeasurementHandle: state.draggingMeasurementHandle,
		implant3DWorld: state.implant3DWorld,
		currentImplantPose: state.currentImplantPose,
		nerveAuditResult: state.nerveAuditResult,
		interpolatedNerve3D: state.interpolatedNerve3D,
		nervePoints: state.nervePoints,
		nerveTotalLengthMm: state.nerveTotalLengthMm,
		selectedNerveNodeIdx: state.selectedNerveNodeIdx,
		activeRotationHandle: interactions.activeRotationHandle,
		hoveredHandle: interactions.hoveredHandle,
		showDentalArch: state.showDentalArch,
		showEdgeRulers: state.showEdgeRulers,
		hoveredViewport: state.hoveredViewport,
		archCurve: state.archCurve,
		activeCrossSection: state.activeCrossSection,
		currentImplantSpec: state.currentImplantSpec,
		selectedArchAnchorIdx: null,
		hoveredArchAnchorIdx: interactions.hoveredArchAnchorIdx,
		isDraggingArchAnchor: interactions.isDraggingArchAnchor,
		panoramicData: state.panoramicData,
		crossSections: state.crossSections,
		activeCrossSectionIdx: state.activeCrossSectionIdx,
		currentCanal: state.currentCanal,
		hoveredImplantPart: state.hoveredImplantPart,
		dragImplantPart: state.dragImplantPart,
		axialBaseCanvasRef: state.axialBaseCanvasRef,
		axialOverlayCanvasRef: state.axialOverlayCanvasRef,
		coronalBaseCanvasRef: state.coronalBaseCanvasRef,
		coronalOverlayCanvasRef: state.coronalOverlayCanvasRef,
		sagittalBaseCanvasRef: state.sagittalBaseCanvasRef,
		sagittalOverlayCanvasRef: state.sagittalOverlayCanvasRef,
		panoBaseCanvasRef: state.panoBaseCanvasRef,
		panoOverlayCanvasRef: state.panoOverlayCanvasRef,
		crossSectionBaseCanvasRef: state.crossSectionBaseCanvasRef,
		crossSectionOverlayCanvasRef: state.crossSectionOverlayCanvasRef,
	});

	const handleSelectPreset = useCallback((p: string) => {
		state.setActivePreset(p);
		const clinical = CLINICAL_RADIOLOGY_PRESETS.find((pr) => pr.id === p);
		if (clinical) {
			state.setWindowWidth(clinical.windowWidth);
			state.setWindowLevel(clinical.windowLevel);
			state.setSlabThicknessMm(clinical.slabThicknessMm);
			state.setSlabMode(clinical.slabMode);
			state.setPanoThicknessMm(clinical.panoThicknessMm);
			state.setPanoProjectionMode(clinical.panoProjectionMode);
			showToast(`Пресет: ${clinical.label}`, "info");
			return;
		}
		const preset = CBCT_HOUNSFIELD_PRESETS.find((pr) => pr.id === p);
		if (preset) {
			state.setWindowWidth(preset.windowWidth);
			state.setWindowLevel(preset.windowLevel);
		}
	}, [state]);

	const handleSelectClinicalPreset = useCallback((presetId: string) => {
		handleSelectPreset(presetId);
	}, [handleSelectPreset]);

	const {
		handleExportToPlan: handleImplantExportToPlan,
		handleExportToSchedule,
		handleExportToEmr: handleImplantExportToEmr,
		handleExportCbctToFinance,
		handleExportToLab,
		handleExportPdfReport,
	} = useCbctStudioExports({
		patientId,
		patientDisplayName: state.patientDisplayName,
		study,
		activeCrossSection: state.activeCrossSection,
		activeCaliper: state.activeCaliper,
		currentImplantSpec: state.currentImplantSpec,
		currentImplantPose: state.currentImplantPose,
		currentCanal: state.currentCanal,
		implantAngulationDeg: state.implantAngulationDeg,
		displayBoneClass: state.displayBoneClass,
		displayMeanHU: state.displayMeanHU,
		displayNerveClearanceMm: state.displayNerveClearanceMm,
		displayTorque: state.displayTorque,
		displayDrillingProtocol: state.displayDrillingProtocol,
		nerveAuditResult: state.nerveAuditResult,
		huSamplingResult: state.huSamplingResult,
		mischClassification: state.mischClassification,
		onApplyToPlan,
		onApplyToDiary043,
		onOpenLabOrder: handleOpenLabOrder,
	});

	const handleExportToEmr = useCallback(() => {
		if (state.studioMode === "endo") {
			const toothFdi = state.activeCrossSection?.nearestToothFdi ? Number(state.activeCrossSection.nearestToothFdi) : 36;
			const exported = exportEndoToDiary({
				patientId,
				patientDisplayName: patientName,
				toothFdi,
				clinicalData: {
					toothFdi,
					vertucciType: "I",
					vertucciNameRu: "Тип I (1-1)",
					rootCount: 2,
					canals: [],
					overallRiskTier: "moderate",
					recommendedTaper: "0.04",
					reciprocatingMotion: false,
					clinicalSummaryRu: "Стандартный эндодонтический доступ",
				},
			});
			if (onApplyToDiary043) onApplyToDiary043(`${exported.statusLocalis}\n\n${exported.treatmentDescription}`);
			showToast(`Эндодонтический протокол 3D КЛКТ (зуб #${toothFdi}) перенесен в медицинскую карту`, "success");
			return;
		}
		handleImplantExportToEmr();
	}, [state.studioMode, state.activeCrossSection, patientId, patientName, onApplyToDiary043, handleImplantExportToEmr]);

	const handleExportToPlan = useCallback(() => {
		if (state.studioMode === "endo") {
			const toothFdi = state.activeCrossSection?.nearestToothFdi ? Number(state.activeCrossSection.nearestToothFdi) : 36;
			const exportedItems = exportEndoToTreatmentPlan({
				patientId,
				patientDisplayName: patientName,
				toothFdi,
				clinicalData: {
					toothFdi,
					vertucciType: "I",
					vertucciNameRu: "Тип I (1-1)",
					rootCount: 2,
					canals: [],
					overallRiskTier: "moderate",
					recommendedTaper: "0.04",
					reciprocatingMotion: false,
					clinicalSummaryRu: "Стандартный эндодонтический доступ",
				},
			});
			if (onApplyToPlan) exportedItems.forEach((it) => onApplyToPlan(it));
			showToast(`Эндодонтические услуги (зуб #${toothFdi}) добавлены в план лечения`, "success");
			return;
		}
		handleImplantExportToPlan();
	}, [state.studioMode, state.activeCrossSection, patientId, patientName, onApplyToPlan, handleImplantExportToPlan]);

	const handleResetNerve = useCallback(() => {
		if (state.activeNerveSide === "right") state.setNervePoints([]);
		else state.setNervePoints([]);
		state.setSelectedNerveNodeIdx(null);
		showToast(`Трассировка (${state.activeNerveSide === "right" ? "Правый" : "Левый"} нерв) сброшена`, "info");
	}, [state]);

	const handleDeleteSelectedNode = useCallback(() => {
		if (state.selectedNerveNodeIdx === null) return;
		state.setNervePoints((prev) => prev.filter((_, idx) => idx !== state.selectedNerveNodeIdx));
		state.setSelectedNerveNodeIdx(null);
		showToast(`Узел нерва #${state.selectedNerveNodeIdx + 1} удален`, "info");
	}, [state]);

	const renderViewportOverlays = useCallback((viewport: CbctViewportType) => {
		if (viewport !== state.activeViewport) return null;
		return (
			<CbctNerveTracingHud
				activeTool={state.activeTool}
				activeSide={state.activeNerveSide}
				onSwitchSide={state.setActiveNerveSide}
				nervePoints={state.nervePoints}
				nerveTotalLengthMm={state.nerveTotalLengthMm}
				selectedNerveNodeIdx={state.selectedNerveNodeIdx}
				onResetNerve={handleResetNerve}
				onDeleteSelectedNode={handleDeleteSelectedNode}
			/>
		);
	}, [state, handleResetNerve, handleDeleteSelectedNode]);

	return {
		isLabOrderModalOpen, setIsLabOrderModalOpen,
		labOrderDraft,
		handleOpenLabOrder,
		handleToggleUnsharp,
		handleToggleMaximize,
		handleSelectStudioMode,
		clipboardSnapshot,
		handleAutoDetectArch,
		handleSwitchJaw,
		handleResetAll,
		handleFullResetViewport,
		handleClearRulers,
		handleClearAngles,
		handleSelectQuickWlPreset,
		dicomLoader,
		interactions,
		handleSelectPreset,
		handleSelectClinicalPreset,
		handleExportToEmr,
		handleExportToPlan,
		handleExportToSchedule,
		handleExportCbctToFinance,
		handleExportToLab,
		handleExportPdfReport,
		handleResetNerve,
		handleDeleteSelectedNode,
		renderViewportOverlays,
		handleOpenPopoutWindow,
		handleCloseStudio,
	};
}
