import React from "react";
import { Calendar, X } from "lucide-react";
import type { EmployeeInfo } from "./types";
import { TimesheetT13Toolbar } from "./TimesheetT13Toolbar";

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
	return (
		<>
			<div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)] timesheet-no-print shrink-0 timesheet-modal-header-root">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center border border-[var(--teal)]/30">
						<Calendar className="w-5 h-5" />
					</div>
					<div>
						<h2 className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2">
							Учёт отработанного времени и часов
							<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/20">
								Учёт времени персонала
							</span>
						</h2>
						<p className="text-xs text-[var(--muted)]">
							{clinicName} • Учёт отработанного времени и часов персонала клиники
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть окно учёта времени"
					className="icon-button w-11 h-11 sm:w-9 sm:h-9 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			<TimesheetT13Toolbar
				monthLabelRu={monthLabelRu}
				onPrevMonth={onPrevMonth}
				onNextMonth={onNextMonth}
				selectedEmployeeId={selectedEmployeeId}
				onSelectEmployeeId={onSelectEmployeeId}
				employees={employees}
				onBatchFillHours={onBatchFillHours}
				onExportCsv={onExportCsv}
				onPrint={onPrint}
			/>
		</>
	);
};

export default TimesheetT13Header;
