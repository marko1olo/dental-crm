/**
 * useRosterComputations.ts — KPI metrics, conflicts, and staff stats for Doctor Shift Roster.
 */

import { useMemo } from "react";
import { MEDICAL_STAFF_ROLES, RUSSIAN_PRODUCTION_CALENDAR_2026, type StaffMember } from "../doctorShiftRosterPresets";
import { calculateStaffRosterStats, detectRosterConflicts, type DoctorShift } from "../doctorShiftRosterEngine";
import type { EmployeeInfo } from "./rosterOperationsTypes";

interface UseRosterComputationsParams {
	shifts: DoctorShift[];
	staffList: StaffMember[];
	appointments: Array<{ chairId: string; startsAt: string; endsAt: string; status?: string | undefined }>;
	weekStartDateIso: string;
	weekEndDateIso: string;
}

export function useRosterComputations({
	shifts, staffList, appointments, weekStartDateIso, weekEndDateIso,
}: UseRosterComputationsParams) {
	const selectedYear = Number.parseInt(weekStartDateIso.substring(0, 4), 10) || 2026;
	const selectedMonth = Number.parseInt(weekStartDateIso.substring(5, 7), 10) || 8;
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[selectedMonth];

	const conflicts = useMemo(() => {
		return detectRosterConflicts(shifts, staffList, {
			practiceType: "private_outpatient",
			checkSurgeryAssistant: false,
			checkWeeklyOvertime: false,
			allowWeeklyOvertime: true,
		});
	}, [shifts, staffList]);

	const staffStats = useMemo(() => {
		return calculateStaffRosterStats(staffList, shifts, selectedYear, selectedMonth);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	const t13Matrix = useMemo(() => [] as any[], []);

	const t13Employees: EmployeeInfo[] = useMemo(() => {
		return staffList.map((s, index) => {
			const roleDef = MEDICAL_STAFF_ROLES[s.role];
			const positionRu = roleDef ? roleDef.nameRu : s.isDoctor ? "Врач-стоматолог" : "Ассистент врача-стоматолога";
			const departmentRu = s.isDoctor ? "Лечебное отделение" : "Сестринская служба";
			const defaultShiftHours = s.isDoctor ? 6.0 : s.role === "assistant" ? 7.8 : 6.0;
			const tabNumber = s.tabNumber || String(101 + index).padStart(5, "0");
			return { id: s.id, tabNumber, name: s.fullName, positionRu, departmentRu, defaultShiftHours };
		});
	}, [staffList]);

	const sanitizedAppointments = useMemo(() => {
		return appointments.map((a) => {
			const item: { chairId: string; startsAt: string; endsAt: string; status?: string } = {
				chairId: a.chairId, startsAt: a.startsAt, endsAt: a.endsAt,
			};
			if (a.status) item.status = a.status;
			return item;
		});
	}, [appointments]);

	const kpis = useMemo(() => {
		const weekShifts = shifts.filter(
			(s) => s.dateIso >= weekStartDateIso && s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled" && s.durationHours > 0,
		);
		const totalWeeklyHours = weekShifts.reduce((sum, s) => sum + s.durationHours, 0);
		const totalWithAssistants = weekShifts.filter((s) => s.assistantId).length;
		const assistantPairingPct = weekShifts.length > 0
			? Math.round((totalWithAssistants / weekShifts.length) * 100) : 0;

		return {
			totalWeekShifts: weekShifts.length,
			totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
			assistantPairingPct,
			conflictCount: conflicts.length,
			errorConflictCount: conflicts.filter((c) => c.severity === "error").length,
		};
	}, [shifts, weekStartDateIso, weekEndDateIso, conflicts]);

	return {
		selectedYear, selectedMonth, monthNormObj, conflicts, staffStats,
		t13Matrix, t13Employees, sanitizedAppointments, kpis,
	};
}
