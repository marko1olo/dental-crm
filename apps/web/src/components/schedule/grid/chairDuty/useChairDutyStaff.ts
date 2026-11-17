import { useMemo } from "react";
import type { Chair, Dashboard, StaffMember } from "@dental/shared";
import { DEFAULT_SOLO_CHAIR } from "../gridConstants";

export interface ChairDutyStaffState {
	staff: StaffMember[];
	doctors: StaffMember[];
	chairs: Chair[];
	rawChairs: Chair[] | undefined;
	isSoloMode: boolean;
	isZeroChairs: boolean;
	effectiveChairs: Chair[];
	isSoloDoctor: boolean;
}

export function useChairDutyStaff(
	dashboard: Dashboard,
	selectedChairId?: string | null | undefined,
): ChairDutyStaffState {
	const staff = dashboard?.clinicSettings?.staff ?? [];

	const doctors = useMemo(() => {
		return staff.filter(
			(m) =>
				m.active !== false &&
				(m.role === "doctor" || m.role === "owner" || !m.role),
		);
	}, [staff]);

	const chairs = useMemo(() => {
		const all = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
		if (selectedChairId) {
			const filtered = all.filter((c) => c.id === selectedChairId);
			if (filtered.length > 0) return filtered;
		}
		return all;
	}, [dashboard?.clinicSettings?.chairs, selectedChairId]);

	const rawChairs = dashboard?.clinicSettings?.chairs;
	const isSoloMode =
		dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
		dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
		(dashboard?.clinicSettings?.profile?.mode as string) === "solo_practice";

	const isZeroChairs = Array.isArray(rawChairs) && chairs.length === 0 && !isSoloMode;

	const effectiveChairs = useMemo(() => {
		return chairs && chairs.length > 0 ? chairs : [DEFAULT_SOLO_CHAIR];
	}, [chairs]);

	const isSoloDoctor =
		isSoloMode ||
		(doctors.length <= 1 && effectiveChairs.length <= 1) ||
		doctors.length === 1;

	return {
		staff,
		doctors,
		chairs,
		rawChairs,
		isSoloMode,
		isZeroChairs,
		effectiveChairs,
		isSoloDoctor,
	};
}
