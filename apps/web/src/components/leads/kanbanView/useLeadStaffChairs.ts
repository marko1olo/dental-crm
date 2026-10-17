/**
 * DENTE Dental CRM — Leads Kanban Staff & Chairs Resolution Hook
 * Mandate 8e, Mandate 8n, Mandate 8b (<= 120 lines)
 */

import { useEffect, useState } from "react";
import {
	type BookableChair,
	type BookableDoctor,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
} from "../leadsKanbanTypes";

export function useLeadStaffChairs(dashboard: any) {
	const [staff, setStaff] = useState<BookableDoctor[]>([]);
	const [chairs, setChairs] = useState<BookableChair[]>([]);
	const [selectedDoctorId, setSelectedDoctorId] = useState("");
	const [selectedChairId, setSelectedChairId] = useState("");

	useEffect(() => {
		const clinicStaff = (dashboard?.clinicSettings?.staff ?? []) as BookableDoctor[];
		const clinicChairs = (dashboard?.clinicSettings?.chairs ?? []) as BookableChair[];
		const doctors = clinicStaff.filter(
			(member) => member.active !== false && (member.role === "doctor" || member.role === "owner"),
		);
		const effectiveDoctors = resolveLeadBookingStaff(doctors);
		const effectiveChairsList = resolveLeadBookingChairs(clinicChairs);

		setStaff(effectiveDoctors);
		setChairs(effectiveChairsList);
		setSelectedDoctorId((current) =>
			current && effectiveDoctors.some((doctor) => doctor.id === current)
				? current
				: (effectiveDoctors[0]?.id ?? FALLBACK_SOLO_DOCTOR.id),
		);
		setSelectedChairId((current) =>
			current && effectiveChairsList.some((chair) => chair.id === current)
				? current
				: (effectiveChairsList[0]?.id ?? FALLBACK_DEFAULT_CHAIR.id),
		);
	}, [dashboard?.clinicSettings?.staff, dashboard?.clinicSettings?.chairs]);

	return {
		staff,
		chairs,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedChairId,
		setSelectedChairId,
	};
}
