import React from "react";
import type { Patient } from "@dental/shared";
import type { DocumentClinicProfileRequisites } from "../tabs/formSwitch/documentFormSwitchTypes";
import { ConsentStudioModal, TaxDeductionCertificateModal } from "../DocumentsStudioModal";
import type { TaxDeductionTab } from "../taxCertificateEngine";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import type { TaxPaymentRecord } from "../taxCertificateEngine";

export interface CatalogUtilityModalsProps {
	patient?: Patient | null | undefined;
	effectivePatientName: string;
	patientAgeYears?: number | null | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	clinicProfileDraft?: DocumentClinicProfileRequisites | Record<string, unknown> | null | undefined;
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
					patientId={patient?.id}
					patientName={effectivePatientName}
					patientPhone={patient?.phone || undefined}
					patientAgeYears={typeof patientAgeYears === "number" ? patientAgeYears : undefined}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{isConsentModalOpen && (
				<ConsentStudioModal
					isOpen={isConsentModalOpen}
					onClose={() => setIsConsentModalOpen(false)}
					patient={{
						fullName: effectivePatientName,
						phone: patient?.phone,
						birthDate: patient?.birthDate,
					}}
					patientContext={{
						doctorName: doctorName,
						clinicName: clinicName,
					}}
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
					payments={
						(sanitizedPayments ?? mappedTaxPayments)?.map((p) => ({
							id: p.id,
							dateIso: p.dateIso,
							receiptNumber: p.receiptNumber ?? "",
							fiscalDocumentNumber: p.fiscalDocumentNumber ?? "",
							fiscalSign: p.fiscalSign ?? "",
							serviceName: p.serviceName,
							code804n: p.code804n,
							amountRub: p.amountRub,
							amountKopecks: p.amountKopecks,
							taxCode: p.taxCode,
							isRefund: p.isRefund,
							isReturn: p.isReturn,
							status: p.status,
						}))
					}
				/>
			)}
		</>
	);
}
