import React from "react";
import { ORTHODONTIC_8_ANGLES } from "@dental/shared";
import {
	ORTHODONTIC_CLINICAL_PRESETS,
	generateOrthodonticDiaryNote,
} from "./orthodonticPresets";
import { OrthoFindingsAccordion } from "./OrthoFindingsAccordion";
import { OrthoBeforeAfterComparison } from "./OrthoBeforeAfterComparison";
import { OrthoModalHeader } from "./orthoModal/OrthoModalHeader";
import { OrthoModalToolbar } from "./orthoModal/OrthoModalToolbar";
import { OrthoPlanRibbon } from "./orthoModal/OrthoPlanRibbon";
import { OrthoPresetsBar } from "./orthoModal/OrthoPresetsBar";
import { Ortho8SlotGrid } from "./orthoModal/Ortho8SlotGrid";
import { OrthoModalFooter } from "./orthoModal/OrthoModalFooter";
import { useOrthoSessionState } from "./orthoModal/useOrthoSessionState";
import { useOrthoSlotActions } from "./orthoModal/useOrthoSlotActions";
import { useOrthoProtocolActions } from "./orthoModal/useOrthoProtocolActions";
import { useOrthoModalUi } from "./orthoModal/useOrthoModalUi";
import type { OrthodonticPhotoProtocolModalProps } from "./orthoModal/orthoModalTypes";

if (typeof document !== "undefined") {
	import("./photoProtocol.css");
}

export * from "./orthodonticPresets";
export * from "./OrthoFindingsAccordion";
export * from "./OrthoPhotoSlotCard";
export * from "./OrthoBeforeAfterComparison";
export * from "./orthoModal/orthoModalTypes";

export const OrthodonticPhotoProtocolModal: React.FC<OrthodonticPhotoProtocolModalProps> = ({
	isOpen,
	onClose,
	patientId = "",
	patientName: propPatientName,
	doctorName: propDoctorName,
	clinicName: propClinicName,
	initialSession,
	previousSession,
	treatmentPlanId,
	treatmentPlanStageId,
	treatmentStageTitle = "Этап 1: Нивелирование и выравнивание зубных рядов",
	onSaveSession,
	onInsertProtocol043,
}) => {
	const patientName = (propPatientName && propPatientName.trim()) || "Пациент";
	const doctorName = (propDoctorName && propDoctorName.trim()) || "Лечащий врач-ортодонт";
	const clinicName = (propClinicName && propClinicName.trim()) || "Стоматологическая клиника";

	const { session, setSession, handleStageChange, handleFindingsChange } = useOrthoSessionState({
		patientId, patientName, doctorName, clinicName, initialSession, treatmentPlanId, treatmentPlanStageId, treatmentStageTitle, isOpen,
	});

	const slotActions = useOrthoSlotActions({ session, setSession });
	const ui = useOrthoModalUi({ session, setSession, handleStageChange });

	const { handleInsertProtocol043, handleCopyProtocolToClipboard, handleExportPresentation, handleSave } =
		useOrthoProtocolActions({ session, activePreset: ui.activePreset, insertProtocolOnSave: ui.insertProtocolOnSave, onInsertProtocol043, onSaveSession, onClose });

	if (!isOpen) return null;

	const filteredAngles = ORTHODONTIC_8_ANGLES.filter((a) =>
		ui.activeCategoryFilter === "all" ? true : a.category === ui.activeCategoryFilter,
	);

	return (
		<div className="ortho-photo-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
			<div className="ortho-photo-modal-container" onClick={(e) => e.stopPropagation()} data-testid="orthodontic-photo-protocol-modal">
				<input type="file" ref={slotActions.fileInputRef} onChange={slotActions.handleFileInputChange} accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} />
				<OrthoModalHeader session={session} patientName={patientName} doctorName={doctorName} clinicName={clinicName} onExportPresentation={handleExportPresentation} onClose={onClose} />
				<OrthoModalToolbar stage={session.stage} onStageChange={handleStageChange} activeCategoryFilter={ui.activeCategoryFilter} setActiveCategoryFilter={ui.setActiveCategoryFilter} isCompareMode={ui.isCompareMode} setIsCompareMode={ui.setIsCompareMode} globalGuidelinesEnabled={ui.globalGuidelinesEnabled} setGlobalGuidelinesEnabled={ui.setGlobalGuidelinesEnabled} />
				<div className="ortho-modal-body">
					{ui.isCompareMode && (
						<OrthoBeforeAfterComparison session={session} previousSession={previousSession} onUploadAngle={(angleId) => slotActions.triggerUploadForAngle(angleId)} onCloseCompare={() => ui.setIsCompareMode(false)} />
					)}
					<OrthoPlanRibbon session={session} completeness={ui.completeness} />
					<OrthoPresetsBar session={session} activePreset={ui.activePreset} onSelectPreset={ui.handleSelectPreset} showPresetPreview={ui.showPresetPreview} setShowPresetPreview={ui.setShowPresetPreview} onCopyProtocol={handleCopyProtocolToClipboard} />
					<Ortho8SlotGrid filteredAngles={filteredAngles} session={session} dragOverSlotId={slotActions.dragOverSlotId} openMenuSlotId={ui.openMenuSlotId} globalGuidelinesEnabled={ui.globalGuidelinesEnabled} setOpenMenuSlotId={ui.setOpenMenuSlotId} setDragOverSlotId={slotActions.setDragOverSlotId} handleDrop={slotActions.handleDrop} triggerUploadForAngle={slotActions.triggerUploadForAngle} handleRotateSlot={slotActions.handleRotateSlot} handleFlipHorizontal={slotActions.handleFlipHorizontal} handleZoomChange={slotActions.handleZoomChange} handleDeletePhoto={slotActions.handleDeletePhoto} />
					<OrthoFindingsAccordion session={session} showFindingsAccordion={ui.showFindingsAccordion} onToggleAccordion={() => ui.setShowFindingsAccordion((prev) => !prev)} onFindingsChange={(field, value) => handleFindingsChange(field as any, value as any)} />
				</div>
				<OrthoModalFooter insertProtocolOnSave={ui.insertProtocolOnSave} setInsertProtocolOnSave={ui.setInsertProtocolOnSave} onInsertProtocol043={() => handleInsertProtocol043()} onClose={onClose} onSave={handleSave} />
			</div>
		</div>
	);
};

export const ORTHO_CLINICAL_PRESETS = ORTHODONTIC_CLINICAL_PRESETS;
export const generateOrthoDiaryText = generateOrthodonticDiaryNote;
export const OrthoPhotoProtocolModal = OrthodonticPhotoProtocolModal;
export default OrthodonticPhotoProtocolModal;
