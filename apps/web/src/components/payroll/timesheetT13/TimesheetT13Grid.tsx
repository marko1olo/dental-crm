import React from "react";
import type {
	TimesheetCode,
	TimesheetDayRecord,
	EmployeeTimesheetResult,
} from "@dental/shared";
import type { EmployeeInfo } from "./types";
import { TimesheetT13DayCodeRow } from "./TimesheetT13DayCodeRow";
import { TimesheetT13DayHoursRow } from "./TimesheetT13DayHoursRow";

export interface TimesheetT13GridProps {
	readonly year: number;
	readonly month: number;
	readonly daysInMonth: number;
	readonly activeEmployee: EmployeeInfo | undefined;
	readonly currentDays: readonly TimesheetDayRecord[];
	readonly activeResult: EmployeeTimesheetResult;
	readonly onDayCodeChange: (dayNum: number, newCode: TimesheetCode) => void;
	readonly onDayHoursChange: (dayNum: number, hours: number) => void;
}

export const TimesheetT13Grid: React.FC<TimesheetT13GridProps> = ({
	year,
	month,
	daysInMonth,
	activeEmployee,
	currentDays,
	activeResult,
	onDayCodeChange,
	onDayHoursChange,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Учет ежедневных смен и явок ({activeEmployee?.name ?? "—"}, таб. № {activeEmployee?.tabNumber ?? "—"}):
				</h3>
				<div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
					<span className="inline-block w-2.5 h-2.5 rounded bg-[var(--teal-soft)] border border-[var(--teal)]"></span> Явка (Я)
					<span className="inline-block w-2.5 h-2.5 rounded bg-[var(--teal-soft)] border border-[var(--teal)]"></span> Отпуск (ОТ)
					<span className="inline-block w-2.5 h-2.5 rounded bg-[var(--bad-bg)] border border-[var(--bad-fg)]"></span> Больничный (Б)
					<span className="inline-block w-2.5 h-2.5 rounded bg-[var(--paper-soft)] border border-[var(--line)]"></span> Выходной (В)
				</div>
			</div>

			<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
				<div className="overflow-x-auto">
					<table className="w-full text-center text-xs border-collapse">
						<thead>
							<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)]">
								<th className="p-2 text-left font-semibold min-w-[60px]">Параметр</th>
								{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
									const dayOfWeek = new Date(year, month - 1, day).getDay();
									const isSunSat = dayOfWeek === 0 || dayOfWeek === 6;
									return (
										<th
											key={day}
											className={`p-1.5 font-bold min-w-[38px] border-l border-[var(--line)] ${
												isSunSat ? "bg-[var(--bad-bg)]/40 text-[var(--bad-fg)]" : ""
											}`}
										>
											{day}
										</th>
									);
								})}
								<th className="p-2 font-bold min-w-[60px] bg-[var(--teal-soft)] text-[var(--teal)] border-l border-[var(--line)]">
									Итого
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							<TimesheetT13DayCodeRow
								daysInMonth={daysInMonth}
								currentDays={currentDays}
								daysWorkedTotal={activeResult.monthTotalSummary.daysWorked}
								onDayCodeChange={onDayCodeChange}
							/>
							<TimesheetT13DayHoursRow
								daysInMonth={daysInMonth}
								currentDays={currentDays}
								totalHoursWorked={activeResult.monthTotalSummary.totalHoursWorked}
								onDayHoursChange={onDayHoursChange}
							/>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
