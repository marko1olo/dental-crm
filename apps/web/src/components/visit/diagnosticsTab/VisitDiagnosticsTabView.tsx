import React from "react";
import { DiagnosticsCbctSection } from "./DiagnosticsCbctSection";
import { DiagnosticsCephSection } from "./DiagnosticsCephSection";
import { DiagnosticsModalsHost } from "./DiagnosticsModalsHost";
import { DiagnosticsPhotoSection } from "./DiagnosticsPhotoSection";
import { DiagnosticsRvgSection } from "./DiagnosticsRvgSection";
import { DiagnosticsStudyList } from "./DiagnosticsStudyList";
import { DiagnosticsTabToolbar } from "./DiagnosticsTabToolbar";
import type { VisitDiagnosticsTabProps } from "./types";
import { useVisitDiagnosticsTab } from "./useVisitDiagnosticsTab";

export function VisitDiagnosticsTabView(props?: VisitDiagnosticsTabProps) {
	const state = useVisitDiagnosticsTab(props);

	return (
		<div
			data-testid="visit-diagnostics-tab"
			className="visit-diagnostics-tab bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] rounded-xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-2xs"
		>
			<DiagnosticsTabToolbar
				diagnosticMode={state.diagnosticMode}
				setDiagnosticMode={state.setDiagnosticMode}
				photoAttachmentsCount={state.photoAttachments.length}
				target={state.target}
				visitPatientId={state.visitPatientId}
				visitPatientName={state.visitPatientName}
				selectedPatientName={state.selectedPatientName}
				setSelectedPatientId={state.setSelectedPatientId}
				onOpenReportStudio={() => state.setIsReportStudioModalOpen(true)}
				onOpenRadiologyReferral={() => state.setIsRadiologyModalOpen(true)}
			/>

			<DiagnosticsStudyList
				patientStudies={state.patientStudies}
				photoAttachments={state.photoAttachments}
				effectiveTargetPatientId={state.effectiveTargetPatientId}
				visitPatientName={state.visitPatientName}
				onOpen3DScan={(url, title) => {
					state.setSelected3DScanModelUrl(url);
					state.setSelected3DScanTitle(title);
				}}
				onOpenCbct={() => state.setIsCtSelectorModalOpen(true)}
				onOpenDicom={(src) => {
					state.setSelectedDicomImageSrc(src);
					state.setIsDicomViewerModalOpen(true);
				}}
				onOpenPhotoProtocol={() => state.setIsPhotoProtocolModalOpen(true)}
				onRemovePhoto={state.handleRemovePhoto}
			/>

			<DiagnosticsRvgSection
				isVisible={state.diagnosticMode === "rvg"}
				initialToothNumber={state.initialToothNumber}
				target={state.target}
				visitPatientName={state.visitPatientName}
				selectedPatientName={state.selectedPatientName}
				activePatientId={state.activePatient?.id}
				activeVisitId={state.dashboard?.activeVisit?.id}
				onInsertToProtocol={props?.onInsertToProtocol}
				onOpenDirectRvg={() => state.setIsDirectRvgModalOpen(true)}
				onOpenHotFolder={() => state.setIsHotFolderModalOpen(true)}
				onOpenDicomViewer={() => state.setIsDicomViewerModalOpen(true)}
				onOpenRadiologyReferral={() => state.setIsRadiologyModalOpen(true)}
			/>

			<DiagnosticsPhotoSection
				isVisible={state.diagnosticMode === "photo"}
				photoAttachments={state.photoAttachments}
				selectedToothForPhoto={state.selectedToothForPhoto}
				setSelectedToothForPhoto={state.setSelectedToothForPhoto}
				selectedPhotoType={state.selectedPhotoType}
				setSelectedPhotoType={state.setSelectedPhotoType}
				photoComment={state.photoComment}
				setPhotoComment={state.setPhotoComment}
				onAddPhoto={state.handleAddPhoto}
				onRemovePhoto={state.handleRemovePhoto}
				onOpenPhotoProtocol={() => state.setIsPhotoProtocolModalOpen(true)}
			/>

			<DiagnosticsCbctSection
				isVisible={state.diagnosticMode === "cbct"}
				visitPatientId={state.visitPatientId}
				visitPatientName={state.visitPatientName}
				activePatientId={state.activePatient?.id}
				activePatientFullName={state.activePatient?.fullName}
				initialToothNumber={state.initialToothNumber}
				doctorName={state.dashboard?.activeDoctor?.fullName || state.ctx?.auth?.currentUser?.name}
				cbctMenuRef={state.cbctMenuRef}
				onOpenRadiologyReferral={() => state.setIsRadiologyModalOpen(true)}
				onOpenDicomViewer={() => state.setIsDicomViewerModalOpen(true)}
				onOpenCtSelector={() => state.setIsCtSelectorModalOpen(true)}
			/>

			<DiagnosticsCephSection
				isOpen={state.isAdvancedDiagnosticsOpen}
				setIsOpen={state.setIsAdvancedDiagnosticsOpen}
				onOpenCephModal={() => state.setIsCephModalOpen(true)}
			/>

			<DiagnosticsModalsHost
				activePatient={state.activePatient}
				visitPatientId={state.visitPatientId}
				visitPatientName={state.visitPatientName}
				ctx={state.ctx}
				dashboard={state.dashboard}
				initialToothNumber={state.initialToothNumber}
				patientStudies={state.patientStudies}
				photoAttachments={state.photoAttachments}
				setPhotoAttachments={state.setPhotoAttachments}
				onInsertToProtocol={props?.onInsertToProtocol}
				isCephModalOpen={state.isCephModalOpen}
				setIsCephModalOpen={state.setIsCephModalOpen}
				isRadiologyModalOpen={state.isRadiologyModalOpen}
				setIsRadiologyModalOpen={state.setIsRadiologyModalOpen}
				isReportStudioModalOpen={state.isReportStudioModalOpen}
				setIsReportStudioModalOpen={state.setIsReportStudioModalOpen}
				isPhotoProtocolModalOpen={state.isPhotoProtocolModalOpen}
				setIsPhotoProtocolModalOpen={state.setIsPhotoProtocolModalOpen}
				isCtSelectorModalOpen={state.isCtSelectorModalOpen}
				setIsCtSelectorModalOpen={state.setIsCtSelectorModalOpen}
				isDirectRvgModalOpen={state.isDirectRvgModalOpen}
				setIsDirectRvgModalOpen={state.setIsDirectRvgModalOpen}
				isDicomViewerModalOpen={state.isDicomViewerModalOpen}
				setIsDicomViewerModalOpen={state.setIsDicomViewerModalOpen}
				selectedDicomImageSrc={state.selectedDicomImageSrc}
				setSelectedDicomImageSrc={state.setSelectedDicomImageSrc}
				selected3DScanModelUrl={state.selected3DScanModelUrl}
				setSelected3DScanModelUrl={state.setSelected3DScanModelUrl}
				selected3DScanTitle={state.selected3DScanTitle}
				isHotFolderModalOpen={state.isHotFolderModalOpen}
				setIsHotFolderModalOpen={state.setIsHotFolderModalOpen}
			/>
		</div>
	);
}
