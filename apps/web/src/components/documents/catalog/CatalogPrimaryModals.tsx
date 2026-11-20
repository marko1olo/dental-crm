import React from "react";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import type { DocumentClinicProfileRequisites } from "../tabs/formSwitch/documentFormSwitchTypes";
import { DocumentsStudioModal } from "../DocumentsStudioModal";
import { MedicalRecordStudioModal } from "../../emr/MedicalRecordStudioModal";
import type { ProfessionalA4DocumentTab } from "../types";

export interface CatalogPrimaryModalsProps {
	patient?: Patient | null | undefined;
	doctorName?: string | undefined;
	clinicProfileDraft?: DocumentClinicProfileRequisites | Record<string, unknown> | null | undefined;
	existingDocuments?: readonly GeneratedDocument[] | undefined;
	isLocalIntakeModalOpen: boolean;
	setIsLocalIntakeModalOpen: (open: boolean) => void;
	isOutpatientCardModalOpen: boolean;
	setIsOutpatientCardModalOpen: (open: boolean) => void;
	isContractModalOpen: boolean;
	setIsContractModalOpen: (open: boolean) => void;
	selectedA4Tab: ProfessionalA4DocumentTab | null;
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab | null) => void;
	onCreateDocument?: ((kind: DocumentKind) => void | Promise<void>) | undefined;
	onOpenIssuedDocumentHtml?: ((id: string) => void | Promise<void>) | undefined;
	handleOpenKind: (kind: DocumentKind) => void;
}

export function CatalogPrimaryModals({
	patient,
	doctorName,
	clinicProfileDraft,
	existingDocuments,
	isLocalIntakeModalOpen,
	setIsLocalIntakeModalOpen,
	isOutpatientCardModalOpen,
	setIsOutpatientCardModalOpen,
	isContractModalOpen,
	setIsContractModalOpen,
	selectedA4Tab,
	setSelectedA4Tab,
	onCreateDocument,
	onOpenIssuedDocumentHtml,
	handleOpenKind,
}: CatalogPrimaryModalsProps): React.JSX.Element {
	return (
		<>
			{isLocalIntakeModalOpen && (
				<DocumentsStudioModal
					isOpen={isLocalIntakeModalOpen}
					onClose={() => setIsLocalIntakeModalOpen(false)}
					patient={patient ?? undefined}
					doctorFullName={doctorName ?? undefined}
					clinicProfileDraft={(clinicProfileDraft as Record<string, unknown> | null | undefined) ?? undefined}
					initialTemplate="intake"
				/>
			)}
			{isOutpatientCardModalOpen && (
				<MedicalRecordStudioModal
					isOpen={isOutpatientCardModalOpen}
					onClose={() => setIsOutpatientCardModalOpen(false)}
					initialData={{
						passport: {
							patientFullName: patient?.fullName || "",
							patientBirthDate: patient?.birthDate || "",
							medicalCardNumber: patient?.id ? `K-${patient.id.slice(0, 6)}` : "",
							attendingDoctorFullName: doctorName || "",
						},
					}}
				/>
			)}
			{(selectedA4Tab || isContractModalOpen) && (
				<DocumentsStudioModal
					isOpen={Boolean(selectedA4Tab || isContractModalOpen)}
					onClose={() => {
						setSelectedA4Tab(null);
						setIsContractModalOpen(false);
					}}
					initialTemplate={selectedA4Tab === "act" ? "card_extract" : selectedA4Tab === "consent" ? "informed_consent" : "intake"}
					patient={patient ?? undefined}
					doctorFullName={doctorName ?? undefined}
					clinicProfileDraft={(clinicProfileDraft as Record<string, unknown> | null | undefined) ?? undefined}
				/>
			)}
		</>
	);
}
