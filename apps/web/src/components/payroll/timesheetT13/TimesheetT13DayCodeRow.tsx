import React from "react";
import {
	TIMESHEET_STATUTORY_CODES,
	type TimesheetCode,
	type TimesheetDayRecord,
} from "@dental/shared";

export interface TimesheetT13DayCodeRowProps {
	readonly daysInMonth: number;
	readonly currentDays: readonly TimesheetDayRecord[];
	readonly daysWorkedTotal: number;
	readonly onDayCodeChange: (dayNum: number, newCode: TimesheetCode) => void;
}

export const TimesheetT13DayCodeRow: React.FC<TimesheetT13DayCodeRowProps> = ({
	daysInMonth,
	currentDays,
	daysWorkedTotal,
	onDayCodeChange,
}) => {
	return (
		<tr>
			<td className="p-2 text-left font-bold text-[var(--ink)] bg-[var(--paper-soft)]">
				Код явки
			</td>
			{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
				const rec = currentDays.find((d) => d.dayNumber === dayNum);
				const code = rec?.primaryCode ?? "В";
				const isWork = TIMESHEET_STATUTORY_CODES[code]?.isWorkTime;
				const isVacation = code === "ОТ" || code === "ОД";
				const isSick = code === "Б" || code === "Т";

				return (
					<td
						key={dayNum}
						className={`p-1 border-l border-[var(--line)] ${
							isWork
								? "bg-[var(--teal-soft)] text-[var(--teal)] font-extrabold"
								: isVacation
									? "bg-[var(--teal-soft)] text-[var(--teal)] font-bold"
									: isSick
										? "bg-[var(--bad-bg)] text-[var(--bad-fg)] font-bold"
										: "text-[var(--muted)]"
						}`}
					>
						<select
							value={code}
							onChange={(e) => onDayCodeChange(dayNum, e.target.value as TimesheetCode)}
							className="w-full text-center bg-transparent font-bold cursor-pointer focus:outline-none"
						>
							<option value="Я">Я</option>
							<option value="В">В</option>
							<option value="ОТ">ОТ</option>
							<option value="Б">Б</option>
							<option value="РВ">РВ</option>
							<option value="С">С</option>
							<option value="ДО">ДО</option>
							<option value="Н">Н</option>
							<option value="К">К</option>
						</select>
					</td>
				);
			})}
			<td className="p-2 font-black text-[var(--teal)] bg-[var(--teal-soft)] border-l border-[var(--line)]">
				{daysWorkedTotal} дн
			</td>
		</tr>
	);
};
