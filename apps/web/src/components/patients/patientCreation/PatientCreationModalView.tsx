/**
 * PatientCreationModalView.tsx — Модальное окно создания и первичной регистрации пациента DENTE CRM.
 */

import React from "react";
import { createPortal } from "react-dom";
import { PatientCreationModalBody } from "./PatientCreationModalBody";
import { PatientCreationModalFooter } from "./PatientCreationModalFooter";
import { PatientCreationModalHeader } from "./PatientCreationModalHeader";
import type { PatientCreationModalProps } from "./types";
import { usePatientCreationForm } from "./usePatientCreationForm";

export function PatientCreationModalView(props: PatientCreationModalProps) {
	const { isOpen, onClose, updatePatientCoreDraft } = props;
	const form = usePatientCreationForm(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="create-patient-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-patient-modal-title"
			data-testid="patient-creation-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="create-patient-modal-card" data-testid="create-patient-modal-shell">
				<PatientCreationModalHeader onClose={onClose} />

				<PatientCreationModalBody form={form} updatePatientCoreDraft={updatePatientCoreDraft} onClose={onClose} />

				<PatientCreationModalFooter
					patientCreateGuidance={form.patientCreateGuidance}
					onClose={onClose}
					handlePrintBlankContract={form.handlePrintBlankContract}
					handleCreateAndBook={form.handleCreateAndBook}
					handleCreateAndOpenVisit={form.handleCreateAndOpenVisit}
					duplicateConflict={form.duplicateConflict}
					handleCreateAsNewDuplicate={form.handleCreateAsNewDuplicate}
					handleCreate={form.handleCreate}
					isPatientCreating={form.isPatientCreating}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export { PatientCreationModalView as PatientCreationModal, PatientCreationModalView as CreatePatientModal };
export default PatientCreationModalView;
