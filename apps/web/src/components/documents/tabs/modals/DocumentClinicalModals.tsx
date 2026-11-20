import React from "react";
import { DocumentsStudioModal, ConsentStudioModal } from "../../DocumentsStudioModal";
import type { DocumentModalsContainerProps } from "./types";

export const DocumentClinicalModals: React.FC<DocumentModalsContainerProps> = React.memo(
	function DocumentClinicalModals(props) {
		const {
			isPrimaryIntakeOpen,
			setIsPrimaryIntakeOpen,
			isSurgicalPackageOpen,
			setIsSurgicalPackageOpen,
			activePatient,
			activeDoctor,
			clinicProfileDraft,
		} = props;

		return (
			<>
				{isPrimaryIntakeOpen && (
					<DocumentsStudioModal
						isOpen={isPrimaryIntakeOpen}
						onClose={() => setIsPrimaryIntakeOpen(false)}
						patient={activePatient ?? undefined}
						doctorFullName={activeDoctor?.fullName ?? undefined}
						clinicProfileDraft={clinicProfileDraft ?? undefined}
						initialTemplate="intake"
					/>
				)}

				{isSurgicalPackageOpen && (
					<DocumentsStudioModal
						isOpen={isSurgicalPackageOpen}
						onClose={() => setIsSurgicalPackageOpen(false)}
						patient={activePatient ?? undefined}
						doctorFullName={activeDoctor?.fullName ?? undefined}
						clinicProfileDraft={clinicProfileDraft ?? undefined}
						initialTemplate="informed_consent"
						initialDocId="surgery"
					/>
				)}

				{props.isPatientConsentSignDrawerOpen && props.setIsPatientConsentSignDrawerOpen && (
					<ConsentStudioModal
						isOpen={props.isPatientConsentSignDrawerOpen}
						onClose={() => props.setIsPatientConsentSignDrawerOpen!(false)}
						patient={activePatient ?? undefined}
						patientContext={{
							doctorName: activeDoctor?.fullName ?? undefined,
							clinicName: clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName,
						}}
					/>
				)}
			</>
		);
	},
);
