/**
 * PrescriptionModal.tsx — Canonical Single Source of Truth for Medical Prescriptions
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Apple HIG)
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import type React from "react";
import { createPortal } from "react-dom";
import type { DiaryState } from "../useVisitDiaryLogic";
import { PrescriptionAllergyBanner } from "./PrescriptionAllergyBanner";
import { PrescriptionModalFooter } from "./PrescriptionModalFooter";
import { PrescriptionModalHeader } from "./PrescriptionModalHeader";
import type {
	PrescriptionDrugItem,
	PrescriptionFormType,
} from "./prescriptionPreviewTypes";
import { PrescriptionWorkbenchBody } from "./PrescriptionWorkbenchBody";
import { usePrescriptionCockpit } from "./usePrescriptionCockpit";

export type { PrescriptionDrugItem, PrescriptionFormType };

export interface PrescriptionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?:
		| {
				readonly id?: string | null | undefined;
				readonly fullName?: string | null | undefined;
				readonly birthDate?: string | null | undefined;
				readonly cardNumber?: string | null | undefined;
				readonly medicalCardNumber?: string | null | undefined;
				readonly passport?: string | null | undefined;
				readonly address?: string | null | undefined;
				readonly phone?: string | null | undefined;
				readonly gender?: string | null | undefined;
				readonly snils?: string | null | undefined;
				readonly omsPolicy?: string | null | undefined;
				readonly allergies?:
					| readonly string[]
					| string[]
					| string
					| null
					| undefined;
				readonly weightKg?: number | null | undefined;
		  }
		| null
		| undefined;
	readonly allergies?: readonly string[] | string[] | string | null | undefined;
	readonly diary?:
		| (
				| DiaryState
				| {
						readonly diagnosisIcd10?: string | null | undefined;
						readonly treatmentDescription?: string | null | undefined;
						readonly anamnesis?: string | null | undefined;
						readonly statusLocalis?: string | null | undefined;
				  }
				| null
		  )
		| undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly doctorSnils?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly medicalLicenseNumber?: string | null | undefined;
	readonly initialSelectedDrugIds?: readonly string[] | undefined;
	readonly patientName?: string | null | undefined;
	readonly disablePortal?: boolean | undefined;
	readonly onPrescriptionCreated?:
		| ((prescription: unknown) => void)
		| undefined;
	readonly onInsertToDiary?: ((diaryText: string) => void) | undefined;
}

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
				className="flex flex-col w-full max-w-6xl h-[94vh] sm:h-auto sm:max-h-[94vh] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden"
			>
				{/* Mobile Drag Handle */}
				<div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-[var(--paper-soft)] shrink-0">
					<div className="w-10 h-1 rounded-full bg-[var(--line-strong)] opacity-60" />
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
