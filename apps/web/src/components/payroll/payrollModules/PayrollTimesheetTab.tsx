import React from "react";
import {
	type useTimesheetT13State,
	TimesheetT13Grid,
	TimesheetT13SummaryTotals,
	TimesheetT13FooterActions,
} from "../timesheetT13";

export interface PayrollTimesheetTabProps {
	readonly timesheetState: ReturnType<typeof useTimesheetT13State>;
}

export const PayrollTimesheetTab: React.FC<PayrollTimesheetTabProps> = ({ timesheetState }) => {
	return (
		<div className="flex flex-col gap-5 flex-1" data-testid="doctor-timesheet-workspace">
			<TimesheetT13SummaryTotals
				monthLabelRu={timesheetState.monthLabelRu}
				activeResult={timesheetState.activeResult}
				roleFilter={timesheetState.roleFilter}
				onRoleFilterChange={timesheetState.setRoleFilter}
				roleCounts={timesheetState.roleCounts}
				filteredResults={timesheetState.filteredResults}
				activeEmployeeId={timesheetState.activeEmployee?.id}
				onSelectEmployee={timesheetState.setSelectedEmployeeId}
			/>

			<TimesheetT13Grid
				year={timesheetState.year}
				month={timesheetState.month}
				daysInMonth={timesheetState.daysInMonth}
				activeEmployee={timesheetState.activeEmployee}
				currentDays={timesheetState.currentDays}
				activeResult={timesheetState.activeResult}
				onDayCodeChange={timesheetState.handleDayCodeChange}
				onDayHoursChange={timesheetState.handleDayHoursChange}
			/>

			<TimesheetT13FooterActions
				employeesCount={timesheetState.resolvedEmployees.length}
				onExportCsv={timesheetState.handleExportCsv}
				onPrint={() => window.print()}
			/>
		</div>
	);
};

export default PayrollTimesheetTab;
