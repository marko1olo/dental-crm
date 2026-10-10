import React from "react";
import {
	TIMESHEET_STATUTORY_CODES,
	type TimesheetCode,
	type TimesheetDayRecord,
	type EmployeeTimesheetResult,
} from "@dental/shared";
import type { EmployeeInfo } from "./types";

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
							{/* Row 1: Code */}
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
									{activeResult.monthTotalSummary.daysWorked} дн
								</td>
							</tr>

							{/* Row 2: Hours */}
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
									{activeResult.monthTotalSummary.totalHoursWorked} ч
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
