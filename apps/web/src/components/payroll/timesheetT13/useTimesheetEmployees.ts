import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "../../../store/appStore";
import { type EmployeeInfo, staffToEmployeeInfo } from "./types";

export function useTimesheetEmployees(employees?: readonly EmployeeInfo[]) {
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

	const activeEmployee = useMemo(() => {
		return (
			resolvedEmployees.find((e) => e.id === selectedEmployeeId) ??
			resolvedEmployees[0]
		);
	}, [resolvedEmployees, selectedEmployeeId]);

	return {
		resolvedEmployees,
		selectedEmployeeId,
		setSelectedEmployeeId,
		roleCounts,
		activeEmployee,
	};
}
