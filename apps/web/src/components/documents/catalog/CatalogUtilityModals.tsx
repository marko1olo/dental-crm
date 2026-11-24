import React from "react";
import type { Patient } from "@dental/shared";
import type { DocumentClinicProfileRequisites } from "../tabs/formSwitch/documentFormSwitchTypes";
import { ConsentStudioModal, TaxDeductionCertificateModal } from "../DocumentsStudioModal";
import type { TaxDeductionTab } from "../taxCertificateEngine";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import { PediatricParentMemoModal } from "../../pediatric";
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
	isParentMemoModalOpen?: boolean | undefined;
	setIsParentMemoModalOpen?: ((open: boolean) => void) | undefined;
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
	isParentMemoModalOpen,
	setIsParentMemoModalOpen,
	isConsentModalOpen,
	setIsConsentModalOpen,
	isLocalTaxModalOpen,
	setIsLocalTaxModalOpen,
	taxInitialTab,
}: CatalogUtilityModalsProps): React.JSX.Element {
	return (
		<>
			{isParentMemoModalOpen && (
				<PediatricParentMemoModal
					key={patient?.id || effectivePatientName || "catalog-parent-memo"}
					isOpen={isParentMemoModalOpen}
					onClose={() => setIsParentMemoModalOpen?.(false)}
					patientId={patient?.id}
					patientName={effectivePatientName}
					patientPhone={patient?.phone || undefined}
					patientAgeYears={typeof patientAgeYears === "number" ? patientAgeYears : undefined}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{isDiplomaModalOpen && (
				<PediatricBraveryDiplomaModal
					key={patient?.id || effectivePatientName || "catalog-bravery-diploma"}
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
						phone: patient?.phone ?? undefined,
						birthDate: patient?.birthDate ?? undefined,
					}}
					patientContext={{
						doctorName: doctorName,
						clinicName: clinicName,
					}}
				/>
			)}
			{isLocalTaxModalOpen && (() => {
				const draftObj = clinicProfileDraft as Record<string, unknown> | null | undefined;
				const resolvedClinicName = (typeof draftObj?.clinicName === "string" && draftObj.clinicName) ||
					(typeof draftObj?.legalName === "string" && draftObj.legalName) ||
					(typeof draftObj?.legalEntityName === "string" && draftObj.legalEntityName) ||
					(typeof draftObj?.name === "string" && draftObj.name) ||
					clinicName ||
					"";
				const resolvedInn = typeof draftObj?.inn === "string" ? draftObj.inn : "";
				const resolvedKpp = typeof draftObj?.kpp === "string" ? draftObj.kpp : "";
				const resolvedOgrn = typeof draftObj?.ogrn === "string" ? draftObj.ogrn : "";
				const resolvedLicenseNumber = (typeof draftObj?.medicalLicenseNumber === "string" && draftObj.medicalLicenseNumber) ||
					(typeof draftObj?.licenseNumber === "string" && draftObj.licenseNumber) ||
					"";
				const resolvedLicenseDate = (typeof draftObj?.medicalLicenseIssuedAt === "string" && draftObj.medicalLicenseIssuedAt) ||
					(typeof draftObj?.licenseDate === "string" && draftObj.licenseDate) ||
					"";
				const resolvedAddress = typeof draftObj?.address === "string" ? draftObj.address : "";

				return (
					<TaxDeductionCertificateModal
						isOpen={isLocalTaxModalOpen}
						onClose={() => setIsLocalTaxModalOpen(false)}
						initialTab={taxInitialTab}
						patientName={effectivePatientName}
						patientBirthDate={patient?.birthDate ?? undefined}
						patientInn={effectivePatientInn}
						patientSnils={effectivePatientSnils}
						patientId={patient?.id}
						clinicName={resolvedClinicName}
						clinicInn={resolvedInn}
						clinicKpp={resolvedKpp}
						clinicOgrn={resolvedOgrn}
						clinicLicenseNumber={resolvedLicenseNumber}
						clinicLicenseDate={resolvedLicenseDate}
						clinicAddress={resolvedAddress}
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
				);
			})()}
		</>
	);
}
