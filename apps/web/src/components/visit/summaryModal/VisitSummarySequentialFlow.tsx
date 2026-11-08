import React from "react";
import { QuickBookingDrawer } from "../../schedule/QuickBookingDrawer";
import { EmrProtocolGeneratorModal, type ToothSurface } from "../../emr";
import { PaymentModal } from "../../finance/PaymentModal.js";
import type { VisitSummaryModalProps } from "./types";
import type { useVisitSummaryModalState } from "./useVisitSummaryModalState";
import { buildEnrichedReceiptItems } from "./summaryReceiptEnricher";

export interface VisitSummarySequentialFlowProps {
	readonly props: VisitSummaryModalProps;
	readonly state: ReturnType<typeof useVisitSummaryModalState>;
	readonly appLogic: any;
}

export function VisitSummarySequentialFlow({
	props,
	state,
	appLogic,
}: VisitSummarySequentialFlowProps): React.ReactElement | null {
	const { isProtocolGeneratorOpen, isNextStageModalOpen, isPaymentModalOpen } = state;

	if (isProtocolGeneratorOpen) {
		return (
			<EmrProtocolGeneratorModal
				isOpen={true}
				onClose={() => state.setIsProtocolGeneratorOpen(false)}
				patientFullName={state.patientName !== "—" ? state.patientName : undefined}
				patientBirthDate={state.patientBirth || undefined}
				medicalCardNumber={state.patientCard || undefined}
				initialToothNumber={
					props.diary.diagnosisTooth ||
					(state.abnormalTeeth[0] ? String(state.abnormalTeeth[0].toothNumber) : undefined)
				}
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
			<QuickBookingDrawer
				isOpen={true}
				onClose={() => state.setIsNextStageModalOpen(false)}
				initialSlot={
					state.nextVisitDraft
						? {
								patientId: state.nextVisitDraft.patientId || props.patient?.id,
								patientName: state.patientName !== "—" ? state.patientName : undefined,
								startsAt: state.nextVisitDraft.startsAt,
								doctorUserId: state.nextVisitDraft.doctorUserId,
								chairId: state.nextVisitDraft.chairId,
								durationMinutes: 45,
								reason: state.nextVisitDraft.reason || "Следующий этап лечения",
								comment: state.nextVisitDraft.comment,
						  }
						: undefined
				}
				dashboard={appLogic?.dashboard}
				auth={appLogic?.auth}
				onAppointmentCreated={() => {
					state.setIsNextStageModalOpen(false);
					if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				}}
			/>
		);
	}

	if (isPaymentModalOpen) {
		const effectiveTooth = props.diary.diagnosisTooth
			? Number(props.diary.diagnosisTooth)
			: state.abnormalTeeth[0]?.toothNumber
				? Number(state.abnormalTeeth[0].toothNumber)
				: undefined;

		const enrichedItems = buildEnrichedReceiptItems(state.effectiveChairsideServices, effectiveTooth);

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
				items={enrichedItems as any}
				toothNumber={effectiveTooth}
				onSuccess={state.handlePaymentSuccessCallback}
			/>
		);
	}

	return null;
}
