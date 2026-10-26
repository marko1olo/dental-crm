/**
 * tabs/formSwitch/ConsentDocumentForms.tsx
 * Informed consent and patient legal forms dispatcher (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";
import { AnesthesiaConsentLogForm } from "../../forms/AnesthesiaConsentLogForm";
import { InformedConsentForm } from "../../forms/InformedConsentForm";
import { MedicalDocumentReleaseReceiptForm } from "../../forms/MedicalDocumentReleaseReceiptForm";
import { MedicalInterventionRefusalForm } from "../../forms/MedicalInterventionRefusalForm";
import { MedicalRecordCopyRequestForm } from "../../forms/MedicalRecordCopyRequestForm";
import { MinorLegalRepresentativeConsentForm } from "../../forms/MinorLegalRepresentativeConsentForm";
import { PatientIntakeQuestionnaireForm } from "../../forms/PatientIntakeQuestionnaireForm";
import { PersonalDataProcessingConsentForm } from "../../forms/PersonalDataProcessingConsentForm";
import { PhotoVideoConsentForm } from "../../forms/PhotoVideoConsentForm";
import { ProcedureSpecificConsentForm } from "../../forms/ProcedureSpecificConsentForm";
import type { DocumentFormSwitchProps } from "./documentFormSwitchTypes";

export const ConsentDocumentForms: React.FC<DocumentFormSwitchProps> = React.memo(
	function ConsentDocumentForms(props) {
		const { selectedDocumentKind } = props;

		return (
			<>
				{selectedDocumentKind === "informed_consent" && (
					<InformedConsentForm activeDoctorFullName={props.activeDoctor?.fullName ?? null} />
				)}
				{((selectedDocumentKind as any) === "procedure_specific_consent_packet" || (selectedDocumentKind as any) === "procedure_specific_consent") && (
					<ProcedureSpecificConsentForm
						procedureOptions={props.procedureSpecificConsentProcedureOptions ?? []}
						normalizeProcedure={props.normalizedProcedureSpecificConsentProcedure ?? ((v) => v as any)}
						renderToothRowsEditor={props.renderClinicalToothRowsEditor ?? (() => null)}
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						inferredTreatmentArea={props.inferredTreatmentArea ?? null}
					/>
				)}
				{selectedDocumentKind === "minor_legal_representative_consent" && (
					<MinorLegalRepresentativeConsentForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						minorConsentPatientFullNameValue={props.minorConsentPatientFullNameValue}
						minorConsentPatientBirthDateValue={props.minorConsentPatientBirthDateValue}
						minorConsentInterventionScopeValue={props.minorConsentInterventionScopeValue}
						minorConsentDiagnosisOrIndicationValue={props.minorConsentDiagnosisOrIndicationValue}
					/>
				)}
				{selectedDocumentKind === "anesthesia_consent_log" && (
					<AnesthesiaConsentLogForm inferredTreatmentArea={props.inferredTreatmentArea} />
				)}
				{selectedDocumentKind === "photo_video_consent" && (
					<PhotoVideoConsentForm
						materialOptions={props.photoVideoMaterialOptions ?? []}
						toggleMaterial={props.togglePhotoVideoMaterial ?? ((mat: any) => {
							const store = useDocumentStore.getState();
							const current = store.photoVideoMaterials || [];
							const next = current.includes(mat) ? current.filter((m) => m !== mat) : [...current, mat];
							store.setPhotoVideoMaterials(next);
						})}
					/>
				)}
				{selectedDocumentKind === "personal_data_processing_consent" && (
					<PersonalDataProcessingConsentForm clinicProfileDraft={props.clinicProfileDraft} />
				)}
				{selectedDocumentKind === "medical_intervention_refusal" && (
					<MedicalInterventionRefusalForm activeDoctorFullName={props.activeDoctor?.fullName} activeVisitComplaint={props.dashboard?.activeVisit?.complaint} inferredTreatmentArea={props.inferredTreatmentArea} />
				)}
				{selectedDocumentKind === "patient_intake_questionnaire" && (
					<PatientIntakeQuestionnaireForm activeVisitComplaint={props.dashboard?.activeVisit?.complaint ?? null} />
				)}
				{selectedDocumentKind === "medical_record_copy_request" && (
					<MedicalRecordCopyRequestForm documentPatient={props.documentPatient ?? props.activePatient ?? null} />
				)}
				{selectedDocumentKind === "medical_document_release_receipt" && (
					<MedicalDocumentReleaseReceiptForm documentPatient={props.documentPatient ?? props.activePatient ?? null} issuedMedicalCopyRequestDocuments={props.typedIssuedMedicalCopyRequestDocuments} releaseProtectionNote={props.releaseProtectionNote} setReleaseProtectionNote={props.setReleaseProtectionNote} />
				)}
			</>
		);
	},
);
