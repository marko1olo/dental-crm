import React from "react";
import { Clock, Download, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import type { EmployeeInfo } from "./types";

export interface TimesheetT13ToolbarProps {
	readonly monthLabelRu: string;
	readonly onPrevMonth: () => void;
	readonly onNextMonth: () => void;
	readonly selectedEmployeeId: string;
	readonly onSelectEmployeeId: (id: string) => void;
	readonly employees: readonly EmployeeInfo[];
	readonly onBatchFillHours: (hours: number) => void;
	readonly onExportCsv: () => void;
	readonly onPrint: () => void;
}

export const TimesheetT13Toolbar: React.FC<TimesheetT13ToolbarProps> = ({
	monthLabelRu,
	onPrevMonth,
	onNextMonth,
	selectedEmployeeId,
	onSelectEmployeeId,
	employees,
	onBatchFillHours,
	onExportCsv,
	onPrint,
}) => {
	const currentEmployee = employees.find((e) => e.id === selectedEmployeeId);

	return (
		<div className="h-10 px-4 border-b border-[var(--line)] bg-[var(--paper)] flex items-center gap-2.5 overflow-x-auto whitespace-nowrap timesheet-no-print shrink-0">
			<div className="flex items-center gap-2 shrink-0">
				<span className="text-[12px] font-semibold text-[var(--muted)]">Период:</span>
				<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] h-8">
					<button type="button" onClick={onPrevMonth} className="p-0.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors" title="Предыдущий месяц">
						<ChevronLeft className="w-3.5 h-3.5" />
					</button>
					<span className="text-[12.5px] font-bold text-[var(--ink)] capitalize min-w-[120px] text-center">
						{monthLabelRu}
					</span>
					<button type="button" onClick={onNextMonth} className="p-0.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors" title="Следующий месяц">
						<ChevronRight className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<span className="text-[12px] font-semibold text-[var(--muted)]">Сотрудник:</span>
				<select
					value={selectedEmployeeId}
					onChange={(e) => onSelectEmployeeId(e.target.value)}
					title={currentEmployee?.name}
					className="h-8 max-w-[240px] lg:max-w-[300px] truncate px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[12.5px] font-semibold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
				>
					{employees.map((emp) => (
						<option key={emp.id} value={emp.id}>
							{emp.name} ({emp.positionRu})
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-2 shrink-0 pl-2 border-l border-[var(--line)]">
				<span className="text-[12px] font-semibold text-[var(--muted)]">Заполнить норму:</span>
				<div className="dente-segmented-bar" role="group" aria-label="Норма часов смены">
					<button type="button" data-testid="btn-fill-6-6" onClick={() => onBatchFillHours(6.6)} title="Норма для врачей-стоматологов (33 ч/нед, 6.6 ч/день)" className="dente-segmented-item">
						<Clock className="w-3 h-3 mr-1 text-[var(--teal)]" />
						6.6 ч (Врачи)
					</button>
					<button type="button" data-testid="btn-fill-7-8" onClick={() => onBatchFillHours(7.8)} title="Норма для ассистентов (39 ч/нед, 7.8 ч/день)" className="dente-segmented-item">
						7.8 ч (Ассистенты)
					</button>
					<button type="button" data-testid="btn-fill-8-0" onClick={() => onBatchFillHours(8.0)} title="Стандартная норма 40 ч/нед (8 ч/день)" className="dente-segmented-item">
						8.0 ч (Стандарт)
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 ml-auto">
				<button type="button" onClick={onExportCsv} className="secondary-button dente-btn-secondary" title="Выгрузить в CSV">
					<Download className="w-3.5 h-3.5 text-[var(--teal)]" />
					Экспорт CSV
				</button>
				<button type="button" onClick={onPrint} className="primary-button dente-btn-primary" title="Печать">
					<Printer className="w-3.5 h-3.5" />
					Печать
				</button>
			</div>
		</div>
	);
};
