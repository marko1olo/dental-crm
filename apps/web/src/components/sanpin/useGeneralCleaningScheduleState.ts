import type { GeneralCleaningLog } from "@dental/shared";
import { useMemo, useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage.js";
import { showToast } from "../GlobalToast.js";

export function useGeneralCleaningScheduleState(
	logs: readonly GeneralCleaningLog[],
	onScheduleUpdated?: () => void,
) {
	const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
	const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);
	const [roomFilter, setRoomFilter] = useState<string>("all");

	const monthDaysCount = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0).getDate(), [selectedYear, selectedMonth]);

	const scheduledWeeks = useMemo(() => {
		const weeks: Array<{ weekNumber: number; startDate: number; endDate: number; targetDay: number }> = [];
		let day = 1;
		let weekIdx = 1;
		while (day <= monthDaysCount) {
			weeks.push({ weekNumber: weekIdx, startDate: day, endDate: Math.min(day + 6, monthDaysCount), targetDay: day });
			day += 7;
			weekIdx++;
		}
		return weeks;
	}, [monthDaysCount]);

	const currentMonthLogs = useMemo(() => {
		const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
		return logs.filter((log) => {
			const sched = log.scheduledDate || "";
			const matchesMonth = sched.startsWith(monthStr);
			const matchesRoom = roomFilter === "all" || log.roomName?.includes(roomFilter);
			return matchesMonth && matchesRoom;
		});
	}, [logs, selectedYear, selectedMonth, roomFilter]);

	const handleGenerateMonthlySchedule = async () => {
		try {
			setIsAutopilotLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/cleaning/autopilot-month", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ year: selectedYear, month: selectedMonth + 1 }),
			});

			if (res.ok) {
				const data = await res.json().catch(() => ({}));
				showToast(`График генеральных уборок на месяц успешно заполнен (${data.count || 20} уборок по графику чистоты, шаг 7 дней)`, "success");
				onScheduleUpdated?.();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при генерации графика уборок", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при генерации графика", "error");
		} finally {
			setIsAutopilotLoading(false);
		}
	};

	return {
		selectedYear, setSelectedYear, selectedMonth, setSelectedMonth,
		isAutopilotLoading, roomFilter, setRoomFilter,
		scheduledWeeks, currentMonthLogs, handleGenerateMonthlySchedule,
	};
}
