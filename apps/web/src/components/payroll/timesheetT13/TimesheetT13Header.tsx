import React from "react";
import {
	Calendar,
	Clock,
	Download,
	Printer,
	X,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import type { EmployeeInfo } from "./types";

export interface TimesheetT13HeaderProps {
	readonly clinicName: string;
	readonly monthLabelRu: string;
	readonly onPrevMonth: () => void;
	readonly onNextMonth: () => void;
	readonly selectedEmployeeId: string;
	readonly onSelectEmployeeId: (id: string) => void;
	readonly employees: readonly EmployeeInfo[];
	readonly onBatchFillHours: (hours: number) => void;
	readonly onExportCsv: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const TimesheetT13Header: React.FC<TimesheetT13HeaderProps> = ({
	clinicName,
	monthLabelRu,
	onPrevMonth,
	onNextMonth,
	selectedEmployeeId,
	onSelectEmployeeId,
	employees,
	onBatchFillHours,
	onExportCsv,
	onPrint,
	onClose,
}) => {
	const currentEmployee = employees.find((e) => e.id === selectedEmployeeId);

	return (
		<>
			{/* Top Header */}
			<div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)] timesheet-no-print">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center border border-[var(--teal)]/30">
						<Calendar className="w-5 h-5" />
					</div>
					<div>
						<h2 className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2">
							Табель учета рабочего времени
							<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/20">
								Табель персонала
							</span>
						</h2>
						<p className="text-xs text-[var(--muted)]">
							{clinicName} • Табель учета рабочего времени персонала клиники
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть табель"
					className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Toolbar / Filters — Strict 1-row layout (Sin 2 compliant, h-10, 32-36px) */}
			<div className="h-10 px-4 border-b border-[var(--line)] bg-[var(--paper)] flex items-center gap-2.5 overflow-x-auto whitespace-nowrap timesheet-no-print shrink-0">
				{/* Month / Year Selector */}
				<div className="flex items-center gap-2 shrink-0">
					<span className="text-[12px] font-semibold text-[var(--muted)]">Период:</span>
					<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] h-8">
						<button
							type="button"
							onClick={onPrevMonth}
							className="p-0.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
							title="Предыдущий месяц"
						>
							<ChevronLeft className="w-3.5 h-3.5" />
						</button>
						<span className="text-[12.5px] font-bold text-[var(--ink)] capitalize min-w-[120px] text-center">
							{monthLabelRu}
						</span>
						<button
							type="button"
							onClick={onNextMonth}
							className="p-0.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
							title="Следующий месяц"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				{/* Employee Switcher */}
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

				{/* 1-Click Monthly Fill as Segmented Bar (Mandate 8s: Solo Doctor & Small Clinic Sovereignty) */}
				<div className="flex items-center gap-2 shrink-0 pl-2 border-l border-[var(--line)]">
					<span className="text-[12px] font-semibold text-[var(--muted)]">Заполнить норму:</span>
					<div className="dente-segmented-bar" role="group" aria-label="Норма часов смены">
						<button
							type="button"
							data-testid="btn-fill-6-6"
							onClick={() => onBatchFillHours(6.6)}
							title="Норма для врачей-стоматологов (33 ч/нед, 6.6 ч/день — ст. 350 ТК РФ)"
							className="dente-segmented-item"
						>
							<Clock className="w-3 h-3 mr-1 text-[var(--teal)]" />
							6.6 ч (Врачи)
						</button>
						<button
							type="button"
							data-testid="btn-fill-7-8"
							onClick={() => onBatchFillHours(7.8)}
							title="Норма для ассистентов (39 ч/нед, 7.8 ч/день)"
							className="dente-segmented-item"
						>
							7.8 ч (Ассистенты)
						</button>
						<button
							type="button"
							data-testid="btn-fill-8-0"
							onClick={() => onBatchFillHours(8.0)}
							title="Стандартная норма 40 ч/нед (8 ч/день)"
							className="dente-segmented-item"
						>
							8.0 ч (Стандарт)
						</button>
					</div>
				</div>

				{/* Quick Actions — Exactly 2 standardized buttons: CSV export (secondary) + Print (primary) */}
				<div className="flex items-center gap-2 shrink-0 ml-auto">
					<button
						type="button"
						onClick={onExportCsv}
						className="dente-btn-secondary"
					>
						<Download className="w-3.5 h-3.5 text-[var(--teal)]" />
						Экспорт CSV
					</button>
					<button
						type="button"
						onClick={onPrint}
						className="dente-btn-primary"
					>
						<Printer className="w-3.5 h-3.5" />
						Печать
					</button>
				</div>
			</div>
		</>
	);
};
