import { useMemo } from "react";
import { calculateDoctorShiftEarnings } from "@dental/shared";
import type { DoctorShiftStats } from "../../shift/DoctorShiftControlBar";
import type { DoctorShiftEmrSummary } from "../../shift/DoctorShiftCloseModal";
import type { DoctorMobileShiftModalProps, UseDoctorMobileShiftReturn } from "./types";
import { useShiftAppointmentsFlow } from "./logic/useShiftAppointmentsFlow";
import { useShiftBatchSigning } from "./logic/useShiftBatchSigning";
import { useShiftEmergencyVisit } from "./logic/useShiftEmergencyVisit";

/**
 * useDoctorMobileShift (Thin Coordinator Facade)
 *
 * Coordinates doctor mobile shift schedule, chair occupancy, batch signing, and stats.
 * Target size <= 90 lines (Complying with Mandate 8b/8zi and Mandate 8n).
 */
export function useDoctorMobileShift(props: DoctorMobileShiftModalProps): UseDoctorMobileShiftReturn {
	const {
		initialDoctorId = "doc-1",
		initialDoctorName = "Врач не выбран",
		initialDoctorSpecialty = "Врач-стоматолог терапевт-ортопед",
		initialShiftDateIso = new Date().toISOString().split("T")[0]!,
		initialAppointments,
		rawAppointments,
		patients,
		chairs,
		onAppointmentUpdate,
		onEmergencyVisit,
		onShiftClose,
		onClose,
	} = props;

	const flow = useShiftAppointmentsFlow({
		initialDoctorId,
		initialDoctorName,
		initialDoctorSpecialty,
		initialShiftDateIso,
		initialAppointments,
		rawAppointments,
		patients,
		chairs,
		onAppointmentUpdate,
	});

	const signing = useShiftBatchSigning({
		initialDoctorId,
		initialDoctorName,
		initialShiftDateIso,
		appointments: flow.appointments,
		setAppointments: flow.setAppointments,
		doctorAppointments: flow.doctorAppointments,
		onAppointmentUpdate,
	});

	const emergency = useShiftEmergencyVisit({
		initialDoctorId,
		initialDoctorName,
		initialShiftDateIso,
		appointments: flow.appointments,
		setAppointments: flow.setAppointments,
		onAppointmentUpdate,
		onEmergencyVisit,
		onShiftClose,
		onClose,
	});

	const earnings = useMemo(() => {
		return calculateDoctorShiftEarnings(
			flow.doctorAppointments,
			initialDoctorId,
			initialShiftDateIso,
			25,
		);
	}, [flow.doctorAppointments, initialDoctorId, initialShiftDateIso]);

	const shiftStats: DoctorShiftStats = useMemo(() => ({
		totalAppointments: earnings.totalAppointmentsCount,
		completedCount: earnings.completedAppointmentsCount,
		inProgressCount: earnings.inChairAppointmentsCount,
		totalRevenueRub: Math.round(earnings.grossRevenueKop / 100),
		doctorCommissionPct: 25,
		estimatedDoctorPayoutRub: Math.round(earnings.totalEarnedDealKop / 100),
		hasActiveOvertime: new Date().getHours() >= 21,
	}), [earnings]);

	const emrSummary: DoctorShiftEmrSummary = useMemo(() => ({
		signedCount: earnings.signedEmr043Count,
		pendingSignatureCount: signing.unsignedAppointmentIds.length,
		draftCount: Math.max(0, earnings.totalAppointmentsCount - earnings.signedEmr043Count - signing.unsignedAppointmentIds.length),
	}), [earnings, signing.unsignedAppointmentIds.length]);

	return {
		appointments: flow.appointments,
		doctorAppointments: flow.doctorAppointments,
		filteredAppointments: flow.filteredAppointments,
		activeTab: flow.activeTab,
		setActiveTab: flow.setActiveTab,
		expandedAptId: flow.expandedAptId,
		setExpandedAptId: flow.setExpandedAptId,
		isCloseModalOpen: emergency.isCloseModalOpen,
		setIsCloseModalOpen: emergency.setIsCloseModalOpen,
		signingSession: signing.signingSession,
		setSigningSession: signing.setSigningSession,
		enteredSmsCode: signing.enteredSmsCode,
		setEnteredSmsCode: signing.setEnteredSmsCode,
		smsCountdown: signing.smsCountdown,
		isSubmittingCode: signing.isSubmittingCode,
		earnings,
		unsignedAppointmentIds: signing.unsignedAppointmentIds,
		shiftStats,
		emrSummary,
		formattedShiftDate: emergency.formattedShiftDate,
		chairStatus: flow.chairStatus,
		setChairStatus: flow.setChairStatus,
		handleStatusChange: flow.handleStatusChange,
		handleInitiateBatchSigning: signing.handleInitiateBatchSigning,
		handleInitiateSingleSmsSigning: signing.handleInitiateSingleSmsSigning,
		handleConfirmSmsSigning: signing.handleConfirmSmsSigning,
		handleSessionPepSigning: signing.handleSessionPepSigning,
		handleConfirmCloseShift: emergency.handleConfirmCloseShift,
		handleEmergencyVisit: emergency.handleEmergencyVisit,
	};
}
