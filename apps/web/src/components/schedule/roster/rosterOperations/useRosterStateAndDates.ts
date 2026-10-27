/**
 * useRosterStateAndDates.ts — Week calculation and base state for Doctor Shift Roster.
 */

import { useEffect, useMemo, useState } from "react";
import type { CabinetDefinition, StaffMember } from "../doctorShiftRosterPresets";
import { CLINIC_CABINETS_CATALOG, DEFAULT_CLINIC_STAFF } from "../doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { DoctorShift } from "../doctorShiftRosterEngine";
import { generateWeeklyScheduleForStaffAndCabinets } from "../doctorWeeklyScheduleGenerator";
import { getMondayOfWeekIso } from "../rosterDateUtils";
import type { UseDoctorShiftRosterOperationsParams } from "./rosterOperationsTypes";

export function useRosterStateAndDates(params: UseDoctorShiftRosterOperationsParams) {
	const staffList = params.staffList !== undefined
		? params.staffList : isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF : [];
	const cabinets = params.cabinets !== undefined
		? params.cabinets : isDemoShowcaseMode() ? CLINIC_CABINETS_CATALOG : [];

	const defaultMonday = useMemo(
		() => getMondayOfWeekIso(params.weekStartDateIso || params.currentDate),
		[params.weekStartDateIso, params.currentDate],
	);

	const [weekStartDateIso, setWeekStartDateIso] = useState<string>(defaultMonday);
	const [activeTab, setActiveTab] = useState<"cabinets" | "doctors" | "t13" | "utilization">("cabinets");

	useEffect(() => {
		if (params.weekStartDateIso || params.currentDate) {
			setWeekStartDateIso(getMondayOfWeekIso(params.weekStartDateIso || params.currentDate));
		}
	}, [params.weekStartDateIso, params.currentDate]);

	const [shifts, setShifts] = useState<DoctorShift[]>(() => {
		if (params.initialShifts && params.initialShifts.length > 0) return params.initialShifts;
		if (Array.isArray(params.initialShifts) && params.initialShifts.length === 0) return [];
		if (staffList.length === 0 || cabinets.length === 0) return [];
		return generateWeeklyScheduleForStaffAndCabinets(defaultMonday, staffList, cabinets, "five_day");
	});

	useEffect(() => {
		if (params.initialShifts) setShifts(params.initialShifts);
	}, [params.initialShifts]);

	const [notification, setNotification] = useState<{
		type: "success" | "info" | "error";
		message: string;
	} | null>(null);

	const [isT13ModalOpen, setIsT13ModalOpen] = useState<boolean>(false);

	const weekDays = useMemo(() => {
		const days: Array<{ dateIso: string; dayName: string; dayNumber: string; isWeekend: boolean }> = [];
		const parts = weekStartDateIso.split("-").map(Number);
		const startYear = parts[0] || 2026;
		const startMonth = parts[1] || 8;
		const startDay = parts[2] || 24;
		const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

		for (let i = 0; i < 7; i++) {
			const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + i));
			const dateIso = d.toISOString().substring(0, 10);
			const dayOfWeek = d.getUTCDay();
			days.push({
				dateIso,
				dayName: dayNamesRu[dayOfWeek] || "Пн",
				dayNumber: dateIso.substring(8, 10),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			});
		}
		return days;
	}, [weekStartDateIso]);

	const weekEndDateIso = weekDays[6]?.dateIso || weekStartDateIso;

	return {
		staffList, cabinets, weekStartDateIso, setWeekStartDateIso,
		activeTab, setActiveTab, shifts, setShifts,
		notification, setNotification, isT13ModalOpen, setIsT13ModalOpen,
		weekDays, weekEndDateIso,
	};
}
