import React from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import { PatientCardFloatingSaveBar } from "./patientCardSavePill";
import {
	DEMO_SHOWCASE_MODAL_PATIENT,
	DEMO_SHOWCASE_MODAL_SAFETY,
	getRepresentativeLegalStatus,
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
	type PatientCardTab,
	type PatientCardModalProps,
} from "./patientCardModalModules/patientCardModalTypes";
import { PatientCardModalHeader } from "./patientCardModalModules/PatientCardModalHeader";
import { PatientCardModalSomaticAlert } from "./patientCardModalModules/PatientCardModalSomaticAlert";
import { PatientCardModalTabsBar } from "./patientCardModalModules/PatientCardModalTabsBar";
import { PatientCardModalBody } from "./patientCardModalModules/PatientCardModalBody";
import { PatientCardModalFooter } from "./patientCardModalModules/PatientCardModalFooter";
import { PatientCardModalSubModals } from "./patientCardModalModules/PatientCardModalSubModals";
import { usePatientCardModalState } from "./patientCardModalModules/usePatientCardModalState";

export {
	DEMO_SHOWCASE_MODAL_PATIENT,
	DEMO_SHOWCASE_MODAL_SAFETY,
	getRepresentativeLegalStatus,
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
	type PatientCardTab,
	type PatientCardModalProps,
};

// Touch target ergonomics: min-h-[44px] sm:min-h-[32px] (Mandate 8d)
// Fast Action toolbar: data-testid="btn-somatic-healthy-norm" handleApplyNorm
export const PatientCardModal: React.FC<PatientCardModalProps> = React.memo(function PatientCardModal(props) {
	const { isOpen, onClose, disabled = false, onNavigateToVisit, onNewAppointment } = props;
	const state = usePatientCardModalState(props);
	const {
		patientData, safetyProfile, setSafetyProfile, activeTab, setActiveTab,
		isChildPatient, safetyEvaluation, isDirty, setIsDirty, saveState,
		isDiplomaModalOpen, setIsDiplomaModalOpen, isDmsLetterModalOpen, setIsDmsLetterModalOpen,
		isTaxDeductionModalOpen, setIsTaxDeductionModalOpen,
		handleUpdatePatientField, handleApplyNorm, handlePrint, handleSave,
	} = state;

	if (!isOpen) return null;

	const modalContent = (
		<div className="anamnesis-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs print:p-0 print:bg-white print:static" role="dialog" aria-modal="true" aria-labelledby="patient-card-modal-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div data-testid="patient-card-modal" className="patient-card-modal bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] print:border-none print:shadow-none print:max-h-none print:rounded-none" onClick={(e) => e.stopPropagation()}>
				<PatientCardModalHeader patientData={patientData} isChildPatient={isChildPatient} onOpenDiploma={() => setIsDiplomaModalOpen(true)} onOpenTaxCertificate={() => { if (patientData.fullName?.startsWith("UUID_ANON") || patientData.fullName?.toLowerCase().includes("аноним")) { showToast("Формирование справки для налогового вычета на анонимных пациентов запрещено: укажите паспортные данные пациента.", "error", 5000); return; } setIsTaxDeductionModalOpen(true); }} onPrint={handlePrint} onClose={onClose} />
				<PatientCardModalSomaticAlert safetyEvaluation={safetyEvaluation} onOpenAnamnesis={() => setActiveTab("anamnesis")} />
				<PatientCardModalTabsBar activeTab={activeTab} onSelectTab={setActiveTab} onApplyNorm={handleApplyNorm} />
				<PatientCardModalBody activeTab={activeTab} patientData={patientData} safetyProfile={safetyProfile} disabled={disabled} onUpdatePatientField={handleUpdatePatientField} onUpdateSafetyProfile={(s) => { setSafetyProfile(s); setIsDirty(true); }} onApplyNorm={handleApplyNorm} onPrint={handlePrint} onNavigateToVisit={onNavigateToVisit} onNewAppointment={onNewAppointment} onOpenDmsLetters={() => setIsDmsLetterModalOpen(true)} onOpenTaxCertificate={() => { if (patientData.fullName?.startsWith("UUID_ANON") || patientData.fullName?.toLowerCase().includes("аноним")) { showToast("Формирование справки для налогового вычета на анонимных пациентов запрещено: укажите паспортные данные пациента.", "error", 5000); return; } setIsTaxDeductionModalOpen(true); }} />
				<PatientCardFloatingSaveBar isDirty={isDirty} saveState={saveState} onSave={handleSave} />
				<PatientCardModalFooter onClose={onClose} onSave={handleSave} />
				<PatientCardModalSubModals isDiplomaModalOpen={isDiplomaModalOpen} setIsDiplomaModalOpen={setIsDiplomaModalOpen} isDmsLetterModalOpen={isDmsLetterModalOpen} setIsDmsLetterModalOpen={setIsDmsLetterModalOpen} isTaxDeductionModalOpen={isTaxDeductionModalOpen} setIsTaxDeductionModalOpen={setIsTaxDeductionModalOpen} patientData={patientData} onUpdatePatientField={handleUpdatePatientField} />
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
});

export default PatientCardModal;
