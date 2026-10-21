import type { Appointment, Dashboard } from "@dental/shared";
import { useMemo } from "react";
import {
	checkAppointmentResourceCollision,
	isCitoAppointment,
	type ResourceCollisionResult,
} from "../../../utils/scheduleCollisionUtils";

interface UseAppointmentModalCollisionParams {
	appointment: Appointment | null | undefined;
	startsAtLocal: string;
	endsAtLocal: string;
	doctorUserId: string;
	chairId: string;
	assistantUserId: string | null;
	patientId: string;
	isCito: boolean;
	reason: string;
	comment: string;
	safeFromDateTimeLocalValue: (val: string, tz?: string | null) => string;
	safeToDateTimeLocalValue: (iso: string, tz?: string | null) => string;
	timezone: string;
	dashboard: Dashboard | undefined;
}

export function useAppointmentModalCollision({
	appointment,
	startsAtLocal,
	endsAtLocal,
	doctorUserId,
	chairId,
	assistantUserId,
	patientId,
	isCito,
	reason,
	comment,
	safeFromDateTimeLocalValue,
	safeToDateTimeLocalValue,
	timezone,
	dashboard,
}: UseAppointmentModalCollisionParams) {
	return useMemo(() => {
		if (!appointment || !startsAtLocal || !endsAtLocal) {
			return {
				hasCollision: false,
				conflictType: null,
				conflictingAppointment: null,
				message: null,
				isCitoOverbooking: false,
			} satisfies ResourceCollisionResult;
		}
		const effectiveIsCito = Boolean(
			isCito ||
				(appointment as any)?.isCito ||
				(appointment as any)?.cito ||
				(appointment as any)?.tag === "cito" ||
				isCitoAppointment({ reason, comment }),
		);
		return checkAppointmentResourceCollision(
			{
				startsAt: safeFromDateTimeLocalValue(startsAtLocal, timezone),
				endsAt: safeFromDateTimeLocalValue(endsAtLocal, timezone),
				doctorUserId: doctorUserId || null,
				chairId: chairId || null,
				assistantUserId: assistantUserId || null,
				patientId: patientId || null,
				isCito: effectiveIsCito,
				reason,
			},
			dashboard?.appointments,
			{
				excludeAppointmentId: appointment.id,
				staff: dashboard?.clinicSettings?.staff,
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
				formatTimeFn: (iso) =>
					safeToDateTimeLocalValue(iso, timezone).slice(11, 16),
				isCito: effectiveIsCito,
				allowCitoOverbooking: effectiveIsCito,
			},
		);
	}, [
		appointment,
		startsAtLocal,
		endsAtLocal,
		doctorUserId,
		chairId,
		assistantUserId,
		patientId,
		reason,
		comment,
		isCito,
		safeFromDateTimeLocalValue,
		safeToDateTimeLocalValue,
		timezone,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		dashboard?.patients,
	]);
}
