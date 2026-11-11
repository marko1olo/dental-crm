import { useCallback } from "react";
import type { Dashboard } from "@dental/shared";
import { DEFAULT_SOLO_CHAIR, type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import { filterWaitlistCandidates } from "../waitlist/waitlistScoringEngine";

interface Params {
	chairs: ScheduleChair[];
	doctors: any[];
	dashboard?: Dashboard | undefined;
	dateKey: string;
	effectiveChairDoctorAssignments: Record<string, ChairDoctorShiftAssignment>;
	onAppointmentMove?: ((appointmentId: string, updates: any) => Promise<any> | void) | undefined;
}

export function useAppointmentSlotMovement({
	chairs, doctors, dashboard, dateKey, effectiveChairDoctorAssignments, onAppointmentMove,
}: Params) {
	const resolveDutyDoctorForSlot = useCallback(
		(chairId: string, slotStartsAt?: string, preferredDoctorId?: string | null) => {
			const chairObj = chairs.find((c) => c.id === chairId) || (chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
			return resolveChairDutyDoctor(
				chairId, slotStartsAt, effectiveChairDoctorAssignments, dateKey, preferredDoctorId,
				(chairObj as any)?.defaultDoctorId || (doctors.length === 1 ? doctors[0]?.id : null),
			);
		},
		[chairs, effectiveChairDoctorAssignments, dateKey, doctors],
	);

	const moveAppointment = useCallback(
		async (
			appointmentId: string,
			updates: { startsAt?: string; endsAt?: string; chairId?: string; doctorUserId?: string; allowOverbooking?: boolean },
		) => {
			if (onAppointmentMove) {
				return await onAppointmentMove(appointmentId, {
					...updates,
					allowOverbooking: updates.allowOverbooking ?? true,
					allowEmergencyOverride: true,
				});
			}
		},
		[onAppointmentMove],
	);

	const findSmartSlotRecoveryCandidates = useCallback(
		(slotParams: any) => {
			const waitlist = (dashboard as any)?.waitlist || (dashboard as any)?.appointmentWaitlists || [];
			return filterWaitlistCandidates(waitlist, slotParams);
		},
		[dashboard],
	);

	return { resolveDutyDoctorForSlot, moveAppointment, findSmartSlotRecoveryCandidates };
}
