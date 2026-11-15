import React from "react";
import { SanpinStudioModal } from "../../../sanpin/SanpinStudioModal";
import { TaxDeductionCertificateModal } from "../../DocumentsStudioModal";
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

		const patientSnils =
			activePatient?.administrativeProfile?.snils ||
			("snils" in (activePatient ?? {})
				? (activePatient as { snils?: string | null })?.snils
				: undefined) ||
			undefined;

		const patientGender: "male" | "female" | undefined =
			activePatient?.gender === "male" || activePatient?.gender === "female"
				? activePatient.gender
				: undefined;

		const doctorSpecialty =
			activeDoctor?.role ||
			(activeDoctor?.specialties?.[0]
				? String(activeDoctor.specialties[0])
				: undefined) ||
			("specialty" in (activeDoctor ?? {})
				? String((activeDoctor as { specialty?: unknown })?.specialty ?? "")
				: undefined) ||
			undefined;

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
					<SanpinStudioModal
						isOpen={isAutoclaveLogOpen || isSanpinRegistryOpen}
						onClose={() => {
							setIsAutoclaveLogOpen(false);
							setIsSanpinRegistryOpen(false);
						}}
						initialTab="autoclave"
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
						initialPatientSnils={patientSnils}
						initialPatientGender={patientGender}
						initialDoctorFio={activeDoctor?.fullName}
						initialDoctorSpecialty={doctorSpecialty}
					/>
				)}
			</>
		);
	},
);
