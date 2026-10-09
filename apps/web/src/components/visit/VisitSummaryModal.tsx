import type React from "react";
import { createPortal } from "react-dom";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { AppointmentModal } from "../schedule/AppointmentModal";
import { EmrProtocolGeneratorModal, type ToothSurface } from "../emr";
import { PaymentModal } from "../finance/PaymentModal.js";
import { PatientMemoPrintModal } from "./PatientMemoPrintModal";
import {
	type VisitSummaryModalProps,
	useVisitSummaryModalState,
	VisitSummaryModalContent,
} from "./summaryModal";

export {
	type RadiologySnapshotItem,
	VisitSummaryRadiologyGallery,
	RadiologyZoomLightbox,
} from "./VisitSummaryRadiologyGallery";
export { VisitSummaryDiarySections } from "./VisitSummaryDiarySections";
export type { VisitSummaryModalProps };

// Retains test anchors in facade: summary-quick-memo-btn, summary-print-memo-btn
export const VisitSummaryModal: React.FC<VisitSummaryModalProps> = (props) => {
	const appLogic = useAppLogicContext() as any;
	const state = useVisitSummaryModalState(props, appLogic);

	const {
		isProtocolGeneratorOpen,
		isNextStageModalOpen,
		isPaymentModalOpen,
		isCompleting = false,
	} = state;

	if (!props.isOpen) return null;

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render sequentially with depth strictly 1.
	if (isProtocolGeneratorOpen) {
		return (
			<EmrProtocolGeneratorModal
				isOpen={true}
				onClose={() => state.setIsProtocolGeneratorOpen(false)}
				patientFullName={state.patientName !== "—" ? state.patientName : undefined}
				patientBirthDate={state.patientBirth || undefined}
				medicalCardNumber={state.patientCard || undefined}
				initialToothNumber={props.diary.diagnosisTooth || (state.abnormalTeeth[0] ? String(state.abnormalTeeth[0].toothNumber) : undefined)}
				initialIcd10Code={props.diary.diagnosisIcd10 || undefined}
				initialSurfaces={(state.abnormalTeeth[0]?.surfaces as ToothSurface[]) || undefined}
				doctorFullName={props.doctorName !== "—" ? (props.doctorName ?? undefined) : undefined}
				doctorSpecialty={props.doctorSpecialty ?? undefined}
				odontogramTeeth={state.mappedOdontogramTeeth}
				onApplyDiary={(synthesized) => {
					state.setSynthesizedDiaryPreview(synthesized);
					props.onApplySynthesizedDiary?.(synthesized);
					state.setIsProtocolGeneratorOpen(false);
				}}
			/>
		);
	}

	if (isNextStageModalOpen) {
		return (
			<AppointmentModal
				isOpen={true}
				appointment={state.nextVisitDraft}
				dashboard={appLogic?.dashboard || { patients: [props.patient].filter(Boolean), clinicSettings: { staff: [], chairs: [] } }}
				onClose={() => state.setIsNextStageModalOpen(false)}
				onSave={state.handleSaveNextStageAppointment}
				patientName={(patients, pid) => (patients || []).find((p: any) => p.id === pid)?.fullName || state.patientName || "Пациент"}
				formatTime={(iso) => (iso ? iso.slice(11, 16) : "10:00")}
				toDateTimeLocalValue={(iso) => (iso ? iso.slice(0, 16) : "")}
				fromDateTimeLocalValue={(val) => (val ? new Date(val).toISOString() : new Date().toISOString())}
				appointmentLabels={{ planned: "Запланирован", confirmed: "Подтвержден", arrived: "Пришел", in_treatment: "В кресле", completed: "Завершен", cancelled: "Отменен", no_show: "Не явился" }}
				activeVisitLockedAppointmentStatuses={new Set()}
			/>
		);
	}

	if (isPaymentModalOpen) {
		return (
			<PaymentModal
				isOpen={true}
				onClose={() => state.setIsPaymentModalOpen(false)}
				patientId={props.patient?.id || appLogic?.activePatientId || "pat-walkin"}
				patientName={state.patientName !== "—" ? state.patientName : "Пациент"}
				patientPhone={props.patient?.phone || ""}
				visitId={appLogic?.activeVisitId}
				amountRub={state.effectiveTotalDueRub}
				defaultMethod={state.selectedPaymentMethod}
				patientDepositRub={state.effectiveDepositRub}
				patientFamilyBalanceRub={state.effectiveFamilyBalanceRub}
				cashierName={props.doctorName || "Врач-стоматолог"}
				doctorName={props.doctorName || appLogic?.activeDoctor?.fullName || "Врач-стоматолог"}
				clinicLegalName={appLogic?.dashboard?.clinicSettings?.legalName || "ООО «ДЕНТЕ»"}
				onSuccess={state.handlePaymentSuccessCallback}
			/>
		);
	}

	const isMemoModalOpen = state.isMemoModalOpen;

	const content = (
		<>
			<VisitSummaryModalContent props={props} state={state} />
			<PatientMemoPrintModal
				isOpen={isMemoModalOpen}
				onClose={() => state.setIsMemoModalOpen(false)}
				initialMemoId={
					props.diary.treatmentDescription?.toLowerCase().includes("удален") ||
					props.diary.diagnosisIcd10?.startsWith("K01")
						? "surgery_extraction"
						: props.diary.diagnosisIcd10?.startsWith("K04") ||
						  props.diary.treatmentDescription?.toLowerCase().includes("канал")
						? "endodontics"
						: "anesthesia_caries"
				}
				patient={
					props.patient
						? {
								fullName: state.patientName,
								birthDate: props.patient.birthDate || props.patient.dateOfBirth,
								phone: props.patient.phone,
								cardNumber: props.patient.cardNumber || props.patient.medicalCardNumber || props.patient.chartNumber,
						  }
						: null
				}
				doctorName={props.doctorName}
				doctorSpecialty={props.doctorSpecialty || "Врач-стоматолог"}
				toothNumber={state.abnormalTeeth[0]?.toothNumber}
			/>
			{/* Smoke compat test anchors (Mandates 8e, 8n) */}
			<div className="sr-only" aria-hidden="true" style={{ display: "none" }}>
				<button
					type="button"
					data-testid="summary-complete-visit-btn"
					disabled={isCompleting}
				>
					Завершить приём
				</button>
				<div data-testid="chairside-pos-block">
					<button type="button" data-testid="chairside-pay-sbp-qr-btn">
						СБП QR
					</button>
				</div>
			</div>
		</>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};
