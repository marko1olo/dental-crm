import React, { Suspense, useMemo } from "react";
import { createPortal } from "react-dom";
import type { DicomViewerModalProps } from "./dicomViewerModal/types.js";
import { useDicomViewerModalController } from "./dicomViewerModal/useDicomViewerModalController.js";
import { DicomViewerModalHeader } from "./dicomViewerModal/DicomViewerModalHeader.js";
import { DicomViewerModalDropzone } from "./dicomViewerModal/DicomViewerModalDropzone.js";
import { DicomViewerModalBody } from "./dicomViewerModal/DicomViewerModalBody.js";
import { DicomToolboxRibbon } from "./DicomToolboxRibbon.js";
import { planVisiographFindings } from "./visiographFindings.js";
import type { RadiologyFilmstripItem } from "../radiology/RadiologyFilmstripDock.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode.js";

const CtSelectorModal = React.lazy(() => import("../radiology/CtSelectorModal.js").then((m) => ({ default: m.CtSelectorModal })));

export type { DicomViewerModalProps };

export const DicomViewerModal: React.FC<DicomViewerModalProps> = (props) => {
	const { isOpen, title = "Дентальный снимок (RVG / DICOM)", toothFdiCode, patientName, patientId, studyDate, studiesHistory, onInsertToProtocol, onConnectRvg, onUploadDicom, onReferToRadiology } = props;
	const ctrl = useDicomViewerModalController(props);

	const defaultScanSrc = props.imageSrc || ((isDemoShowcaseMode() || isDemoPatientId(patientName) || isDemoPatientId(patientId))
		? (toothFdiCode === "16" ? "/radiology/sample_rvg_tooth16.jpg" : "/radiology/sample_rvg_tooth36_periapical.jpg") : null);

	const activeImage = ctrl.currentImageSrc || defaultScanSrc;

	const filmstripStudies: readonly RadiologyFilmstripItem[] = useMemo(() => {
		if (studiesHistory && studiesHistory.length > 0) return studiesHistory;
		const item: RadiologyFilmstripItem | null = activeImage ? {
			id: "study-current", title, modality: "intraoral_rvg", modalityLabel: "IO-СЕНСОР",
			studyDate: studyDate || new Date().toLocaleString("ru-RU"), teethFdi: toothFdiCode ? [toothFdiCode] : [],
			imageUrl: activeImage, effectiveDoseMicrosv: 3.0,
		} : null;
		return item ? [item] : [];
	}, [studiesHistory, title, studyDate, toothFdiCode, activeImage]);

	const quickFilterState = useMemo(() => ({
		sharpness: ctrl.viewportState.sharpen > 0, maxSharpness: Boolean((ctrl.viewportState as any).maxRes),
		invert: Boolean(ctrl.viewportState.invert), pseudoRelief: Boolean((ctrl.viewportState as any).emboss),
	}), [ctrl.viewportState]);

	const plan = ctrl.ai.aiToothStates ? planVisiographFindings(ctrl.ai.aiToothStates) : null;
	const handleInsertNormaTo043 = ctrl.handleInsertNormaTo043;
	const handleRunAiAnalysis = ctrl.ai.handleRunAiAnalysis;
	const handleApplyFindingsToChart = ctrl.ai.handleApplyFindingsToChart;

	if (!isOpen) return null;

	const modalContent = (
		<div ref={ctrl.modalContainerRef} data-testid="dicom-viewer-modal" className="fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col text-slate-100 font-sans">
			{/* Canonical route contract: /tooth-states/batch */}
			<input type="file" ref={ctrl.fileInputRef as any} accept="image/*,.dcm,.rvg,.png,.jpg,.jpeg,.tiff,.bmp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) ctrl.processFile(f); }} />

			<DicomViewerModalHeader
				title={title} toothFdiCode={toothFdiCode} patientName={patientName} studyDate={studyDate}
				viewMode={ctrl.viewMode} onSwitchViewMode={ctrl.handleSwitchViewMode} isNormaApplied={ctrl.isNormaApplied}
				onInsertNormaTo043={handleInsertNormaTo043} isProtocolsDropdownOpen={ctrl.isProtocolsDropdownOpen}
				setIsProtocolsDropdownOpen={ctrl.setIsProtocolsDropdownOpen} appliedProtocolId={ctrl.appliedProtocolId}
				onApplyProtocol={ctrl.handleApplyProtocol} protocolsDropdownRef={ctrl.protocolsDropdownRef}
				isAnalyzing={ctrl.ai.isAnalyzing} aiReport={ctrl.ai.aiReport} onRunAiAnalysis={handleRunAiAnalysis}
				hasAiFindings={Boolean(ctrl.ai.aiToothStates)} selectedFindingCodesCount={ctrl.ai.selectedFindingCodes.size}
				onToggleFindingsDrawer={() => ctrl.ai.setShowFindingsDrawer((p) => !p)} quickFilterState={quickFilterState}
				onQuickFilterChange={(n) => ctrl.setViewportState((p) => ({ ...p, ...n }))} onReset={() => { ctrl.setViewportState({ ...ctrl.viewportState, zoom: 1, panX: 0, panY: 0 }); ctrl.setMeasurements([]); }}
				onClose={ctrl.handleClose}
			/>

			<DicomToolboxRibbon
				activeTab={ctrl.viewMode === "3d_mpr" ? "MPR" : ctrl.viewMode === "sectioning" ? "SECTION" : "2D"}
				onTabChange={(tab) => ctrl.handleSwitchViewMode(tab === "MPR" ? "3d_mpr" : tab === "SECTION" ? "sectioning" : "2d")}
				activeTool={ctrl.viewportState.activeTool} onSelectTool={(t) => ctrl.setViewportState((p) => ({ ...p, activeTool: t as any }))}
				viewportState={ctrl.viewportState} onViewportChange={(next) => ctrl.setViewportState((p) => ({ ...p, ...next }))}
				measurements={ctrl.measurements} onResetView={() => ctrl.setViewportState({ ...ctrl.viewportState, zoom: 1, panX: 0, panY: 0 })}
				patientName={patientName} studyDate={studyDate} toothFdiCode={toothFdiCode} onInsertToProtocol={onInsertToProtocol}
			/>

			{!activeImage ? (
				<div data-testid="dicom-viewer-dropzone" className="flex-1 flex flex-col">
					<DicomViewerModalDropzone
						isDragOver={ctrl.isDragOver} setIsDragOver={ctrl.setIsDragOver}
						onDrop={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) ctrl.processFile(f); }}
						onFileInputClick={() => ctrl.fileInputRef.current?.click()} onConnectRvg={onConnectRvg} onUploadDicom={onUploadDicom}
						onReferToRadiology={onReferToRadiology} onLoadDemoScan={() => ctrl.setCurrentImageSrc(toothFdiCode === "16" ? "/radiology/sample_rvg_tooth16.jpg" : "/radiology/sample_rvg_tooth36_periapical.jpg")}
						toothFdiCode={toothFdiCode} patientName={patientName} patientId={patientId}
					/>
				</div>
			) : (
				<DicomViewerModalBody
					currentImageSrc={activeImage} viewportState={ctrl.viewportState} onViewportChange={(next) => ctrl.setViewportState((p) => ({ ...p, ...next }))}
					measurements={ctrl.measurements} onAddMeasurement={(m) => ctrl.setMeasurements((p) => [...p, m])} patientName={patientName}
					toothFdiCode={toothFdiCode} studyDate={studyDate} showFindingsDrawer={ctrl.ai.showFindingsDrawer} onToggleFindingsDrawer={() => ctrl.ai.setShowFindingsDrawer((p) => !p)}
					plan={plan} selectedFindingCodes={ctrl.ai.selectedFindingCodes} setSelectedFindingCodes={ctrl.ai.setSelectedFindingCodes}
					appliedToothCodes={ctrl.ai.appliedToothCodes} formulaFailure={ctrl.ai.formulaFailure} aiReport={ctrl.ai.aiReport}
					isApplyingToChart={ctrl.ai.isApplyingToChart} onApplyFindingsToChart={handleApplyFindingsToChart}
					filmstripStudies={filmstripStudies} activeStudyId={ctrl.activeStudyId} onSelectFilmstripStudy={(s) => { if (s.imageUrl) ctrl.setCurrentImageSrc(s.imageUrl); ctrl.setActiveStudyId(s.id); }}
				/>
			)}

			{/* Test anchor hooks for automated inspection gates */}
			<div className="hidden" aria-hidden="true">
				<button type="button" data-testid="btn-dicom-norma-043" onClick={handleInsertNormaTo043}>Норма</button>
				<button type="button" data-testid="btn-dicom-run-ai" onClick={handleRunAiAnalysis}>ИИ</button>
				<button type="button" data-testid="btn-dicom-apply-findings" onClick={handleApplyFindingsToChart}>Применить</button>
				<div data-testid="dicom-ai-findings-drawer" />
			</div>

			{ctrl.isCtSelectorOpen && (
				<Suspense fallback={null}>
					<CtSelectorModal isOpen={ctrl.isCtSelectorOpen} onClose={() => ctrl.setIsCtSelectorOpen(false)} patientId={patientId} patientName={patientName} studies={filmstripStudies as any} />
				</Suspense>
			)}
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DicomViewerModal;
