import React from "react";
import { QuickBookingDrawer } from "../../schedule/QuickBookingDrawer";
import type { VisitDiaryEntry043 } from "../../emr";
import { ClinicalProtocolsCatalogModal } from "../clinicalCatalog/ClinicalProtocolsCatalogModal";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal.js";
import type { CashboxTenderType } from "../../cashbox/cashRegisterCatalogData.js";
import type { AppLogicContextType } from "../../../contexts/AppLogicContext";
import type { VisitSummaryModalProps } from "./types";
import type { useVisitSummaryModalState } from "./useVisitSummaryModalState";
import { buildEnrichedReceiptItems } from "./summaryReceiptEnricher";

export interface VisitSummarySequentialFlowProps {
	readonly props: VisitSummaryModalProps;
	readonly state: ReturnType<typeof useVisitSummaryModalState>;
	readonly appLogic?: AppLogicContextType | Partial<AppLogicContextType> | null | undefined;
}

export function VisitSummarySequentialFlow({
	props,
	state,
	appLogic,
}: VisitSummarySequentialFlowProps): React.ReactElement | null {
	const { isProtocolGeneratorOpen, isNextStageModalOpen, isPaymentModalOpen } = state;

	if (isProtocolGeneratorOpen) {
		return (
			<ClinicalProtocolsCatalogModal
				isOpen={true}
				onClose={() => state.setIsProtocolGeneratorOpen(false)}
				activeTooth={
					props.diary.diagnosisTooth
						? Number(props.diary.diagnosisTooth)
						: state.abnormalTeeth[0]
							? Number(state.abnormalTeeth[0].toothNumber)
							: 16
				}
				onApplyPatch={(patch) => {
					const synthesized: VisitDiaryEntry043 = {
						id: `diary-${Date.now()}`,
						entryDate: new Date().toISOString().split("T")[0] || "2026-08-22",
						doctorFullName: props.doctorName || "Врач-стоматолог",
						subjectiveComplaints: patch.complaint || patch.anamnesis || "",
						objectiveStatusLocalis: patch.objectiveStatus || "",
						assessmentDiagnosisText: patch.diagnosis || "",
						assessmentIcd10Code: (patch.diagnosis || "").split(" ")[0] || "K02.1",
						procedureProtocol: patch.treatmentPlan || "",
						homeCareRecommendations: patch.recommendations || null,
						toothNumber: props.diary.diagnosisTooth
							? String(props.diary.diagnosisTooth)
							: state.abnormalTeeth[0]
								? String(state.abnormalTeeth[0].toothNumber)
								: "16",
					};
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
								comment: state.nextVisitDraft.comment || undefined,
						  }
						: undefined
				}
				dashboard={appLogic?.dashboard ?? undefined}
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
		const defaultMethod: CashboxTenderType =
			state.selectedPaymentMethod === "sbp_qr" || state.selectedPaymentMethod === "sbp"
				? "sbp"
				: state.selectedPaymentMethod === "cash"
					? "cash"
					: state.selectedPaymentMethod === "split"
						? "split"
						: state.selectedPaymentMethod === "deposit"
							? "deposit"
							: state.selectedPaymentMethod === "warranty"
								? "warranty"
								: "card";

		return (
			<CashRegisterStudioModal
				isOpen={true}
				onClose={() => state.setIsPaymentModalOpen(false)}
				patientId={props.patient?.id || appLogic?.activePatientId || "pat-walkin"}
				patientName={state.patientName !== "—" ? state.patientName : "Пациент"}
				patientPhone={props.patient?.phone || ""}
				visitId={(appLogic?.activeVisitId as string | undefined) ?? undefined}
				amountRub={state.effectiveTotalDueRub}
				defaultMethod={defaultMethod}
				patientDepositRub={state.effectiveDepositRub}
				patientFamilyBalanceRub={state.effectiveFamilyBalanceRub}
				cashierFullName={props.doctorName || "Врач-стоматолог"}
				doctorFullName={props.doctorName || appLogic?.activeDoctor?.fullName || "Врач-стоматолог"}
				clinicLegalName={appLogic?.dashboard?.clinicSettings?.profile?.legalName || "ООО «ДЕНТЕ»"}
				serviceTitle={enrichedItems[0]?.name || "Стоматологические услуги"}
				onSuccess={state.handlePaymentSuccessCallback}
			/>
		);
	}

	return null;
}
