/**
 * DENTE CRM — Canonical EzDent-i Consultation Split Workstation (RadiologyConsultationSplit)
 * Facade Architecture (Layer 5) — Mandate 8b (<120 lines facade limit)
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
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

	useEffect(() => {
		if (props.isOpen === false || (!props.isOpen && !props.asModal)) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				props.onClose?.();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [props.isOpen, props.asModal, props.onClose]);

	if (props.isOpen === false) return null;

	const content = (
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

	if (props.asModal || props.isOpen !== undefined) {
		if (typeof document === "undefined") return null;
		return createPortal(
			<div
				className="fixed inset-0 z-[99999] flex flex-col p-2 sm:p-4 select-none"
				style={{
					backgroundColor: "rgba(15, 23, 42, 0.72)",
					backdropFilter: "blur(4px)",
				}}
				onClick={(e) => {
					if (e.target === e.currentTarget) props.onClose?.();
				}}
			>
				<div
					className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#334155] shadow-2xl bg-[#020617]"
					style={{
						backgroundColor: "#020617",
						borderColor: "#334155",
					}}
					data-testid="visiograph-comparison-modal"
					role="dialog"
					aria-modal="true"
					aria-label="Сплит-сравнение визиограмм и консультация"
				>
					{content}
				</div>
			</div>,
			document.body,
		);
	}

	return content;
};

export default RadiologyConsultationSplit;
