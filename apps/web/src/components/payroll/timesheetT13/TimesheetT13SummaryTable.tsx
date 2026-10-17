import React from "react";
import type { EmployeeTimesheetResult } from "@dental/shared";
import type { TimesheetRoleFilter } from "./types";

export interface TimesheetT13SummaryTableProps {
	readonly monthLabelRu: string;
	readonly roleFilter: TimesheetRoleFilter;
	readonly onRoleFilterChange: (filter: TimesheetRoleFilter) => void;
	readonly roleCounts: {
		readonly all: number;
		readonly doctor: number;
		readonly assistant: number;
		readonly admin: number;
	};
	readonly filteredResults: readonly EmployeeTimesheetResult[];
	readonly activeEmployeeId: string | undefined;
	readonly onSelectEmployee: (id: string) => void;
}

export const TimesheetT13SummaryTable: React.FC<TimesheetT13SummaryTableProps> = ({
	monthLabelRu,
	roleFilter,
	onRoleFilterChange,
	roleCounts,
	filteredResults,
	activeEmployeeId,
	onSelectEmployee,
}) => {
	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Сводная ведомость отработанного времени по персоналу ({monthLabelRu}):
				</h3>
				<div className="dente-segmented-bar timesheet-no-print" role="group" aria-label="Фильтр по категориям">
					<button
						type="button"
						onClick={() => onRoleFilterChange("all")}
						className={`dente-segmented-item ${roleFilter === "all" ? "active" : ""}`}
					>
						Все ({roleCounts.all})
					</button>
					<button
						type="button"
						onClick={() => onRoleFilterChange("doctor")}
						className={`dente-segmented-item ${roleFilter === "doctor" ? "active" : ""}`}
					>
						Врачи ({roleCounts.doctor})
					</button>
					<button
						type="button"
						onClick={() => onRoleFilterChange("assistant")}
						className={`dente-segmented-item ${roleFilter === "assistant" ? "active" : ""}`}
					>
						Ассистенты ({roleCounts.assistant})
					</button>
					<button
						type="button"
						onClick={() => onRoleFilterChange("admin")}
						className={`dente-segmented-item ${roleFilter === "admin" ? "active" : ""}`}
					>
						Администраторы ({roleCounts.admin})
					</button>
				</div>
			</div>
			<div className="border border-[var(--line)] rounded-xl overflow-hidden overflow-x-auto bg-[var(--paper)]">
				<table className="w-full text-left text-xs">
					<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
						<tr>
							<th className="p-2.5">Таб. №</th>
							<th className="p-2.5">Сотрудник</th>
							<th className="p-2.5">Должность</th>
							<th className="p-2.5 text-center">I пол. (дн/ч)</th>
							<th className="p-2.5 text-center">II пол. (дн/ч)</th>
							<th className="p-2.5 text-center">Всего дней</th>
							<th className="p-2.5 text-center">Всего часов</th>
							<th className="p-2.5 text-center">Больничный</th>
							<th className="p-2.5 text-center">Отпуск</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{filteredResults.map((res) => (
							<tr
								key={res.employeeId}
								onClick={() => onSelectEmployee(res.employeeId)}
								className={`hover:bg-[var(--paper-soft)] transition-colors cursor-pointer ${
									activeEmployeeId && res.employeeId === activeEmployeeId ? "bg-[var(--teal-soft)] font-semibold" : ""
								}`}
							>
								<td className="p-2.5 font-mono text-[var(--muted)]">{res.employeeTabNumber}</td>
								<td className="p-2.5 font-bold text-[var(--ink)]">{res.employeeFullName}</td>
								<td className="p-2.5 text-[var(--muted)]">{res.positionRu}</td>
								<td className="p-2.5 text-center">
									{res.firstHalfSummary.daysWorked} дн / {res.firstHalfSummary.totalHoursWorked} ч
								</td>
								<td className="p-2.5 text-center">
									{res.secondHalfSummary.daysWorked} дн / {res.secondHalfSummary.totalHoursWorked} ч
								</td>
								<td className="p-2.5 text-center font-bold text-[var(--teal)]">
									{res.monthTotalSummary.daysWorked}
								</td>
								<td className="p-2.5 text-center font-bold text-[var(--ink)]">
									{res.monthTotalSummary.totalHoursWorked} ч
								</td>
								<td className="p-2.5 text-center font-bold text-[var(--bad-fg)]">
									{res.monthTotalSummary.sickLeaveDays > 0 ? `${res.monthTotalSummary.sickLeaveDays} дн` : "—"}
								</td>
								<td className="p-2.5 text-center font-bold text-[var(--teal)]">
									{res.monthTotalSummary.vacationDays > 0 ? `${res.monthTotalSummary.vacationDays} дн` : "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
