/**
 * PatientCreationModalView.tsx — Модальное окно создания и первичной регистрации пациента DENTE CRM.
 */

import { Calendar, Plus, Printer, Stethoscope } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { PatientCreationModalBody } from "./PatientCreationModalBody";
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

				<footer className="create-patient-modal-footer">
					{form.patientCreateGuidance && (
						<p className="quick-create-guidance patient-create-modal-guidance" id="patient-create-guidance" role="status" aria-live="polite">
							{form.patientCreateGuidance}
						</p>
					)}
					<div className="create-patient-modal-actions">
						<button type="button" className="secondary-button create-patient-cancel-btn" onClick={onClose}>
							Отмена
						</button>
						<button
							type="button"
							className="secondary-button quick-create-print-blank-contract-btn"
							onClick={form.handlePrintBlankContract}
							title="Распечатать бланк договора со строками «________» для зоны ожидания"
							data-testid="patient-creation-print-blank-contract-btn"
						>
							<Printer size={16} aria-hidden="true" />
							<span>Бланк договора («____»)</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-book-action"
							onClick={() => void form.handleCreateAndBook()}
							disabled={false}
							title="Создать карту и сразу открыть расписание с выбранным пациентом"
							data-testid="patient-creation-submit-and-book-btn"
						>
							<Calendar size={16} aria-hidden="true" />
							<span>Создать и записать</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-visit-action"
							onClick={() => void form.handleCreateAndOpenVisit()}
							disabled={false}
							title="Создать карту и сразу открыть приём (для дежурного врача)"
							data-testid="patient-creation-submit-and-visit-btn"
						>
							<Stethoscope size={16} aria-hidden="true" />
							<span>Создать и начать приём</span>
						</button>
						{form.duplicateConflict && (
							<button
								type="button"
								className="secondary-button !bg-amber-500/15 !text-amber-800 dark:!text-amber-200 !border-amber-500/40 hover:!bg-amber-500/25"
								onClick={() => void form.handleCreateAsNewDuplicate()}
								disabled={false}
								data-testid="footer-allow-duplicate-create-btn"
								title="Подтвердить создание новой карты для тёзки / однофамильца"
							>
								<span>Создать как однофамильца</span>
							</button>
						)}
						<button
							type="button"
							className="primary-button quick-create-action"
							onClick={() => void form.handleCreate()}
							disabled={false}
							aria-busy={form.isPatientCreating || undefined}
							aria-describedby={form.patientCreateGuidance ? "patient-create-guidance" : undefined}
							title={form.isPatientCreating ? "Создание карточки..." : "Создать медицинскую карту пациента"}
							data-testid="patient-creation-submit-btn"
						>
							<Plus size={18} aria-hidden="true" />
							<span>{form.isPatientCreating ? "Создание..." : "Создать пациента"}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export { PatientCreationModalView as PatientCreationModal, PatientCreationModalView as CreatePatientModal };
export default PatientCreationModalView;
