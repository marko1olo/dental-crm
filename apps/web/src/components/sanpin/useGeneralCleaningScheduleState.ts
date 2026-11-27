import { generateUuidV7, type GeneralCleaningLog } from "@dental/shared";
import { useMemo, useState } from "react";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
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
			const res = await fetch("/api/registers/cleaning/autopilot-month", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({ year: selectedYear, month: selectedMonth + 1 }),
			});

			if (res.ok) {
				let count = 20;
				try {
					const data = (await res.json()) as { count?: number };
					if (typeof data.count === "number" && data.count > 0) count = data.count;
				} catch (parseErr) {
					clientLogger.debug("cleaning autopilot-month response parse failed", parseErr);
				}
				showToast(`График генеральных уборок на месяц успешно заполнен (${count} уборок по графику чистоты, шаг 7 дней)`, "success");
				onScheduleUpdated?.();
			} else {
				let message = "Ошибка при генерации графика уборок";
				try {
					const err = (await res.json()) as { message?: string };
					if (err.message) message = err.message;
				} catch (parseErr) {
					clientLogger.debug("cleaning autopilot-month error parse failed", parseErr);
				}
				showToast(message, "error");
			}
		} catch (err) {
			clientLogger.warn("handleGenerateMonthlySchedule failed", err);
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
