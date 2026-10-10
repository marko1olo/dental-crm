import React from "react";
import { Users } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import "./timesheetT13.css";
import {
	type TimesheetT13ModalProps,
	type EmployeeInfo,
	generateDefaultMonthSchedule,
	staffToEmployeeInfo,
	useTimesheetT13State,
	TimesheetT13Header,
	TimesheetT13Grid,
	TimesheetT13SummaryTotals,
	TimesheetT13FooterActions,
} from "./timesheetT13";

export { staffToEmployeeInfo, generateDefaultMonthSchedule, type TimesheetT13ModalProps, type EmployeeInfo };

export const TimesheetT13Modal: React.FC<TimesheetT13ModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	employees,
}) => {
	const state = useTimesheetT13State({ isOpen, clinicName, employees });

	if (!isOpen) return null;

	if (state.resolvedEmployees.length === 0 || !state.activeEmployee) {
		return (
			<div className="timesheet-modal-overlay" data-testid="timesheet-t13-modal">
				<div className="timesheet-modal-container max-w-lg mx-auto my-auto p-6 bg-[var(--paper)] rounded-2xl shadow-xl border border-[var(--line)] text-center flex flex-col items-center gap-4">
					<div className="w-14 h-14 rounded-2xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center border border-[var(--teal)]/30">
						<Users className="w-7 h-7" />
					</div>
					<div className="flex flex-col gap-1">
						<h3 className="text-base font-bold text-[var(--ink)]">
							Сотрудники не зарегистрированы в клинике
						</h3>
						<p className="text-xs text-[var(--muted)] max-w-sm">
							Добавьте персонал в разделе «Настройки клиники / Персонал» для формирования и ведения табеля учета рабочего времени.
						</p>
					</div>
					<div className="flex items-center gap-2 mt-2">
						<button
							type="button"
							onClick={() => {
								useAppStore.getState().setCurrentView("settings");
								useAppStore.getState().setSettingsTab("staff");
								onClose();
							}}
							className="h-9 px-4 rounded-xl bg-[var(--teal)] hover:opacity-90 text-[var(--on-teal)] text-xs font-bold transition-all cursor-pointer"
						>
							Перейти в Настройки / Персонал
						</button>
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-4 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="timesheet-modal-overlay" data-testid="timesheet-t13-modal">
			<div className="timesheet-modal-container">
				<TimesheetT13Header
					clinicName={clinicName}
					monthLabelRu={state.monthLabelRu}
					onPrevMonth={state.handlePrevMonth}
					onNextMonth={state.handleNextMonth}
					selectedEmployeeId={state.selectedEmployeeId}
					onSelectEmployeeId={state.setSelectedEmployeeId}
					employees={state.resolvedEmployees}
					onBatchFillHours={state.handleBatchFillHours}
					onExportCsv={state.handleExportCsv}
					onPrint={() => window.print()}
					onClose={onClose}
				/>
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					<TimesheetT13SummaryTotals
						monthLabelRu={state.monthLabelRu}
						activeResult={state.activeResult}
						roleFilter={state.roleFilter}
						onRoleFilterChange={state.setRoleFilter}
						roleCounts={state.roleCounts}
						filteredResults={state.filteredResults}
						activeEmployeeId={state.activeEmployee?.id}
						onSelectEmployee={state.setSelectedEmployeeId}
					/>
					<TimesheetT13Grid
						year={state.year}
						month={state.month}
						daysInMonth={state.daysInMonth}
						activeEmployee={state.activeEmployee}
						currentDays={state.currentDays}
						activeResult={state.activeResult}
						onDayCodeChange={state.handleDayCodeChange}
						onDayHoursChange={state.handleDayHoursChange}
					/>
				</div>
				<TimesheetT13FooterActions
					employeesCount={state.resolvedEmployees.length}
					onExportCsv={state.handleExportCsv}
					onPrint={() => window.print()}
				/>
			</div>
		</div>
	);
};

export default TimesheetT13Modal;
