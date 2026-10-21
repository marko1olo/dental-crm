import type React from "react";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { TaxPaymentRecord } from "../taxCertificateEngine";
import { CatalogPrimaryModals } from "./CatalogPrimaryModals";
import { CatalogUtilityModals } from "./CatalogUtilityModals";
import { useCatalogModalsData } from "./useCatalogModalsData";

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

export function CatalogModals(props: CatalogModalsProps): React.JSX.Element {
	const {
		patient,
		effectivePatientName,
		patientAgeYears,
		doctorName,
		clinicName,
		clinicProfileDraft,
		existingDocuments,
		mappedTaxPayments,
		isDiplomaModalOpen,
		setIsDiplomaModalOpen,
		isConsentModalOpen,
		setIsConsentModalOpen,
		isLocalTaxModalOpen,
		setIsLocalTaxModalOpen,
		taxInitialTab,
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
	} = props;

	const { effectivePatientInn, effectivePatientSnils, sanitizedPayments } =
		useCatalogModalsData(patient, mappedTaxPayments);

	return (
		<>
			<CatalogUtilityModals
				patient={patient}
				effectivePatientName={effectivePatientName}
				patientAgeYears={patientAgeYears}
				doctorName={doctorName}
				clinicName={clinicName}
				clinicProfileDraft={clinicProfileDraft}
				mappedTaxPayments={mappedTaxPayments}
				effectivePatientInn={effectivePatientInn}
				effectivePatientSnils={effectivePatientSnils}
				sanitizedPayments={sanitizedPayments}
				isDiplomaModalOpen={isDiplomaModalOpen}
				setIsDiplomaModalOpen={setIsDiplomaModalOpen}
				isConsentModalOpen={isConsentModalOpen}
				setIsConsentModalOpen={setIsConsentModalOpen}
				isLocalTaxModalOpen={isLocalTaxModalOpen}
				setIsLocalTaxModalOpen={setIsLocalTaxModalOpen}
				taxInitialTab={taxInitialTab}
			/>
			<CatalogPrimaryModals
				patient={patient}
				doctorName={doctorName}
				clinicProfileDraft={clinicProfileDraft}
				existingDocuments={existingDocuments}
				isLocalIntakeModalOpen={isLocalIntakeModalOpen}
				setIsLocalIntakeModalOpen={setIsLocalIntakeModalOpen}
				isOutpatientCardModalOpen={isOutpatientCardModalOpen}
				setIsOutpatientCardModalOpen={setIsOutpatientCardModalOpen}
				isContractModalOpen={isContractModalOpen}
				setIsContractModalOpen={setIsContractModalOpen}
				selectedA4Tab={selectedA4Tab}
				setSelectedA4Tab={setSelectedA4Tab}
				onCreateDocument={onCreateDocument}
				onOpenIssuedDocumentHtml={onOpenIssuedDocumentHtml}
				handleOpenKind={handleOpenKind}
			/>
		</>
	);
}
