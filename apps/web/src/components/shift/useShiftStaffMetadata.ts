import { useMemo } from "react";
import type { Dashboard, StaffMember } from "@dental/shared";

export type ShiftStaffMember = StaffMember & {
	readonly name?: string | undefined;
	readonly specialty?: string | undefined;
	readonly specialtyId?: string | undefined;
};

export interface ShiftDoctorInfo {
	readonly id: string;
	readonly name: string;
	readonly specialtyId: string;
}

export interface UseShiftStaffMetadataParams {
	dashboard?: Dashboard | null | undefined;
	inChairAppointment?: {
		readonly doctorUserId?: string | null | undefined;
		readonly doctorId?: string | null | undefined;
	} | null | undefined;
}

export function useShiftStaffMetadata({ dashboard, inChairAppointment }: UseShiftStaffMetadataParams) {
	const staffById = useMemo(() => {
		const index = new Map<string, ShiftStaffMember>();
		for (const member of (dashboard?.clinicSettings?.staff ?? []) as ShiftStaffMember[]) {
			index.set(member.id, member);
		}
		return index;
	}, [dashboard?.clinicSettings?.staff]);

	const manyDoctors = useMemo(
		() => (dashboard?.clinicSettings?.staff ?? []).filter((member) => member.active && member.role === "doctor").length > 1,
		[dashboard?.clinicSettings?.staff],
	);

	const rolesWorthShowing = useMemo(
		() =>
			new Set(
				(dashboard?.clinicSettings?.staff ?? []).filter((member) => member.active).map((member) => member.role),
			).size > 2,
		[dashboard?.clinicSettings?.staff],
	);

	const shiftDoctorsList = useMemo<ShiftDoctorInfo[] | undefined>(() => {
		const staff = (dashboard?.clinicSettings?.staff ?? []) as ShiftStaffMember[];
		const activeDoctors = staff.filter((member) => member.active && member.role === "doctor");
		if (activeDoctors.length === 0) return undefined;
		return activeDoctors.map((doc) => ({
			id: String(doc.id),
			name: String(doc.fullName || doc.name || "Лечащий врач"),
			specialtyId: String(doc.specialties?.[0] || doc.specialty || doc.specialtyId || "general_dentist"),
		}));
	}, [dashboard?.clinicSettings?.staff]);

	const shiftActiveDoctorId = useMemo(() => {
		if (inChairAppointment?.doctorUserId) return inChairAppointment.doctorUserId;
		if (inChairAppointment?.doctorId) return inChairAppointment.doctorId;
		if (shiftDoctorsList && shiftDoctorsList.length > 0) return shiftDoctorsList[0]?.id;
		return undefined;
	}, [inChairAppointment?.doctorUserId, inChairAppointment?.doctorId, shiftDoctorsList]);

	return {
		staffById,
		manyDoctors,
		rolesWorthShowing,
		shiftDoctorsList,
		shiftActiveDoctorId,
	};
}
