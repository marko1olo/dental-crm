import React from "react";
import { AutoclaveSterilizationLogModal } from "../../../sanpin/autoclaveLog/AutoclaveSterilizationLogModal";
import { TaxDeductionCertificateModal } from "../../../finance/TaxDeductionCertificateModal";
import { EgiszRemdHubModal } from "../../../egisz/EgiszRemdHubModal";
import { SickLeaveElnModal } from "../../sickLeave/SickLeaveElnModal";
import type { DocumentModalsContainerProps } from "./types";

export const DocumentRegulatoryModals: React.FC<DocumentModalsContainerProps> = React.memo(
	function DocumentRegulatoryModals(props) {
		const {
			isTaxAccountingOpen,
			setIsTaxAccountingOpen,
			isSanpinRegistryOpen,
			setIsSanpinRegistryOpen,
			isAutoclaveLogOpen,
			setIsAutoclaveLogOpen,
			isFnsNdflXmlOpen,
			setIsFnsNdflXmlOpen,
			isEgiszRemdOpen,
			setIsEgiszRemdOpen,
			isSickLeaveElnOpen,
			setIsSickLeaveElnOpen,
			activePatient,
			activeDoctor,
			clinicProfileDraft,
			taxDocumentYear,
			egiszInitialPayload,
		} = props;

		const isTaxModalVisible = isTaxAccountingOpen || isFnsNdflXmlOpen;
		const handleCloseTaxModal = () => {
			setIsTaxAccountingOpen?.(false);
			setIsFnsNdflXmlOpen?.(false);
		};

		return (
			<>
				{isTaxModalVisible && (
					<TaxDeductionCertificateModal
						isOpen={isTaxModalVisible}
						onClose={handleCloseTaxModal}
						patientName={activePatient?.fullName ?? undefined}
						patientBirthDate={activePatient?.birthDate ?? undefined}
						patientInn={(activePatient as { inn?: string | null } | undefined)?.inn ?? undefined}
						patientSnils={(activePatient as { snils?: string | null } | undefined)?.snils ?? undefined}
						patientId={activePatient?.id}
						clinicName={clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName}
						clinicInn={clinicProfileDraft?.inn}
						clinicKpp={clinicProfileDraft?.kpp}
						clinicOgrn={clinicProfileDraft?.ogrn}
						clinicLicenseNumber={clinicProfileDraft?.medicalLicenseNumber}
						clinicLicenseDate={clinicProfileDraft?.medicalLicenseIssuedAt}
						clinicAddress={clinicProfileDraft?.address}
						chiefDoctorName={activeDoctor?.fullName}
						selectedYear={taxDocumentYear}
					/>
				)}

				{(isAutoclaveLogOpen || isSanpinRegistryOpen) && (
					<AutoclaveSterilizationLogModal
						isOpen={isAutoclaveLogOpen || isSanpinRegistryOpen}
						onClose={() => {
							setIsAutoclaveLogOpen(false);
							setIsSanpinRegistryOpen(false);
						}}
					/>
				)}

				{isEgiszRemdOpen && (
					<EgiszRemdHubModal
						isOpen={isEgiszRemdOpen}
						onClose={() => setIsEgiszRemdOpen(false)}
						initialTab="xml"
						initialXmlPayload={egiszInitialPayload}
					/>
				)}

				{isSickLeaveElnOpen && (
					<SickLeaveElnModal
						isOpen={isSickLeaveElnOpen}
						onClose={() => setIsSickLeaveElnOpen(false)}
						initialPatientName={activePatient?.fullName}
						initialPatientBirthDate={activePatient?.birthDate || undefined}
						initialPatientSnils={(activePatient as any)?.snils || (activePatient as any)?.administrativeProfile?.snils}
						initialPatientGender={activePatient?.gender as any}
						initialDoctorFio={activeDoctor?.fullName}
						initialDoctorSpecialty={(activeDoctor as any)?.role || (activeDoctor as any)?.specialty}
					/>
				)}
			</>
		);
	},
);
