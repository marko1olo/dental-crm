import type {
	Appointment,
	StaffMember as ClinicStaffMember,
	Chair as DentalChair,
} from "@dental/shared";
import { useMemo } from "react";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";

interface UseAppointmentModalDutyParams {
	chairId: string;
	startsAtLocal: string;
	appointment: Appointment | null | undefined;
	chairs: DentalChair[];
	doctors: ClinicStaffMember[];
	chairDoctorAssignments: any;
	safeToDateTimeLocalValue: (iso: string, tz?: string | null) => string;
	timezone: string;
}

export function useAppointmentModalDuty({
	chairId,
	startsAtLocal,
	appointment,
	chairs,
	doctors,
	chairDoctorAssignments,
	safeToDateTimeLocalValue,
	timezone,
}: UseAppointmentModalDutyParams) {
	const currentChair = useMemo(() => {
		return (
			chairs.find((c) => c.id === chairId) ||
			(chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null)
		);
	}, [chairs, chairId]);

	const dutyDoctorInfo = useMemo(() => {
		const effChair = chairId || appointment?.chairId;
		const effStartsAt =
			startsAtLocal ||
			(appointment?.startsAt
				? safeToDateTimeLocalValue(appointment.startsAt, timezone)
				: "");
		const effChairObj =
			(effChair === chairId
				? currentChair
				: chairs.find((c) => c.id === effChair)) ||
			(effChair === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
		return resolveChairDutyDoctor(
			effChair,
			effStartsAt,
			chairDoctorAssignments,
			effStartsAt ? effStartsAt.slice(0, 10) : undefined,
			null,
			(effChairObj as any)?.defaultDoctorId ||
				(chairs.length <= 1 && doctors.length === 1 ? doctors[0]?.id : null),
		);
	}, [
		chairId,
		startsAtLocal,
		chairDoctorAssignments,
		appointment,
		safeToDateTimeLocalValue,
		timezone,
		currentChair,
		chairs,
		doctors,
	]);

	const dutyDoctorId = dutyDoctorInfo.doctorId;
	const dutyDocHours = dutyDoctorInfo.shiftHours;

	const dutyDoc = useMemo(() => {
		if (!dutyDoctorId) return null;
		return doctors.find((d) => d.id === dutyDoctorId) || null;
	}, [dutyDoctorId, doctors]);

	return {
		currentChair,
		dutyDoctorInfo,
		dutyDoctorId,
		dutyDocHours,
		dutyDoc,
	};
}
