import { useState, useEffect } from "react";
import {
	TIMESHEET_STATUTORY_CODES,
	type TimesheetCode,
	type TimesheetDayRecord,
} from "@dental/shared";
import { type EmployeeInfo, generateDefaultMonthSchedule } from "./types";

export function useTimesheetScheduleMutations(
	resolvedEmployees: readonly EmployeeInfo[],
	activeEmployee: EmployeeInfo | undefined,
	year: number,
	month: number
) {
	const [schedules, setSchedules] = useState<Record<string, TimesheetDayRecord[]>>(() => {
		const initial: Record<string, TimesheetDayRecord[]> = {};
		resolvedEmployees.forEach((emp) => {
			initial[emp.id] = generateDefaultMonthSchedule(year, month, emp.defaultShiftHours);
		});
		return initial;
	});

	useEffect(() => {
		if (resolvedEmployees.length === 0) return;
		setSchedules((prev) => {
			let changed = false;
			const next = { ...prev };
			resolvedEmployees.forEach((emp) => {
				if (!next[emp.id]) {
					next[emp.id] = generateDefaultMonthSchedule(year, month, emp.defaultShiftHours);
					changed = true;
				}
			});
			return changed ? next : prev;
		});
	}, [resolvedEmployees, year, month]);

	const currentDays: TimesheetDayRecord[] =
		activeEmployee && schedules[activeEmployee.id]
			? schedules[activeEmployee.id]!
			: activeEmployee
				? generateDefaultMonthSchedule(year, month, activeEmployee.defaultShiftHours)
				: [];

	const handleDayCodeChange = (dayNum: number, newCode: TimesheetCode) => {
		if (!activeEmployee) return;
		const emp = activeEmployee;
		const defaultHrs = TIMESHEET_STATUTORY_CODES[newCode]?.isWorkTime ? emp.defaultShiftHours : 0;
		setSchedules((prev) => {
			const empDays = [...(prev[emp.id] || currentDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			const updated: TimesheetDayRecord = { dayNumber: dayNum, primaryCode: newCode, primaryHours: defaultHrs };
			if (idx >= 0) empDays[idx] = updated;
			else empDays.push(updated);
			return { ...prev, [emp.id]: empDays };
		});
	};

	const handleDayHoursChange = (dayNum: number, hours: number) => {
		if (!activeEmployee) return;
		const emp = activeEmployee;
		setSchedules((prev) => {
			const empDays = [...(prev[emp.id] || currentDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			if (idx >= 0) {
				empDays[idx] = { ...empDays[idx]!, primaryHours: Math.max(0, Number(hours.toFixed(1))) };
			}
			return { ...prev, [emp.id]: empDays };
		});
	};

	const handleBatchFillHours = (hours: number) => {
		if (!activeEmployee) return;
		setSchedules((prev) => ({
			...prev,
			[activeEmployee.id]: generateDefaultMonthSchedule(year, month, hours),
		}));
	};

	return {
		schedules,
		currentDays,
		handleDayCodeChange,
		handleDayHoursChange,
		handleBatchFillHours,
	};
}
