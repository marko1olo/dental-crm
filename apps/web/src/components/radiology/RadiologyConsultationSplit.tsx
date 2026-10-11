/**
 * DENTE CRM — Canonical EzDent-i Consultation Split Workstation (RadiologyConsultationSplit)
 * Facade Architecture (Layer 5) — Mandate 8b (<120 lines facade limit)
 */

import React from "react";
import { ConsultationBottomDock } from "./ConsultationBottomDock.js";
import {
	type ConsultationSlot,
	type ViewportAnnotation,
	type ViewportState,
	type RadiologyConsultationSplitProps,
	useRadiologyConsultationSplitController,
	ConsultationHeaderToolbar,
	ConsultationViewerSplitPane,
	ConsultationNotesSidePanel,
	ConsultationParticipantsBar,
} from "./radiologyConsultationSplitModules/index.js";

export type { ConsultationSlot, ViewportAnnotation, ViewportState, RadiologyConsultationSplitProps };

export const RadiologyConsultationSplit: React.FC<RadiologyConsultationSplitProps> = (props) => {
	const ctrl = useRadiologyConsultationSplitController(props);

	return (
		<div
			ref={ctrl.containerRef}
			data-testid="radiology-consultation-split"
			data-theme="dark"
			style={{
				position: ctrl.isFullscreen ? "fixed" : "relative",
				inset: ctrl.isFullscreen ? 0 : "auto",
				zIndex: ctrl.isFullscreen ? 99999 : "auto",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#020617",
				color: "#f8fafc",
				userSelect: "none",
				overflow: "hidden",
			}}
			className="radiology-consultation-split dark"
		>
			<ConsultationHeaderToolbar
				patientName={ctrl.patientName}
				patientCardNumber={ctrl.patientCardNumber}
				patientAge={ctrl.patientAge}
				patientGender={ctrl.resolvedGender}
				activeSlot={ctrl.activeSlot}
				onSelectSlot={ctrl.setActiveSlot}
				splitMode={ctrl.splitMode}
				onToggleSplitMode={ctrl.handleToggleSplitMode}
				activeTool={ctrl.activeTool}
				onSelectTool={ctrl.setActiveTool}
				isSyncNav={ctrl.isSyncNav}
				onToggleSyncNav={() => ctrl.setIsSyncNav((prev) => !prev)}
				onResetView={ctrl.handleResetView}
				onToggleInvert={ctrl.handleToggleInvert}
				onClearAnnotations={ctrl.handleClearAnnotations}
				onTakeSnapshot={ctrl.handleTakeSnapshot}
				onInsertProtocol={ctrl.handleInsertConsultationNote}
				isFullscreen={ctrl.isFullscreen}
				onToggleFullscreen={() => ctrl.setIsFullscreen((prev) => !prev)}
				onClose={ctrl.onClose}
			/>

			<ConsultationParticipantsBar
				participants={ctrl.participants}
				isSyncNav={ctrl.isSyncNav}
				onToggleNotesPanel={() => ctrl.setIsNotesPanelOpen((prev) => !prev)}
				notesCount={ctrl.notes.length}
			/>

			<div className="flex-1 flex overflow-hidden relative">
				<ConsultationViewerSplitPane
					activeSlot={ctrl.activeSlot}
					leftViewport={ctrl.leftViewport}
					rightViewport={ctrl.rightViewport}
					splitMode={ctrl.splitMode}
					leftCanvasRef={ctrl.leftCanvasRef}
					rightCanvasRef={ctrl.rightCanvasRef}
					activeTool={ctrl.activeTool}
					onSelectSlot={ctrl.setActiveSlot}
					onWheel={ctrl.handleViewportWheel}
					onMouseDown={ctrl.handleCanvasMouseDown}
					onMouseMove={ctrl.handleCanvasMouseMove}
					onMouseUp={ctrl.handleCanvasMouseUp}
				/>

				<ConsultationNotesSidePanel
					isOpen={ctrl.isNotesPanelOpen}
					notes={ctrl.notes}
					activeToothFdi={ctrl.activeToothFdi}
					onClose={() => ctrl.setIsNotesPanelOpen(false)}
					onAddNote={ctrl.handleAddNote}
				/>
			</div>

			<ConsultationBottomDock
				activeSlot={ctrl.activeSlot}
				activeStudySrc={ctrl.activeStudySrc}
				patientStudiesHistory={ctrl.effectivePatientStudies}
				selectedDiscipline={ctrl.selectedDiscipline}
				onSelectDiscipline={ctrl.setSelectedDiscipline}
				onSelectCapturedStudy={ctrl.handleSelectCapturedStudy}
				onSelectPathology={ctrl.handleSelectPathology}
				splitMode={ctrl.splitMode}
				onAssignStudyToSlot={ctrl.handleAssignStudyToSlot}
			/>
		</div>
	);
};

export default RadiologyConsultationSplit;
