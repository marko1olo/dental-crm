import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";

export interface UseShiftStaffMetadataParams {
	dashboard?: Dashboard | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	inChairAppointment: any;
}

export function useShiftStaffMetadata({ dashboard, inChairAppointment }: UseShiftStaffMetadataParams) {
	const staffById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: staff map
		const index = new Map<string, any>();
		for (const member of dashboard?.clinicSettings?.staff ?? []) index.set(member.id, member);
		return index;
	}, [dashboard?.clinicSettings?.staff]);

	const manyDoctors = useMemo(
		// biome-ignore lint/suspicious/noExplicitAny: staff
		() => (dashboard?.clinicSettings?.staff ?? []).filter((member: any) => member.active && member.role === "doctor").length > 1,
		[dashboard?.clinicSettings?.staff],
	);

	const rolesWorthShowing = useMemo(
		() =>
			new Set(
				// biome-ignore lint/suspicious/noExplicitAny: staff
				(dashboard?.clinicSettings?.staff ?? []).filter((member: any) => member.active).map((member: any) => member.role),
			).size > 2,
		[dashboard?.clinicSettings?.staff],
	);

	const shiftDoctorsList = useMemo(() => {
		const staff = dashboard?.clinicSettings?.staff ?? [];
		// biome-ignore lint/suspicious/noExplicitAny: staff
		const activeDoctors = staff.filter((member: any) => member.active && member.role === "doctor");
		if (activeDoctors.length === 0) return undefined;
		// biome-ignore lint/suspicious/noExplicitAny: staff
		return activeDoctors.map((doc: any) => ({
			id: String(doc.id),
			name: String(doc.fullName || doc.name || "Лечащий врач"),
			specialtyId: String(doc.specialty || doc.specialtyId || "general_dentist"),
		}));
	}, [dashboard?.clinicSettings?.staff]);

	const shiftActiveDoctorId = useMemo(() => {
		if (inChairAppointment?.doctorUserId) return inChairAppointment.doctorUserId;
		if (shiftDoctorsList && shiftDoctorsList.length > 0) return shiftDoctorsList[0]?.id;
		return undefined;
	}, [inChairAppointment?.doctorUserId, shiftDoctorsList]);

	return {
		staffById,
		manyDoctors,
		rolesWorthShowing,
		shiftDoctorsList,
		shiftActiveDoctorId,
	};
}
