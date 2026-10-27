import React from "react";
import { createPortal } from "react-dom";
import { CephalometricMobileNav } from "./CephalometricReportTab";
import { useCephLandmarks } from "./useCephLandmarks";
import { CephLandmarkCanvas } from "./CephLandmarkCanvas";
import { CephDesktopControlsStrip } from "./CephAnalysisControls";
import { CephModalHeader } from "./CephModalHeader";
import { CephModalRightSidebar } from "./CephModalRightSidebar";
import type { CephalometricAnalysisModalProps } from "./types";

if (typeof document !== "undefined") {
	import("../CephalometricAnalysisModal.css");
}

export function CephalometricAnalysisModal(props: CephalometricAnalysisModalProps) {
	const { isOpen, onClose, patientName, patientId } = props;
	const ceph = useCephLandmarks(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md overflow-hidden" role="dialog" aria-modal="true" aria-label="Ортодонтический цефалометрический анализ ТРГ" data-testid="cephalometric-analysis-modal">
			<div className="ceph-workstation-root relative w-full max-w-[1410px] h-[92vh] max-h-[92vh] bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink)]">
				<CephModalHeader
					patientName={patientName} patientId={patientId}
					isVoiceListening={ceph.isVoiceListening} voiceInterimText={ceph.voiceInterimText}
					toggleVoiceListening={ceph.toggleVoiceListening} onSaveToEmrOnly={ceph.handleSaveToEmrOnly}
					onInsertToChart={ceph.handleInsertToChart} onOpenPopoutStudio={ceph.handleOpenPopoutStudio}
					onSaveConsultationWithoutCeph={ceph.handleSaveConsultationWithoutCeph} onClose={onClose}
				/>
				<CephDesktopControlsStrip
					onApplyPreset={ceph.handleApplyPreset} onResetLandmarks={ceph.handleResetLandmarks}
					onRunAiAutoPlacement={ceph.handleRunAiAutoPlacement} isAiInferring={ceph.isAiInferring}
					aiBackendLabel={ceph.aiBackendLabel} aiBackendBadge={ceph.aiBackendBadge}
				/>
				<CephalometricMobileNav
					mobileView={ceph.mobileView}
					onSelectView={(v) => {
						ceph.setMobileView(v);
						if (v !== "canvas") ceph.setActiveTab(v);
					}}
					placedCount={ceph.analysis.placedCount} isImageLoaded={ceph.isImageLoaded} isComplete={ceph.analysis.isComplete}
				/>
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto lg:overflow-hidden min-h-0">
					<CephLandmarkCanvas
						landmarks={ceph.landmarks} setLandmarks={ceph.setLandmarks}
						onLandmarkChange={ceph.handleLandmarkChange} onRemoveLandmark={ceph.handleRemoveLandmark}
						activeTargetKey={ceph.activeTargetKey} setActiveTargetKey={ceph.setActiveTargetKey}
						imageUrl={ceph.imageUrl} setImageUrl={ceph.setImageUrl}
						filterMode={ceph.filterMode} setFilterMode={ceph.setFilterMode}
						brightness={ceph.brightness} contrast={ceph.contrast}
						showPolygon={ceph.showPolygon} setShowPolygon={ceph.setShowPolygon}
						showPlanes={ceph.showPlanes} setShowPlanes={ceph.setShowPlanes}
						showLabels={ceph.showLabels} setShowLabels={ceph.setShowLabels}
						scaleMmPerPixel={ceph.scaleMmPerPixel} setScaleMmPerPixel={ceph.setScaleMmPerPixel}
						onLoadPreset={ceph.handleLoadPreset} onResetLandmarks={ceph.handleResetLandmarks}
						onRunAiAutoPlacement={ceph.handleRunAiAutoPlacement} isAiInferring={ceph.isAiInferring}
						aiBackendBadge={ceph.aiBackendBadge} aiBackendLabel={ceph.aiBackendLabel}
						aiBackendPref={ceph.aiBackendPref} setAiBackendPref={ceph.setAiBackendPref}
						aiStats={ceph.aiStats} analysis={ceph.analysis} mobileView={ceph.mobileView}
					/>
					<CephModalRightSidebar
						activeTab={ceph.activeTab} setActiveTab={ceph.setActiveTab}
						mobileView={ceph.mobileView} setMobileView={ceph.setMobileView}
						isImageLoaded={ceph.isImageLoaded} analysis={ceph.analysis}
						landmarks={ceph.landmarks} activeTargetKey={ceph.activeTargetKey}
						setActiveTargetKey={ceph.setActiveTargetKey} aiBackendBadge={ceph.aiBackendBadge}
						aiStats={ceph.aiStats} aiBackendPref={ceph.aiBackendPref}
						setAiBackendPref={ceph.setAiBackendPref} detectedBackend={ceph.detectedBackend}
						onRunAiAutoPlacement={ceph.handleRunAiAutoPlacement} isAiInferring={ceph.isAiInferring}
						placedPercent={ceph.placedPercent} isAllPlaced={ceph.isAllPlaced}
						onApplyPreset={ceph.handleApplyPreset} onResetLandmarks={ceph.handleResetLandmarks}
						onSaveConsultationWithoutCeph={ceph.handleSaveConsultationWithoutCeph}
						onInsertToChart={ceph.handleInsertToChart} onCopyText={ceph.handleCopyText}
						copied={ceph.copied} currentEffectiveProtocolText={ceph.currentEffectiveProtocolText}
					/>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export default CephalometricAnalysisModal;
