import { useState, useMemo, useEffect } from "react";
import {
	calculateEmployeeTimesheetT13,
	generateTimesheetT13Csv,
	getDaysInMonth,
	TIMESHEET_STATUTORY_CODES,
	type TimesheetCode,
	type TimesheetDayRecord,
	type EmployeeTimesheetResult,
} from "@dental/shared";
import { useAppStore } from "../../../store/appStore";
import {
	type EmployeeInfo,
	type TimesheetRoleFilter,
	generateDefaultMonthSchedule,
	staffToEmployeeInfo,
} from "./types";

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

	const storeStaff = useAppStore((s) => s.dashboard?.clinicSettings?.staff);
	const resolvedEmployees: readonly EmployeeInfo[] = useMemo(() => {
		if (employees && employees.length > 0) return employees;
		if (Array.isArray(storeStaff) && storeStaff.length > 0) {
			const converted = staffToEmployeeInfo(storeStaff);
			if (converted.length > 0) return converted;
		}
		const storeState = useAppStore.getState() as any;
		const fallbackStaff = storeState.doctors || storeState.staff;
		if (Array.isArray(fallbackStaff) && fallbackStaff.length > 0) {
			const converted = staffToEmployeeInfo(fallbackStaff);
			if (converted.length > 0) return converted;
		}
		const clinicDoctorName =
			storeState?.dashboard?.clinicSettings?.doctorName ||
			storeState?.user?.fullName ||
			storeState?.user?.name ||
			"Врач-стоматолог (Индивидуальная практика)";
		return [{
			id: "solo-doctor-1",
			tabNumber: "00001",
			name: clinicDoctorName,
			positionRu: "Врач-стоматолог / Руководитель",
			departmentRu: "Клинический прием",
			defaultShiftHours: 6.6,
		}];
	}, [employees, storeStaff]);

	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
		() => resolvedEmployees[0]?.id || "",
	);

	useEffect(() => {
		if (
			resolvedEmployees.length > 0 &&
			!resolvedEmployees.some((e) => e.id === selectedEmployeeId)
		) {
			setSelectedEmployeeId(resolvedEmployees[0]!.id);
		}
	}, [resolvedEmployees, selectedEmployeeId]);

	const roleCounts = useMemo(() => {
		let doctor = 0;
		let assistant = 0;
		let admin = 0;
		resolvedEmployees.forEach((e) => {
			if (e.positionRu.includes("Ассистент")) assistant++;
			else if (e.positionRu.includes("Администратор")) admin++;
			else doctor++;
		});
		return { all: resolvedEmployees.length, doctor, assistant, admin };
	}, [resolvedEmployees]);

	const [schedules, setSchedules] = useState<Record<string, TimesheetDayRecord[]>>(() => {
		const initial: Record<string, TimesheetDayRecord[]> = {};
		resolvedEmployees.forEach((emp) => {
			initial[emp.id] = generateDefaultMonthSchedule(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				emp.defaultShiftHours,
			);
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

	const activeEmployee = useMemo(() => {
		return (
			resolvedEmployees.find((e) => e.id === selectedEmployeeId) ??
			resolvedEmployees[0]
		);
	}, [resolvedEmployees, selectedEmployeeId]);

	const currentDays: TimesheetDayRecord[] = useMemo(() => {
		if (!activeEmployee) return [];
		return (
			schedules[activeEmployee.id] ??
			generateDefaultMonthSchedule(year, month, activeEmployee.defaultShiftHours)
		);
	}, [schedules, activeEmployee, year, month]);

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
		return (
			allResults[0] ??
			calculateEmployeeTimesheetT13({
				employeeId: "emp-empty",
				employeeTabNumber: "00000",
				employeeFullName: "—",
				positionRu: "—",
				departmentRu: "—",
				year,
				month,
				days: [],
			})
		);
	}, [allResults, activeEmployee, year, month]);

	const daysInMonth = getDaysInMonth(year, month);
	const monthLabelRu = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});

	const handlePrevMonth = () => {
		if (month === 1) {
			setMonth(12);
			setYear((y) => y - 1);
		} else {
			setMonth((m) => m - 1);
		}
	};

	const handleNextMonth = () => {
		if (month === 12) {
			setMonth(1);
			setYear((y) => y + 1);
		} else {
			setMonth((m) => m + 1);
		}
	};

	const handleDayCodeChange = (dayNum: number, newCode: TimesheetCode) => {
		if (!activeEmployee) return;
		const emp = activeEmployee;
		const defaultHrs = TIMESHEET_STATUTORY_CODES[newCode]?.isWorkTime ? emp.defaultShiftHours : 0;

		setSchedules((prev) => {
			const empDays = [...(prev[emp.id] || currentDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			const updated: TimesheetDayRecord = {
				dayNumber: dayNum,
				primaryCode: newCode,
				primaryHours: defaultHrs,
			};
			if (idx >= 0) {
				empDays[idx] = updated;
			} else {
				empDays.push(updated);
			}
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
				empDays[idx] = {
					...empDays[idx]!,
					primaryHours: Math.max(0, Number(hours.toFixed(1))),
				};
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
		year,
		month,
		daysInMonth,
		monthLabelRu,
		resolvedEmployees,
		selectedEmployeeId,
		setSelectedEmployeeId,
		roleFilter,
		setRoleFilter,
		roleCounts,
		activeEmployee,
		currentDays,
		activeResult,
		filteredResults,
		handlePrevMonth,
		handleNextMonth,
		handleDayCodeChange,
		handleDayHoursChange,
		handleBatchFillHours,
		handleExportCsv,
	};
}
