import React from "react";
import { createPortal } from "react-dom";
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
import { TimesheetT13EmptyState } from "./timesheetT13/TimesheetT13EmptyState";

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
		const emptyContent = <TimesheetT13EmptyState onClose={onClose} />;
		return typeof document !== "undefined"
			? createPortal(emptyContent, document.body)
			: emptyContent;
	}

	const modalContent = (
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

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default TimesheetT13Modal;
