/**
 * tabs/formSwitch/ClinicalDocumentForms.tsx
 * Clinical document forms dispatcher (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { MedicalCardExtract003vuForm } from "../../forms/MedicalCardExtract003vuForm";
import { OrthodonticPatientCardForm, OrthodonticCard043_1uForm } from "../../forms/OrthodonticPatientCardForm";
import { PostVisitRecommendationsForm } from "../../forms/PostVisitRecommendationsForm";
import { PrescriptionOrderForm } from "../../forms/PrescriptionOrderForm";
import { RadiationDoseSheetForm } from "../../forms/RadiationDoseSheetForm";
import { TreatmentPlanDocumentForm } from "../../forms/TreatmentPlanDocumentForm";
import { VisitAttendanceCertificateForm } from "../../forms/VisitAttendanceCertificateForm";
import { XrayCbctReferralForm } from "../../forms/XrayCbctReferralForm";
import type { DocumentFormSwitchProps } from "./documentFormSwitchTypes";

export const ClinicalDocumentForms: React.FC<DocumentFormSwitchProps> = React.memo(
	function ClinicalDocumentForms(props) {
		const { selectedDocumentKind } = props;

		return (
			<>
				{(selectedDocumentKind === "dental_medical_card_043u" || selectedDocumentKind === "outpatient_medical_card_025u" || selectedDocumentKind === "dental_medical_card") && (
					<article className="document-payload-card" data-testid="dental-medical-card-document-card">
						<div>
							<h3 className="text-base font-bold text-[var(--ink)]">Амбулаторная медицинская карта (ЭМК)</h3>
							<p className="text-xs text-[var(--ink-muted)] mt-1">Официальная электронная медицинская карта пациента с дневниками приёма по стандарту SOAP, зубной формулой и анамнезом.</p>
						</div>
						<div className="mt-4 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-center justify-between gap-3">
							<div className="text-xs text-[var(--ink-muted)]">
								Ведение дневников приёма, осмотры, эпикризы и печать титульного листа и вкладышей ЭМК осуществляются в единой студии медицинской карты.
							</div>
							<button
								type="button"
								data-testid="open-medical-record-studio-from-docs-btn"
								onClick={() => useUiSurfaceStore.getState().openPrimaryModal("medical_record", { patientId: props.activePatient?.id, doctorFullName: props.activeDoctor?.fullName })}
								className="dente-btn-primary px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
							>
								Открыть медицинскую карту
							</button>
						</div>
					</article>
				)}
				{(selectedDocumentKind === "medical_record_extract" || selectedDocumentKind === "medical_card_extract_003vu") && (
					<MedicalCardExtract003vuForm initialPayload={props.activeDoctor?.fullName ? { attendingDoctorFullName: props.activeDoctor.fullName, patientFullName: (props.documentPatient ?? props.activePatient)?.fullName ?? "" } : undefined} />
				)}
				{selectedDocumentKind === "orthodontic_medical_card_043_1u" && (
					<OrthodonticPatientCardForm
						initialPayload={props.initialPayload ?? (props.activeDoctor?.fullName || props.activePatient?.fullName ? {
							orthodontistFullName: props.activeDoctor?.fullName ?? "",
							patientFullName: (props.documentPatient ?? props.activePatient)?.fullName ?? "",
							medicalCardNumber: ((props.documentPatient ?? props.activePatient) as { cardNumber?: string } | null | undefined)?.cardNumber ?? "",
						} : undefined)}
						onChange={props.onOrthodonticPayloadChange ?? props.onChange}
					/>
				)}
				{selectedDocumentKind === "radiation_dose_sheet" && <RadiationDoseSheetForm />}
				{(selectedDocumentKind === "prescription_medication_order" || selectedDocumentKind === "prescription_order") && <PrescriptionOrderForm />}
				{selectedDocumentKind === "lab_work_order" && (
					<article className="document-payload-card" data-testid="lab-work-order-document-card">
						<div>
							<h3 className="text-base font-bold text-[var(--ink)]">Наряд-заказ в зуботехническую лабораторию (Форма № ЗТЛ-1)</h3>
							<p className="text-xs text-[var(--ink-muted)] mt-1">Официальное клиническое задание на изготовление зубных протезов и ортопедических конструкций (СтАР / ГОСТ).</p>
						</div>
						<div className="mt-4 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-center justify-between gap-3">
							<div className="text-xs text-[var(--ink-muted)]">
								Ведение нарядов, выбор зубов FDI, оттенков VITA Classic/Bleach, расчет себестоимости и печать бланка № ЗТЛ-1 осуществляются в единой студии ЗТЛ.
							</div>
							<button
								type="button"
								data-testid="open-lab-studio-from-docs-btn"
								onClick={() => useUiSurfaceStore.getState().openPrimaryModal("lab_order", { initialTab: "print_blank" })}
								className="dente-btn-primary px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
							>
								Открыть студию ЗТЛ
							</button>
						</div>
					</article>
				)}
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
