import React from "react";
import type { TimesheetDayRecord } from "@dental/shared";

export interface TimesheetT13DayHoursRowProps {
	readonly daysInMonth: number;
	readonly currentDays: readonly TimesheetDayRecord[];
	readonly totalHoursWorked: number;
	readonly onDayHoursChange: (dayNum: number, hours: number) => void;
}

export const TimesheetT13DayHoursRow: React.FC<TimesheetT13DayHoursRowProps> = ({
	daysInMonth,
	currentDays,
	totalHoursWorked,
	onDayHoursChange,
}) => {
	return (
		<tr>
			<td className="p-2 text-left font-bold text-[var(--ink)] bg-[var(--paper-soft)]">
				Часы работы
			</td>
			{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
				const rec = currentDays.find((d) => d.dayNumber === dayNum);
				const hrs = rec?.primaryHours ?? 0;
				return (
					<td key={dayNum} className="p-0.5 border-l border-[var(--line)]">
						<input
							type="number"
							step="0.5"
							min="0"
							max="24"
							value={hrs === 0 ? "" : hrs}
							placeholder="-"
							onChange={(e) => onDayHoursChange(dayNum, Number(e.target.value) || 0)}
							className="w-full h-8 text-center text-xs font-bold text-[var(--ink)] bg-transparent focus:bg-[var(--paper-soft)] focus:outline-none"
						/>
					</td>
				);
			})}
			<td className="p-2 font-black text-[var(--ink)] bg-[var(--paper-soft)] border-l border-[var(--line)]">
				{totalHoursWorked} ч
			</td>
		</tr>
	);
};
