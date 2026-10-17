import { useState, useMemo } from "react";
import {
	calculateEmployeeTimesheetT13,
	generateTimesheetT13Csv,
	getDaysInMonth,
	type EmployeeTimesheetResult,
} from "@dental/shared";
import {
	type EmployeeInfo,
	type TimesheetRoleFilter,
	generateDefaultMonthSchedule,
} from "./types";
import { useTimesheetEmployees } from "./useTimesheetEmployees";
import { useTimesheetScheduleMutations } from "./useTimesheetScheduleMutations";

export interface UseTimesheetT13StateOptions {
	readonly isOpen: boolean;
	readonly clinicName?: string | undefined;
	readonly employees?: readonly EmployeeInfo[] | undefined;
}

export function useTimesheetT13State({
	isOpen,
	clinicName = "ООО «Денте Стоматология»",
	employees,
}: UseTimesheetT13StateOptions) {
	const currentDate = new Date();
	const [year, setYear] = useState<number>(currentDate.getFullYear());
	const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
	const [roleFilter, setRoleFilter] = useState<TimesheetRoleFilter>("all");

	const {
		resolvedEmployees,
		selectedEmployeeId,
		setSelectedEmployeeId,
		roleCounts,
		activeEmployee,
	} = useTimesheetEmployees(employees);

	const {
		schedules,
		currentDays,
		handleDayCodeChange,
		handleDayHoursChange,
		handleBatchFillHours,
	} = useTimesheetScheduleMutations(resolvedEmployees, activeEmployee, year, month);

	const allResults: EmployeeTimesheetResult[] = useMemo(() => {
		if (!isOpen || resolvedEmployees.length === 0) return [];
		return resolvedEmployees.map((emp) =>
			calculateEmployeeTimesheetT13({
				employeeId: emp.id,
				employeeTabNumber: emp.tabNumber,
				employeeFullName: emp.name,
				positionRu: emp.positionRu,
				departmentRu: emp.departmentRu,
				year,
				month,
				days: schedules[emp.id] ?? generateDefaultMonthSchedule(year, month, emp.defaultShiftHours),
			}),
		);
	}, [isOpen, resolvedEmployees, schedules, year, month]);

	const filteredResults = useMemo(() => {
		if (roleFilter === "all") return allResults;
		return allResults.filter((r) => {
			if (roleFilter === "doctor") return r.positionRu.includes("Врач");
			if (roleFilter === "assistant") return r.positionRu.includes("Ассистент");
			if (roleFilter === "admin") return r.positionRu.includes("Администратор");
			return true;
		});
	}, [allResults, roleFilter]);

	const activeResult: EmployeeTimesheetResult = useMemo(() => {
		if (activeEmployee) {
			const found = allResults.find((r) => r.employeeId === activeEmployee.id);
			if (found) return found;
		}
		return allResults[0] ?? calculateEmployeeTimesheetT13({
			employeeId: "emp-empty", employeeTabNumber: "00000", employeeFullName: "—",
			positionRu: "—", departmentRu: "—", year, month, days: [],
		});
	}, [allResults, activeEmployee, year, month]);

	const daysInMonth = getDaysInMonth(year, month);
	const monthLabelRu = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

	const handlePrevMonth = () => {
		if (month === 1) { setMonth(12); setYear((y) => y - 1); }
		else { setMonth((m) => m - 1); }
	};

	const handleNextMonth = () => {
		if (month === 12) { setMonth(1); setYear((y) => y + 1); }
		else { setMonth((m) => m + 1); }
	};

	const handleExportCsv = () => {
		const csv = generateTimesheetT13Csv(allResults, clinicName, year, month);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `timesheet_T13_${year}_${String(month).padStart(2, "0")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return {
		year, month, daysInMonth, monthLabelRu, resolvedEmployees, selectedEmployeeId, setSelectedEmployeeId,
		roleFilter, setRoleFilter, roleCounts, activeEmployee, currentDays, activeResult, filteredResults,
		handlePrevMonth, handleNextMonth, handleDayCodeChange, handleDayHoursChange, handleBatchFillHours, handleExportCsv,
	};
}
