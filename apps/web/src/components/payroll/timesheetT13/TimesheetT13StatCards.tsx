import React from "react";
import type { EmployeeTimesheetResult } from "@dental/shared";

export interface TimesheetT13StatCardsProps {
	readonly activeResult: EmployeeTimesheetResult;
}

export const TimesheetT13StatCards: React.FC<TimesheetT13StatCardsProps> = ({ activeResult }) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 timesheet-no-print">
			<div className="timesheet-stat-card">
				<span className="text-[12px] font-medium text-[var(--muted)]">Отработано дней</span>
				<span className="text-base sm:text-lg font-black text-[var(--teal)]">
					{activeResult.monthTotalSummary.daysWorked} дней
				</span>
				<span className="text-[12px] text-[var(--muted)]">
					I пол: {activeResult.firstHalfSummary.daysWorked} дн / II пол: {activeResult.secondHalfSummary.daysWorked} дн
				</span>
			</div>

			<div className="timesheet-stat-card">
				<span className="text-[12px] font-medium text-[var(--muted)]">Отработано часов</span>
				<span className="text-base sm:text-lg font-black text-[var(--ink)]">
					{activeResult.monthTotalSummary.totalHoursWorked} ч
				</span>
				<span className="text-[12px] text-[var(--muted)]">
					Дневные: {activeResult.monthTotalSummary.regularHoursWorked} ч
				</span>
			</div>

			<div className="timesheet-stat-card">
				<span className="text-[12px] font-medium text-[var(--muted)]">Сверхурочные / Выходные</span>
				<span className="text-base sm:text-lg font-black text-[var(--warn-fg)]">
					{activeResult.monthTotalSummary.overtimeHoursWorked + activeResult.monthTotalSummary.weekendHoursWorked} ч
				</span>
				<span className="text-[12px] text-[var(--muted)]">
					Сверхурочные (С): {activeResult.monthTotalSummary.overtimeHoursWorked} ч / РВ: {activeResult.monthTotalSummary.weekendHoursWorked} ч
				</span>
			</div>

			<div className="timesheet-stat-card">
				<span className="text-[12px] font-medium text-[var(--muted)]">Неявки (Отпуск / Больничный)</span>
				<span className="text-base sm:text-lg font-black text-[var(--bad-fg)]">
					{activeResult.monthTotalSummary.vacationDays + activeResult.monthTotalSummary.sickLeaveDays} дней
				</span>
				<span className="text-[12px] text-[var(--muted)]">
					Больничный (Б): {activeResult.monthTotalSummary.sickLeaveDays} дн / Отпуск (ОТ): {activeResult.monthTotalSummary.vacationDays} дн
				</span>
			</div>
		</div>
	);
};
