import React from "react";
import { CLINIC_ROOMS_CATALOG, type GeneralCleaningScheduleProps } from "./cleaningScheduleTypes";
import { GeneralCleaningScheduleTopBar } from "./GeneralCleaningScheduleTopBar";
import { GeneralCleaningWeekCard } from "./GeneralCleaningWeekCard";
import { useGeneralCleaningScheduleState } from "./useGeneralCleaningScheduleState";

export { CLINIC_ROOMS_CATALOG } from "./cleaningScheduleTypes";

export function GeneralCleaningSchedule({
	logs,
	onScheduleUpdated,
}: GeneralCleaningScheduleProps) {
	const state = useGeneralCleaningScheduleState(logs, onScheduleUpdated);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<GeneralCleaningScheduleTopBar
				selectedMonth={state.selectedMonth}
				setSelectedMonth={state.setSelectedMonth}
				selectedYear={state.selectedYear}
				setSelectedYear={state.setSelectedYear}
				roomFilter={state.roomFilter}
				setRoomFilter={state.setRoomFilter}
				isAutopilotLoading={state.isAutopilotLoading}
				onGenerateMonthlySchedule={state.handleGenerateMonthlySchedule}
			/>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: "1rem",
				}}
			>
				{state.scheduledWeeks.map((week) => {
					const dateTargetStr = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, "0")}-${String(week.targetDay).padStart(2, "0")}`;
					const weekLogs = state.currentMonthLogs.filter((l) => l.scheduledDate === dateTargetStr);
					return (
						<GeneralCleaningWeekCard
							key={week.weekNumber}
							week={week}
							selectedMonth={state.selectedMonth}
							weekLogs={weekLogs}
						/>
					);
				})}
			</div>
		</div>
	);
}
