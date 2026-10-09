/**
 * DENTE CRM — Canonical EzDent-i Radiology Report & Print Studio (RadiologyReportStudioModal)
 * Window #5: Interactive Layout Sheet & Strict Clinical A4 Medical Blank.
 *
 * Decomposed Module Facade (Layer 5): strictly <= 150 lines, preserves 100% export parity.
 * Mandate 8b (<800 lines per file), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import "./radiologyReport.css";
import {
	ReportA4PrintableSheet,
	ReportFilmstripTray,
	ReportPrintSettingsModal,
	ReportStudioContainer,
	ReportStudioToolbar,
	useReportStudioState,
} from "./reportStudio";
import type {
	LegendPlacementOption,
	OrientationOption,
	PageSizeOption,
	RadiologyReportStudioModalProps,
	ReportFrameItem,
	ReportPrintSettings,
} from "./reportStudio";

export type {
	PageSizeOption,
	OrientationOption,
	LegendPlacementOption,
	ReportPrintSettings,
	ReportFrameItem,
	RadiologyReportStudioModalProps,
};

export const RadiologyReportStudioModal: React.FC<RadiologyReportStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Ковалёв Роман Станиславович",
	patientCardNumber = "МК-РАТ-1",
	patientAge = "58Y",
	patientGender = "Муж.",
	doctorName = "Д-р Воронов Алексей Владимирович",
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	clinicPhone = "+7 (495) 123-45-67",
	clinicAddress = "г. Москва, Столярный переулок, д. 14",
	clinicWebsite = "www.dente-clinic.ru",
	initialImages = [],
}) => {
	const {
		settings,
		setSettings,
		isSettingsOpen,
		setIsSettingsOpen,
		viewZoom,
		setViewZoom,
		activeLayout,
		conclusionText,
		setConclusionText,
		frames,
		selectedFrameId,
		setSelectedFrameId,
		availableStudies,
		selectedStudyIndex,
		sheetRef,
		handleSelectStudyFromFilmstrip,
		handleApplyLayout,
		handleAddImageFrame,
		handleAddTextFrame,
		handleDeleteSelected,
		handleResetFrames,
		startMove,
		startResize,
		handleMouseMove,
		handleMouseUp,
		handlePrint,
		handleExportPdf,
	} = useReportStudioState({
		isOpen,
		onClose,
		initialImages,
	});

	if (!isOpen) return null;

	return (
		<ReportStudioContainer onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
			<ReportStudioToolbar
				settings={settings}
				activeLayout={activeLayout}
				onApplyLayout={handleApplyLayout}
				onAddImageFrame={handleAddImageFrame}
				onAddTextFrame={handleAddTextFrame}
				onResetFrames={handleResetFrames}
				hasSelectedFrame={Boolean(selectedFrameId)}
				onDeleteSelected={handleDeleteSelected}
				viewZoom={viewZoom}
				onZoomChange={setViewZoom}
				onOpenSettings={() => setIsSettingsOpen(true)}
				onExportPdf={handleExportPdf}
				onPrint={handlePrint}
				onClose={onClose}
			/>

			<main className="radiology-report-canvas-area" onClick={() => setSelectedFrameId(null)}>
				<ReportA4PrintableSheet
					sheetRef={sheetRef}
					settings={settings}
					viewZoom={viewZoom}
					patientName={patientName}
					patientCardNumber={patientCardNumber}
					patientAge={patientAge}
					patientGender={patientGender}
					doctorName={doctorName}
					clinicName={clinicName}
					clinicPhone={clinicPhone}
					clinicAddress={clinicAddress}
					clinicWebsite={clinicWebsite}
					frames={frames}
					selectedFrameId={selectedFrameId}
					conclusionText={conclusionText}
					onChangeConclusionText={setConclusionText}
					onStartMove={startMove}
					onStartResize={startResize}
				/>
			</main>

			<ReportFilmstripTray
				availableStudies={availableStudies}
				selectedStudyIndex={selectedStudyIndex}
				onSelectStudy={handleSelectStudyFromFilmstrip}
				onInsertStudy={handleSelectStudyFromFilmstrip}
			/>

			<ReportPrintSettingsModal
				isOpen={isSettingsOpen}
				settings={settings}
				onClose={() => setIsSettingsOpen(false)}
				onUpdateSettings={setSettings}
			/>
		</ReportStudioContainer>
	);
};
