import React from "react";
import type { Form043VisitDiaryEntry } from "../emr043Types";
import type { MedicalRecordPrintModalProps } from "./recordModalTypes";
import { useMedicalRecordModal } from "./useMedicalRecordModal";
import { RecordModalHeader } from "./RecordModalHeader";
import { RecordNavTabs } from "./RecordNavTabs";
import { RecordCompletenessBar } from "./RecordCompletenessBar";
import { RecordModalBody } from "./RecordModalBody";
import { EmrProtocolGeneratorModal } from "../protocolGenerator/EmrProtocolGeneratorModal";
import "../emr043Styles.css";

export const MedicalRecordPrintModal: React.FC<MedicalRecordPrintModalProps> = React.memo(
	function MedicalRecordPrintModal({
		isOpen,
		onClose,
		initialData,
		onSave,
		readOnly: _readOnly,
		onOpenProtocolGenerator,
		isLocked,
		isDraft,
		status,
	}) {
		const m = useMedicalRecordModal({ initialData, onSave, isLocked, isDraft, status });

		if (!isOpen) return null;

		// Anti-Matryoshka (Sin 6, Mandate 8d): Render child modals sequentially (depth strictly 1).
		if (m.isProtocolGeneratorOpen) {
			return (
				<EmrProtocolGeneratorModal
					isOpen={true}
					onClose={() => m.setIsProtocolGeneratorOpen(false)}
					patientFullName={m.formData.passport.patientFullName}
					patientBirthDate={m.formData.passport.patientBirthDate}
					medicalCardNumber={m.formData.passport.medicalCardNumber}
					doctorFullName={m.formData.passport.attendingDoctorFullName}
					doctorSpecialty={m.formData.passport.attendingDoctorSpecialty}
					odontogramTeeth={m.formData.dentalStatus.odontogramTeeth}
					onApplyDiary={(newDiary) => {
						m.setFormData((prev) => {
							const updated = { ...prev, visitDiaries: [newDiary as Form043VisitDiaryEntry, ...prev.visitDiaries] };
							onSave?.(updated);
							return updated;
						});
						m.setIsProtocolGeneratorOpen(false);
					}}
					onApplyBatchDiaries={(newDiaries) => {
						m.setFormData((prev) => {
							const updated = { ...prev, visitDiaries: [...(newDiaries as Form043VisitDiaryEntry[]), ...prev.visitDiaries] };
							onSave?.(updated);
							return updated;
						});
						m.setIsProtocolGeneratorOpen(false);
					}}
				/>
			);
		}

		return (
			<div className="emr043-modal-backdrop" role="dialog" aria-modal="true">
				<div
					className="emr043-modal-window"
					style={{
						maxWidth: m.isFullscreen ? "100%" : "1240px",
						height: m.isFullscreen ? "98vh" : "94vh",
					}}
				>
					{/* Tactile drag handle для мобильной шторки (Apple HIG) */}
					<div className="emr043-drag-handle sm:hidden" aria-hidden="true" />

					<RecordModalHeader
						formData={m.formData}
						effectiveIsDraft={m.effectiveIsDraft}
						ageText={m.ageText}
						activeTab={m.activeTab}
						zoomScale={m.zoomScale}
						setZoomScale={m.setZoomScale}
						isFullscreen={m.isFullscreen}
						setIsFullscreen={m.setIsFullscreen}
						copiedToast={m.copiedToast}
						isMoreMenuOpen={m.isMoreMenuOpen}
						setIsMoreMenuOpen={m.setIsMoreMenuOpen}
						hasOnSave={Boolean(onSave)}
						onApplyNorm={m.handleApplyNorm}
						onSaveForm={m.handleSaveForm}
						onPrint={m.handlePrint}
						onExportXml={m.handleExportXml}
						onExportJson={m.handleExportJson}
						onCopyText={m.handleCopyText}
						onClose={onClose}
					/>

					<RecordNavTabs activeTab={m.activeTab} onSelectTab={m.setActiveTab} diariesCount={m.formData.visitDiaries.length} />

					<RecordCompletenessBar validation={m.validation} onApplyNorm={m.handleApplyNorm} />

					<RecordModalBody
						activeTab={m.activeTab}
						formData={m.formData}
						zoomScale={m.zoomScale}
						effectiveIsDraft={m.effectiveIsDraft}
						ageText={m.ageText}
						dmft={m.dmft}
						cpitn={m.cpitn}
						onApplyNorm={m.handleApplyNorm}
						onOpenProtocolGenerator={onOpenProtocolGenerator}
						onOpenInternalProtocolGenerator={() => m.setIsProtocolGeneratorOpen(true)}
						onAddDiary={m.handleAddDiary}
						onDeleteDiary={m.handleDeleteDiary}
					/>
				</div>
			</div>
		);
	},
);

export const Form043PrintModal = MedicalRecordPrintModal;
