import React from "react";
import { PrimaryIntakePackageModal } from "../../PrimaryIntakePackageModal";
import { SurgicalPackageModal } from "../../SurgicalPackageModal";
import { ClinicalVisitPackageModal } from "../../ClinicalVisitPackageModal";
import { PatientConsentSignDrawer } from "../../PatientConsentSignDrawer";
import type { DocumentModalsContainerProps } from "./types";

export const DocumentClinicalModals: React.FC<DocumentModalsContainerProps> = React.memo(
	function DocumentClinicalModals(props) {
		const {
			isPrimaryIntakeOpen,
			setIsPrimaryIntakeOpen,
			isSurgicalPackageOpen,
			setIsSurgicalPackageOpen,
			isClinicalVisitOpen,
			setIsClinicalVisitOpen,
			activePatient,
			activeDoctor,
			clinicProfileDraft,
			typedActiveDocuments,
			createDocument,
			openIssuedDocumentHtml,
			setSelectedDocumentKind,
		} = props;

		return (
			<>
				{isPrimaryIntakeOpen && (
					<PrimaryIntakePackageModal
						isOpen={isPrimaryIntakeOpen}
						onClose={() => setIsPrimaryIntakeOpen(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName}
						clinicProfileDraft={clinicProfileDraft}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
					/>
				)}

				{isSurgicalPackageOpen && (
					<SurgicalPackageModal
						isOpen={isSurgicalPackageOpen}
						onClose={() => setIsSurgicalPackageOpen(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						clinicProfileDraft={clinicProfileDraft}
					/>
				)}

				{isClinicalVisitOpen && (
					<ClinicalVisitPackageModal
						isOpen={isClinicalVisitOpen}
						onClose={() => setIsClinicalVisitOpen(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						clinicProfileDraft={clinicProfileDraft}
					/>
				)}

				{props.isPatientConsentSignDrawerOpen && props.setIsPatientConsentSignDrawerOpen && (
					<PatientConsentSignDrawer
						isOpen={props.isPatientConsentSignDrawerOpen}
						onClose={() => props.setIsPatientConsentSignDrawerOpen!(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						clinicName={clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName}
					/>
				)}
			</>
		);
	},
);
