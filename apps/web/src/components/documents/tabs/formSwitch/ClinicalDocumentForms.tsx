/**
 * tabs/formSwitch/ClinicalDocumentForms.tsx
 * Clinical document forms dispatcher (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import { DailyDentistWorkSheet037uForm } from "../../forms/DailyDentistWorkSheet037uForm";
import { DentalMedicalCard043uForm } from "../../forms/DentalMedicalCard043uForm";
import { LabWorkOrderForm } from "../../forms/LabWorkOrderForm";
import { MedicalCardExtract003vuForm } from "../../forms/MedicalCardExtract003vuForm";
import { OrthodonticCard043_1uForm } from "../../forms/OrthodonticCard043_1uForm";
import { PostVisitRecommendationsForm } from "../../forms/PostVisitRecommendationsForm";
import { PrescriptionOrderForm } from "../../forms/PrescriptionOrderForm";
import { RadiationDoseSheetForm } from "../../forms/RadiationDoseSheetForm";
import { SummaryWorkStatement039uForm } from "../../forms/SummaryWorkStatement039uForm";
import { TreatmentPlanDocumentForm } from "../../forms/TreatmentPlanDocumentForm";
import { VisitAttendanceCertificateForm } from "../../forms/VisitAttendanceCertificateForm";
import { XrayCbctReferralForm } from "../../forms/XrayCbctReferralForm";
import type { DocumentFormSwitchProps } from "./documentFormSwitchTypes";

export const ClinicalDocumentForms: React.FC<DocumentFormSwitchProps> = React.memo(
	function ClinicalDocumentForms(props) {
		const { selectedDocumentKind } = props;

		return (
			<>
				{(selectedDocumentKind === "dental_medical_card_043u" || (selectedDocumentKind as any) === "outpatient_medical_card_025u") && (
					<DentalMedicalCard043uForm initialPayload={props.activeDoctor?.fullName ? { attendingDoctorFullName: props.activeDoctor.fullName, patientFullName: props.activePatient?.fullName ?? "" } : undefined} />
				)}
				{((selectedDocumentKind as any) === "daily_dentist_diary_037u" || (selectedDocumentKind as any) === "daily_dentist_worksheet_037u") && (
					<DailyDentistWorkSheet037uForm initialPayload={props.activeDoctor?.fullName ? { doctorFullName: props.activeDoctor.fullName } : undefined} />
				)}
				{((selectedDocumentKind as any) === "summary_dentist_statement_039u" || (selectedDocumentKind as any) === "summary_work_statement_039u") && (
					<SummaryWorkStatement039uForm initialPayload={props.activeDoctor?.fullName ? { doctorFullName: props.activeDoctor.fullName } : undefined} />
				)}
				{((selectedDocumentKind as any) === "medical_record_extract" || (selectedDocumentKind as any) === "medical_card_extract_003vu") && (
					<MedicalCardExtract003vuForm initialPayload={props.activeDoctor?.fullName ? { attendingDoctorFullName: props.activeDoctor.fullName, patientFullName: (props.documentPatient ?? props.activePatient)?.fullName ?? "" } : undefined} />
				)}
				{selectedDocumentKind === "orthodontic_medical_card_043_1u" && <OrthodonticCard043_1uForm />}
				{selectedDocumentKind === "radiation_dose_sheet" && <RadiationDoseSheetForm />}
				{((selectedDocumentKind as any) === "prescription_medication_order" || (selectedDocumentKind as any) === "prescription_order") && <PrescriptionOrderForm />}
				{selectedDocumentKind === "lab_work_order" && <LabWorkOrderForm inferredTreatmentArea={props.inferredTreatmentArea} />}
				{selectedDocumentKind === "treatment_plan" && (
					<TreatmentPlanDocumentForm activeDoctorFullName={props.activeDoctor?.fullName ?? null} activeVisitComplaint={props.dashboard?.activeVisit?.complaint ?? null} inferredTreatmentArea={props.inferredTreatmentArea ?? null} />
				)}
				{selectedDocumentKind === "xray_cbct_referral" && (
					<XrayCbctReferralForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						inferredTreatmentArea={props.inferredTreatmentArea}
						normalizedXrayPregnancyStatus={props.normalizedXrayPregnancyStatus}
						normalizedXrayPriority={props.normalizedXrayPriority}
						normalizedXrayStudyType={props.normalizedXrayStudyType}
						typedXrayPregnancyStatusOptions={props.xrayPregnancyStatusOptions}
						typedXrayStudyTypeOptions={props.xrayStudyTypeOptions}
					/>
				)}
				{selectedDocumentKind === "post_visit_recommendations" && (
					<PostVisitRecommendationsForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						applyPostVisitCarePreset={props.applyPostVisitCarePreset}
						changePostVisitCareTopic={props.changePostVisitCareTopic}
						inferredTreatmentArea={props.inferredTreatmentArea}
						markPostVisitManualEdited={props.markPostVisitManualEdited}
						normalizedPostVisitCareTopic={props.normalizedPostVisitCareTopic}
					/>
				)}
				{selectedDocumentKind === "visit_attendance_certificate" && (
					<VisitAttendanceCertificateForm activeAppointment={props.activeAppointment ?? null} activeDoctor={props.activeDoctor ?? null} />
				)}
			</>
		);
	},
);
