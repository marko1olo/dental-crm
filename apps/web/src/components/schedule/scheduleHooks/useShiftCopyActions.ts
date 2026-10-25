import { useCallback } from "react";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import { syncShiftsWithServer } from "../chairRosterMath";
import { getMondayOfWeekIso, addDaysToDateIso, copyWeekShiftsToTargetWeek, copyWeekShiftsToMonth } from "../roster/DoctorShiftRosterModal";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";

interface Params {
	dateKey: string;
	chairs: ScheduleChair[];
	effectiveChairDoctorAssignments: Record<string, ChairDoctorShiftAssignment>;
}

export function useShiftCopyActions({ dateKey, chairs, effectiveChairDoctorAssignments }: Params) {
	const copyWeekShiftsToNextWeek = useCallback(() => {
		const mondayIso = getMondayOfWeekIso(dateKey);
		const nextMondayIso = addDaysToDateIso(mondayIso, 7);
		if (typeof window !== "undefined") {
			for (let i = 0; i < 7; i++) {
				const srcDay = addDaysToDateIso(mondayIso, i);
				const targetDay = addDaysToDateIso(nextMondayIso, i);
				const srcKey = `dente_chair_doctor_assignments_${srcDay}`;
				const targetKey = `dente_chair_doctor_assignments_${targetDay}`;
				const raw = safeLocalStorageGetItem(srcKey);
				if (raw) {
					safeLocalStorageSetItem(targetKey, raw);
					try {
						const parsed = JSON.parse(raw);
						syncShiftsWithServer(targetDay, parsed, chairs).catch(() => {});
					} catch {}
				} else if (srcDay === dateKey && effectiveChairDoctorAssignments) {
					safeLocalStorageSetJson(targetKey, effectiveChairDoctorAssignments);
					syncShiftsWithServer(targetDay, effectiveChairDoctorAssignments, chairs).catch(() => {});
				}
			}
			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const updatedShifts = copyWeekShiftsToTargetWeek(currentShifts, mondayIso, nextMondayIso);
			safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
		}
		showToast(`График смен кресел скопирован на следующую неделю (${nextMondayIso})`, "success", 3500);
	}, [chairs, dateKey, effectiveChairDoctorAssignments]);

	const copyTodayShiftsToCurrentWeek = useCallback((workdaysOnly = false) => {
		const label = workdaysOnly ? "будни (Пн–Пт)" : "всю неделю (Пн–Вс)";
		const mondayIso = getMondayOfWeekIso(dateKey);
		const daysCount = workdaysOnly ? 5 : 7;
		let todayAssignments: Record<string, ChairDoctorShiftAssignment> = effectiveChairDoctorAssignments ? { ...effectiveChairDoctorAssignments } : {};
		if (typeof window !== "undefined" && dateKey) {
			const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					todayAssignments = { ...parsed, ...todayAssignments };
				} catch {}
			}
			for (let i = 0; i < daysCount; i++) {
				const targetDay = addDaysToDateIso(mondayIso, i);
				safeLocalStorageSetJson(`dente_chair_doctor_assignments_${targetDay}`, todayAssignments);
				syncShiftsWithServer(targetDay, todayAssignments, chairs).catch(() => {});
			}
		}
		showToast(`График смен кресел применён на ${label} (${mondayIso}..)`, "success", 3500);
	}, [dateKey, effectiveChairDoctorAssignments, chairs]);

	const copyTodayShiftsToMonth = useCallback(() => {
		const year = Number.parseInt(dateKey ? dateKey.slice(0, 4) : "2026", 10) || 2026;
		const month = Number.parseInt(dateKey ? dateKey.slice(5, 7) : "9", 10) || 9;
		const daysInMonth = new Date(year, month, 0).getDate();
		const monthNamesRu = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
		const monthName = monthNamesRu[month - 1] || "текущий месяц";
		let todayAssignments: Record<string, ChairDoctorShiftAssignment> = effectiveChairDoctorAssignments ? { ...effectiveChairDoctorAssignments } : {};
		if (typeof window !== "undefined" && dateKey) {
			const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					todayAssignments = { ...parsed, ...todayAssignments };
				} catch {}
			}
			for (let d = 1; d <= daysInMonth; d++) {
				const targetDayIso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
				safeLocalStorageSetJson(`dente_chair_doctor_assignments_${targetDayIso}`, todayAssignments);
				syncShiftsWithServer(targetDayIso, todayAssignments, chairs).catch(() => {});
			}
			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const mondayIso = getMondayOfWeekIso(dateKey);
			const updatedShifts = copyWeekShiftsToMonth(currentShifts, mondayIso, 4);
			safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
		}
		showToast(`График смен кресел применён на весь текущий месяц (${monthName})`, "success", 3500);
	}, [dateKey, effectiveChairDoctorAssignments, chairs]);

	return { copyWeekShiftsToNextWeek, copyTodayShiftsToCurrentWeek, copyTodayShiftsToMonth };
}
