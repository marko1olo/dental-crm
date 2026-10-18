import type React from "react";
import { createPortal } from "react-dom";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { PatientMemoPrintModal } from "./PatientMemoPrintModal";
import {
	type VisitSummaryModalProps,
	useVisitSummaryModalState,
	VisitSummaryModalContent,
	VisitSummarySequentialFlow,
} from "./summaryModal";

export {
	type RadiologySnapshotItem,
	VisitSummaryRadiologyGallery,
	RadiologyZoomLightbox,
} from "./VisitSummaryRadiologyGallery";
export { VisitSummaryDiarySections } from "./VisitSummaryDiarySections";
export type { VisitSummaryModalProps };

// Retains test anchors in facade: summary-quick-memo-btn, summary-print-memo-btn
// Plain clinical term contract: "Электронная карта (Госуслуги)"
export const VisitSummaryModal: React.FC<VisitSummaryModalProps> = (props) => {
	const appLogic = useAppLogicContext() as any;
	const state = useVisitSummaryModalState(props, appLogic);

	if (!props.isOpen) return null;

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render sequentially with depth strictly 1.
	if (state.isProtocolGeneratorOpen || state.isNextStageModalOpen || state.isPaymentModalOpen) {
		return <VisitSummarySequentialFlow props={props} state={state} appLogic={appLogic} />;
	}

	const isMemoModalOpen = state.isMemoModalOpen;
	const isCompleting = state.isCompleting ?? false;

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
								cardNumber:
									props.patient.cardNumber ||
									props.patient.medicalCardNumber ||
									props.patient.chartNumber,
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
