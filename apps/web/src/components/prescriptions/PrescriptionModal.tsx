/**
 * PrescriptionModal.tsx — Canonical Single Source of Truth for Medical Prescriptions
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Apple HIG)
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import React from "react";
import { createPortal } from "react-dom";
import { PrescriptionAllergyBanner } from "./PrescriptionAllergyBanner";
import { PrescriptionModalFooter } from "./PrescriptionModalFooter";
import { PrescriptionModalHeader } from "./PrescriptionModalHeader";
import type { PrescriptionModalProps } from "./prescriptionModalProps";
import type {
	PrescriptionDrugItem,
	PrescriptionFormType,
} from "./prescriptionPreviewTypes";
import { PrescriptionWorkbenchBody } from "./PrescriptionWorkbenchBody";
import { usePrescriptionCockpit } from "./usePrescriptionCockpit";

export type { PrescriptionModalProps, PrescriptionDrugItem, PrescriptionFormType };

export const PrescriptionModal: React.FC<PrescriptionModalProps> = (props) => {
	const c = usePrescriptionCockpit(props);
	if (!props.isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 prescription-modal prescription-form-107-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Рецептурный бланк на лекарства"
			data-testid="prescription-print-modal"
			data-modal="prescription-modal"
			id="prescription-modal"
		>
			<div
				data-testid="prescription-modal"
				className="flex flex-col w-full max-w-6xl h-[92dvh] sm:h-auto sm:max-h-[94vh] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden"
			>
				{/* Apple HIG Tactile Drag Handle */}
				<div className="sm:hidden w-full flex justify-center pt-3 pb-1.5 bg-[var(--paper-soft)] shrink-0 cursor-grab active:cursor-grabbing">
					<div className="w-10 h-1 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.5))]" />
				</div>

				<PrescriptionModalHeader
					patientName={c.patientName}
					patientCard={c.patientCard}
					diagnosisIcd10={props.diary?.diagnosisIcd10}
					resolvedPatientAllergies={c.resolvedPatientAllergies}
					activeForm={c.activeForm}
					onSelectForm={c.setActiveForm}
					onClose={props.onClose}
				/>

				{/* Mobile Segmented Tab Bar */}
				<div className="flex lg:hidden px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="dente-segmented-bar w-full">
						<button
							type="button"
							onClick={() => c.setMobileTab("catalog")}
							className={`dente-segmented-item ${c.mobileTab === "catalog" ? "active" : ""}`}
							data-active={c.mobileTab === "catalog"}
						>
							Каталог и наборы
						</button>
						<button
							type="button"
							onClick={() => c.setMobileTab("preview")}
							className={`dente-segmented-item ${c.mobileTab === "preview" ? "active" : ""}`}
							data-active={c.mobileTab === "preview"}
						>
							Предпросмотр бланка
						</button>
					</div>
				</div>

				{/* Allergy & Somatic Passive Warning Strip (Mandates 8e & 8y: Non-blocking ⚠️) */}
				<PrescriptionAllergyBanner
					allergyConflicts={c.allergyConflicts}
					somaticWarnings={c.somaticWarnings}
					ddiInteractions={(c.ddiSafetyAudit as { drugInteractions?: any[] } | null)?.drugInteractions}
					onAddGastroprotection={c.handleAddOmeprazoleGastroprotection}
				/>

				{/* Split Two-Column Workbench Body */}
				<PrescriptionWorkbenchBody
					c={c}
					diaryIcd10={props.diary?.diagnosisIcd10}
				/>

				<PrescriptionModalFooter
					isMemoCopied={c.isMemoCopied}
					onCopyPatientMemo={c.handleCopyPatientMemo}
					onInsertToDiary={() => c.handleInsertToDiary()}
					onPrintPatientMemo={c.handlePrintPatientMemo}
					onPrintPrescription={() => c.handlePrint()}
				/>
			</div>
		</div>
	);

	return props.disablePortal || typeof document === "undefined"
		? content
		: createPortal(content, document.body);
};

PrescriptionModal.displayName = "PrescriptionModal";
