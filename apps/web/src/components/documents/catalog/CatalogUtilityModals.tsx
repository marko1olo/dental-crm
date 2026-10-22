import type React from "react";
import type { Patient } from "@dental/shared";
import { ConsentModal } from "../../consents/ConsentModal";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import type { TaxPaymentRecord } from "../taxCertificateEngine";

export interface CatalogUtilityModalsProps {
	patient?: Patient | null | undefined;
	effectivePatientName: string;
	patientAgeYears: number;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	clinicProfileDraft?: any | undefined;
	mappedTaxPayments?: TaxPaymentRecord[] | undefined;
	effectivePatientInn?: string | undefined;
	effectivePatientSnils?: string | undefined;
	sanitizedPayments?: TaxPaymentRecord[] | undefined;
	isDiplomaModalOpen: boolean;
	setIsDiplomaModalOpen: (open: boolean) => void;
	isConsentModalOpen: boolean;
	setIsConsentModalOpen: (open: boolean) => void;
	isLocalTaxModalOpen: boolean;
	setIsLocalTaxModalOpen: (open: boolean) => void;
	taxInitialTab: TaxDeductionTab;
}

export function CatalogUtilityModals({
	patient,
	effectivePatientName,
	patientAgeYears,
	doctorName,
	clinicName,
	clinicProfileDraft,
	mappedTaxPayments,
	effectivePatientInn,
	effectivePatientSnils,
	sanitizedPayments,
	isDiplomaModalOpen,
	setIsDiplomaModalOpen,
	isConsentModalOpen,
	setIsConsentModalOpen,
	isLocalTaxModalOpen,
	setIsLocalTaxModalOpen,
	taxInitialTab,
}: CatalogUtilityModalsProps): React.JSX.Element {
	return (
		<>
			{isDiplomaModalOpen && (
				<PediatricBraveryDiplomaModal
					isOpen={isDiplomaModalOpen}
					onClose={() => setIsDiplomaModalOpen(false)}
					patientName={effectivePatientName}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{isConsentModalOpen && (
				<ConsentModal
					isOpen={isConsentModalOpen}
					onClose={() => setIsConsentModalOpen(false)}
					patient={{
						fullName: effectivePatientName,
						phone: patient?.phone,
						birthDate: patient?.birthDate,
					}}
					doctorName={doctorName}
					clinicName={clinicName}
					isMinorPatient={patientAgeYears < 15}
				/>
			)}
			{isLocalTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={isLocalTaxModalOpen}
					onClose={() => setIsLocalTaxModalOpen(false)}
					initialTab={taxInitialTab}
					patientName={effectivePatientName}
					patientBirthDate={patient?.birthDate ?? undefined}
					patientInn={effectivePatientInn}
					patientSnils={effectivePatientSnils}
					patientId={patient?.id}
					clinicName={
						clinicProfileDraft?.legalEntityName ||
						clinicProfileDraft?.name ||
						clinicName ||
						""
					}
					clinicInn={clinicProfileDraft?.inn || ""}
					clinicKpp={clinicProfileDraft?.kpp || ""}
					clinicOgrn={clinicProfileDraft?.ogrn || ""}
					clinicLicenseNumber={
						clinicProfileDraft?.licenseNumber ||
						clinicProfileDraft?.medicalLicenseNumber ||
						""
					}
					clinicLicenseDate={
						clinicProfileDraft?.licenseDate ||
						clinicProfileDraft?.medicalLicenseIssuedAt ||
						""
					}
					clinicAddress={clinicProfileDraft?.address || ""}
					chiefDoctorName={doctorName || ""}
					payments={(sanitizedPayments ?? mappedTaxPayments) as any}
				/>
			)}
		</>
	);
}
