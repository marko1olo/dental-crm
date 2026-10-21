import React from "react";
import type { Patient, GeneratedDocument, DocumentKind } from "@dental/shared";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import type { TaxPaymentRecord } from "../taxCertificateEngine";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import { ConsentModal } from "../../consents/ConsentModal";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";
import { PrimaryIntakePackageModal } from "../PrimaryIntakePackageModal";
import { OutpatientCardPrintModal } from "../OutpatientCardPrintModal";
import { DocumentA4PrintPreviewModal } from "../DocumentA4PrintPreviewModal";

export interface CatalogModalsProps {
	patient?: Patient | null | undefined;
	effectivePatientName: string;
	patientAgeYears: number;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	clinicProfileDraft?: any | undefined;
	existingDocuments?: readonly GeneratedDocument[] | undefined;
	mappedTaxPayments?: TaxPaymentRecord[] | undefined;
	isDiplomaModalOpen: boolean;
	setIsDiplomaModalOpen: (open: boolean) => void;
	isConsentModalOpen: boolean;
	setIsConsentModalOpen: (open: boolean) => void;
	isLocalTaxModalOpen: boolean;
	setIsLocalTaxModalOpen: (open: boolean) => void;
	taxInitialTab: TaxDeductionTab;
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

export function CatalogModals(props: CatalogModalsProps) {
	const {
		patient, effectivePatientName, patientAgeYears, doctorName, clinicName,
		clinicProfileDraft, existingDocuments, mappedTaxPayments, isDiplomaModalOpen,
		setIsDiplomaModalOpen, isConsentModalOpen, setIsConsentModalOpen,
		isLocalTaxModalOpen, setIsLocalTaxModalOpen, taxInitialTab, isLocalIntakeModalOpen,
		setIsLocalIntakeModalOpen, isOutpatientCardModalOpen, setIsOutpatientCardModalOpen,
		isContractModalOpen, setIsContractModalOpen, selectedA4Tab, setSelectedA4Tab,
		onCreateDocument, onOpenIssuedDocumentHtml, handleOpenKind,
	} = props;

	const effectivePatientInn =
		patient?.administrativeProfile?.taxpayerInn ??
		(patient as { inn?: string | null } | null | undefined)?.inn ??
		(patient as { details?: { inn?: string | null } } | null | undefined)?.details?.inn ??
		"";

	const effectivePatientSnils =
		patient?.administrativeProfile?.snils ??
		(patient as { snils?: string | null } | null | undefined)?.snils ??
		(patient as { details?: { snils?: string | null } } | null | undefined)?.details?.snils ??
		"";

	return (
		<>
			{isDiplomaModalOpen && (
				<PediatricBraveryDiplomaModal
					isOpen={isDiplomaModalOpen} onClose={() => setIsDiplomaModalOpen(false)}
					patientName={effectivePatientName} patientAgeYears={patientAgeYears}
					doctorName={doctorName} clinicName={clinicName}
				/>
			)}
			{isConsentModalOpen && (
				<ConsentModal
					isOpen={isConsentModalOpen} onClose={() => setIsConsentModalOpen(false)}
					patient={{ fullName: effectivePatientName, phone: patient?.phone, birthDate: patient?.birthDate }}
					doctorName={doctorName} clinicName={clinicName} isMinorPatient={patientAgeYears < 15}
				/>
			)}
			{isLocalTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={isLocalTaxModalOpen} onClose={() => setIsLocalTaxModalOpen(false)}
					initialTab={taxInitialTab} patientName={effectivePatientName}
					patientBirthDate={patient?.birthDate ?? undefined} patientInn={effectivePatientInn}
					patientSnils={effectivePatientSnils} patientId={patient?.id}
					clinicName={clinicProfileDraft?.legalEntityName || clinicProfileDraft?.name || clinicName || ""}
					clinicInn={clinicProfileDraft?.inn || ""} clinicKpp={clinicProfileDraft?.kpp || ""}
					clinicOgrn={clinicProfileDraft?.ogrn || ""} clinicLicenseNumber={clinicProfileDraft?.licenseNumber || clinicProfileDraft?.medicalLicenseNumber || ""}
					clinicLicenseDate={clinicProfileDraft?.licenseDate || clinicProfileDraft?.medicalLicenseIssuedAt || ""} clinicAddress={clinicProfileDraft?.address || ""}
					chiefDoctorName={doctorName || ""} payments={mappedTaxPayments}
				/>
			)}
			{isLocalIntakeModalOpen && (
				<PrimaryIntakePackageModal
					isOpen={isLocalIntakeModalOpen} onClose={() => setIsLocalIntakeModalOpen(false)}
					patient={patient ?? null} existingDocuments={existingDocuments ? [...existingDocuments] : []}
					onCreateDocument={(kind) => (onCreateDocument ? void onCreateDocument(kind) : handleOpenKind(kind))}
					onOpenDocument={(id) => (onOpenIssuedDocumentHtml ? void onOpenIssuedDocumentHtml(id) : undefined)}
					onSelectDocumentKind={(kind) => handleOpenKind(kind)}
					doctorFullName={doctorName} clinicProfileDraft={clinicProfileDraft}
				/>
			)}
			{isOutpatientCardModalOpen && (
				<OutpatientCardPrintModal
					isOpen={isOutpatientCardModalOpen} onClose={() => setIsOutpatientCardModalOpen(false)}
					patient={patient ?? null} doctorFullName={doctorName ?? null} clinicProfileDraft={clinicProfileDraft}
				/>
			)}
			{(selectedA4Tab || isContractModalOpen) && (
				<DocumentA4PrintPreviewModal
					isOpen={Boolean(selectedA4Tab || isContractModalOpen)}
					onClose={() => { setSelectedA4Tab(null); setIsContractModalOpen(false); }}
					initialTab={selectedA4Tab || "contract"} patient={patient ?? null}
					doctorFullName={doctorName ?? null} clinicProfileDraft={clinicProfileDraft}
					existingDocuments={existingDocuments}
				/>
			)}
		</>
	);
}
